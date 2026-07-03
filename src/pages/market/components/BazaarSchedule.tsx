import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '../../../stores/authStore'
import { useMessStore } from '../../../stores/messStore'
import { supabase } from '../../../lib/supabase'
import { MarketSchedule } from '../../../types/database'
import {
  ShoppingBag,
  Plus,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Calendar,
  ArrowRightLeft,
} from 'lucide-react'
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  isToday,
  isBefore,
  endOfMonth,
} from 'date-fns'
import { getInitials } from '../../../lib/utils'
import toast from 'react-hot-toast'
import { Skeleton } from '../../../components/Skeleton'
import ConfirmDialog from '../../../components/ConfirmDialog'

export default function BazaarSchedule() {
  const { user, session } = useAuthStore()
  const { currentMess, members } = useMessStore()
  const [schedules, setSchedules] = useState<MarketSchedule[]>([])
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [showAdd, setShowAdd] = useState(false)
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingSchedules, setLoadingSchedules] = useState(true)
  const [deleteScheduleId, setDeleteScheduleId] = useState<string | null>(null)

  const isManager = members.some((m) => m.user_id === user?.id && m.role === 'manager')
  const approvedMembers = members.filter((m) => m.status === 'approved')

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 6 })
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 6 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })
  const weekStartStr = format(weekStart, 'yyyy-MM-dd')
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd')

  const fetchSchedules = useCallback(async () => {
    if (!currentMess?.id) return
    setLoadingSchedules(true)
    const { data } = await supabase
      .from('market_schedules')
      .select('*, profiles(username, avatar_url)')
      .eq('mess_id', currentMess.id)
      .gte('assigned_date', weekStartStr)
      .lte('assigned_date', weekEndStr)
      .order('assigned_date', { ascending: true })

    if (data) setSchedules(data as MarketSchedule[])
    setLoadingSchedules(false)
  }, [currentMess?.id, weekStartStr, weekEndStr])

  useEffect(() => {
    if (!currentMess?.id) return
    fetchSchedules()

    // Real-time subscription for schedules
    const channel = supabase
      .channel('market-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'market_schedules',
          filter: `mess_id=eq.${currentMess.id}`,
        },
        () => fetchSchedules()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentMess?.id, weekStartStr, fetchSchedules])

  // Daily Price Update and Push Reminder checks
  useEffect(() => {
    if (!currentMess?.id) return

    const runDailyChecks = async () => {
      const todayStr = format(new Date(), 'yyyy-MM-dd')
      const startOfDayIso = new Date().toISOString().split('T')[0] + 'T00:00:00.000Z'

      // 1. Daily AI Price Report Check
      try {
        const { data: existingReport } = await supabase
          .from('market_chat_messages')
          .select('id')
          .eq('mess_id', currentMess.id)
          .eq('is_daily_update', true)
          .gte('created_at', startOfDayIso)
          .limit(1)

        if (!existingReport || existingReport.length === 0) {
          const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/market-assistant`
          void fetch(functionUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session?.access_token}`,
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({
              mess_id: currentMess.id,
              action: 'generate_daily_update',
              date_str: todayStr,
            }),
          })
        }
      } catch (err) {
        console.error('Failed to run daily AI report check:', err)
      }

      // 2. Daily Push Reminder Check
      try {
        const { data: todaySchedule } = await supabase
          .from('market_schedules')
          .select('user_id')
          .eq('mess_id', currentMess.id)
          .eq('assigned_date', todayStr)
          .single()

        if (todaySchedule?.user_id) {
          const assigneeId = todaySchedule.user_id

          const { data: loggedReminder } = await supabase
            .from('bazaar_reminders_log')
            .select('id')
            .eq('mess_id', currentMess.id)
            .eq('assigned_date', todayStr)
            .limit(1)

          if (!loggedReminder || loggedReminder.length === 0) {
            const { error: logErr } = await supabase.from('bazaar_reminders_log').insert({
              mess_id: currentMess.id,
              assigned_date: todayStr,
              sent_to: assigneeId,
            })

            if (!logErr) {
              await supabase.from('notifications').insert({
                user_id: assigneeId,
                mess_id: currentMess.id,
                type: 'market_reminder',
                title: 'Bazaar Duty Reminder 🛒',
                body: `You are scheduled for bazaar duty today. Don't forget to check the meals and buy the groceries!`,
              })
            }
          }
        }
      } catch (err) {
        console.error('Failed to run daily push reminder check:', err)
      }
    }

    void runDailyChecks()
  }, [currentMess?.id, session?.access_token])

  const handleAssign = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!currentMess?.id || !selectedUser || selectedDates.length === 0) return
    setLoading(true)

    const assignments = selectedDates.map((date) => ({
      mess_id: currentMess.id,
      user_id: selectedUser,
      assigned_date: date,
    }))

    const { error } = await supabase.from('market_schedules').upsert(assignments, {
      onConflict: 'mess_id,user_id,assigned_date',
    })

    if (error) {
      toast.error(
        error.message.includes('duplicate') ? 'Already assigned for some dates' : 'Failed to assign'
      )
    } else {
      toast.success(`Bazaar duty assigned for ${selectedDates.length} date(s)!`)
      setShowAdd(false)
      setSelectedUser('')
      setSelectedDates([])
      fetchSchedules()
    }
    setLoading(false)
  }

  const toggleDate = (date: string) => {
    setSelectedDates((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]
    )
  }

  const clearDates = () => setSelectedDates([])

  const handleDelete = (id: string) => {
    setDeleteScheduleId(id)
  }

  const confirmDelete = async () => {
    if (!deleteScheduleId) return
    await supabase.from('market_schedules').delete().eq('id', deleteScheduleId)
    toast.success('Assignment removed')
    setDeleteScheduleId(null)
    fetchSchedules()
  }

  const autoAssign = async () => {
    if (!currentMess?.id || approvedMembers.length === 0) return
    setLoading(true)

    // Round-robin: assign each day of the next week to members
    const nextWeekStart = startOfWeek(addWeeks(currentWeek, 1), { weekStartsOn: 6 })
    const nextWeekDays = eachDayOfInterval({
      start: nextWeekStart,
      end: endOfWeek(addWeeks(currentWeek, 1), { weekStartsOn: 6 }),
    })

    const assignments = nextWeekDays.map((day, i) => ({
      mess_id: currentMess.id,
      user_id: approvedMembers[i % approvedMembers.length].user_id,
      assigned_date: format(day, 'yyyy-MM-dd'),
    }))

    const { error } = await supabase.from('market_schedules').upsert(assignments, {
      onConflict: 'mess_id,user_id,assigned_date',
    })

    if (error) toast.error('Failed to auto-assign')
    else {
      toast.success('Next week auto-assigned!')
      setCurrentWeek(addWeeks(currentWeek, 1))
    }
    setLoading(false)
  }

  if (!currentMess) return null

  return (
    <div className="space-y-5">
      {/* Header Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <ShoppingBag className="text-nex-primary h-6 w-6" />
          <h2 className="text-nex-text text-xl font-bold">Bazaar Schedule</h2>
        </div>
        {isManager && (
          <div className="flex gap-2">
            <button
              onClick={autoAssign}
              disabled={loading}
              className="nex-btn-secondary flex-1 justify-center text-xs sm:flex-none"
              id="auto-assign-btn"
            >
              <ArrowRightLeft className="h-4 w-4" /> Auto Assign
            </button>
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="nex-btn-primary flex-1 justify-center text-xs sm:flex-none"
              id="add-schedule-btn"
            >
              <Plus className="h-4 w-4" /> Assign
            </button>
          </div>
        )}
      </div>

      {/* Add Form */}
      {showAdd && isManager && (
        <div className="nex-card animate-slide-up p-5">
          <h3 className="text-nex-text mb-4 text-lg font-semibold">Assign Bazaar Duty</h3>
          <form onSubmit={handleAssign} className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="nex-input flex-1"
                required
                id="schedule-member"
              >
                <option value="">Select member</option>
                {approvedMembers.map((m) => {
                  const p = m.profiles as any
                  return (
                    <option key={m.user_id} value={m.user_id}>
                      {p?.username || 'Member'}
                    </option>
                  )
                })}
              </select>
              <button type="button" onClick={clearDates} className="nex-btn-secondary text-xs">
                Clear Dates
              </button>
            </div>

            <div>
              <p className="text-nex-text mb-2 text-sm font-medium">Select dates:</p>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                {eachDayOfInterval({ start: new Date(), end: endOfMonth(new Date()) }).map(
                  (dayDate) => {
                    const dateStr = format(dayDate, 'yyyy-MM-dd')
                    const isSelected = selectedDates.includes(dateStr)
                    const isPast = isBefore(dayDate, new Date()) && !isToday(dayDate)
                    return (
                      <button
                        key={dateStr}
                        type="button"
                        disabled={isPast}
                        onClick={() => toggleDate(dateStr)}
                        className={`rounded-lg p-2 text-left text-xs font-medium transition-colors ${
                          isSelected
                            ? 'bg-nex-primary text-white'
                            : isPast
                              ? 'bg-nex-elevated text-nex-muted/40 cursor-not-allowed'
                              : 'bg-nex-elevated text-nex-text hover:bg-nex-hover'
                        }`}
                      >
                        <span className="block text-[10px] uppercase opacity-70">
                          {format(dayDate, 'EEE')}
                        </span>
                        <span className="block font-semibold">{format(dayDate, 'MMM d')}</span>
                      </button>
                    )
                  }
                )}
              </div>
            </div>

            {selectedDates.length > 0 && (
              <p className="text-nex-muted text-xs">
                {selectedDates.length} date(s) selected:{' '}
                {selectedDates.map((d) => format(new Date(d), 'MMM d')).join(', ')}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || selectedDates.length === 0}
              className="nex-btn-primary w-full disabled:opacity-50"
            >
              {loading ? 'Assigning...' : `Assign to ${selectedDates.length} Date(s)`}
            </button>
          </form>
        </div>
      )}

      {/* Week Navigator */}
      <div className="nex-card p-5">
        <div className="mb-5 flex items-center justify-between">
          <button
            onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
            className="rounded-btn hover:bg-nex-hover text-nex-muted p-2 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-nex-text text-sm font-semibold sm:text-base">
            {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
          </h2>
          <button
            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            className="rounded-btn hover:bg-nex-hover text-nex-muted p-2 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        {/* Desktop: Grid view (hidden on small screens) */}
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {loadingSchedules ? (
            <div className="grid min-w-[560px] grid-cols-7 gap-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className="border-nex-border bg-nex-elevated/20 space-y-3 rounded-xl border p-3 text-center"
                >
                  <Skeleton className="mx-auto h-4 w-12" />
                  <Skeleton className="mx-auto h-6 w-8" />
                  <Skeleton className="mx-auto h-8 w-8 rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="hidden min-w-[560px] grid-cols-7 gap-2 sm:grid">
              {weekDays.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const daySchedules = schedules.filter((s) => s.assigned_date === dateStr)
                const todayFlag = isToday(day)
                const past = isBefore(day, new Date()) && !todayFlag

                return (
                  <div
                    key={dateStr}
                    className={`rounded-xl border p-3 text-center transition-colors ${
                      todayFlag
                        ? 'border-nex-primary bg-nex-primary-light'
                        : past
                          ? 'bg-nex-elevated/50 border-transparent'
                          : 'border-nex-border bg-nex-surface'
                    }`}
                  >
                    <p
                      className={`mb-1 text-xs font-semibold tracking-wider uppercase ${
                        todayFlag ? 'text-nex-primary' : 'text-nex-muted'
                      }`}
                    >
                      {format(day, 'EEE')}
                    </p>
                    <p
                      className={`mb-2 text-lg font-bold ${todayFlag ? 'text-nex-primary' : 'text-nex-text'}`}
                    >
                      {format(day, 'd')}
                    </p>
                    {daySchedules.length > 0 ? (
                      <div className="space-y-2">
                        {daySchedules.map((ds) => {
                          const assignee = ds.profiles as any
                          return (
                            <div key={ds.id} className="flex flex-col items-center gap-0.5">
                              <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-xs font-semibold text-white">
                                {assignee?.avatar_url ? (
                                  <img
                                    src={assignee.avatar_url}
                                    alt=""
                                    className="h-full w-full rounded-full object-cover"
                                  />
                                ) : (
                                  getInitials(assignee?.username || '?')
                                )}
                              </div>
                              <p className="text-nex-text w-full truncate text-[10px] font-medium">
                                {assignee?.username}
                              </p>
                              {isManager && (
                                <button
                                  onClick={() => handleDelete(ds.id)}
                                  className="text-nex-muted hover:text-nex-danger transition-colors"
                                >
                                  <Trash2 className="mx-auto h-3 w-3" />
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="py-2">
                        <Calendar className="text-nex-muted/40 mx-auto h-5 w-5" />
                        <p className="text-nex-muted/40 mt-1 text-xs">Unassigned</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Mobile: Card list view (shown only on small screens) */}
        <div className="space-y-2 sm:hidden">
          {loadingSchedules
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="border-nex-border bg-nex-elevated/20 flex items-center gap-3 rounded-xl border p-3"
                >
                  <Skeleton className="h-10 w-12 rounded" />
                  <Skeleton className="h-10 w-px" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-2 w-10" />
                  </div>
                </div>
              ))
            : weekDays.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const daySchedules = schedules.filter((s) => s.assigned_date === dateStr)
                const todayFlag = isToday(day)
                const past = isBefore(day, new Date()) && !todayFlag

                return (
                  <div
                    key={dateStr}
                    className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${
                      todayFlag
                        ? 'border-nex-primary bg-nex-primary-light'
                        : past
                          ? 'bg-nex-elevated/50 border-transparent opacity-60'
                          : 'border-nex-border bg-nex-surface'
                    }`}
                  >
                    {/* Date Column */}
                    <div
                      className={`w-12 shrink-0 pt-1 text-center ${todayFlag ? 'text-nex-primary' : 'text-nex-text'}`}
                    >
                      <p className="text-xs font-semibold uppercase">{format(day, 'EEE')}</p>
                      <p className="text-lg leading-tight font-bold">{format(day, 'd')}</p>
                    </div>

                    <div className="bg-nex-border w-px shrink-0 self-stretch"></div>

                    {/* Assignees */}
                    {daySchedules.length > 0 ? (
                      <div className="flex-1 space-y-2">
                        {daySchedules.map((ds) => {
                          const assignee = ds.profiles as any
                          return (
                            <div key={ds.id} className="flex items-center gap-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-xs font-semibold text-white">
                                {assignee?.avatar_url ? (
                                  <img
                                    src={assignee.avatar_url}
                                    alt=""
                                    className="h-full w-full rounded-full object-cover"
                                  />
                                ) : (
                                  getInitials(assignee?.username || '?')
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-nex-text truncate text-sm font-medium">
                                  {assignee?.username}
                                </p>
                                <p className="text-nex-muted text-xs">Bazaar Duty</p>
                              </div>
                              {isManager && (
                                <button
                                  onClick={() => handleDelete(ds.id)}
                                  className="text-nex-muted hover:text-nex-danger p-1.5 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-nex-muted/40 flex flex-1 items-center gap-2 py-1">
                        <Calendar className="h-4 w-4" />
                        <p className="text-xs">Unassigned</p>
                      </div>
                    )}
                  </div>
                )
              })}
        </div>
      </div>

      {/* Duty Count This Week */}
      <div className="nex-card p-5">
        <h3 className="text-nex-text mb-3 text-sm font-semibold tracking-wider uppercase">
          Duty Count This Week
        </h3>
        <div className="space-y-2">
          {approvedMembers.map((member) => {
            const p = member.profiles as any
            const count = schedules.filter((s) => s.user_id === member.user_id).length
            return (
              <div
                key={member.user_id}
                className="hover:bg-nex-hover flex items-center justify-between rounded-lg p-2"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-xs font-semibold text-white">
                    {getInitials(p?.username || '?')}
                  </div>
                  <span className="text-nex-text text-sm">{p?.username || 'Member'}</span>
                </div>
                <span className="nex-badge-primary text-xs">{count} days</span>
              </div>
            )
          })}
        </div>
      </div>

      <ConfirmDialog
        open={deleteScheduleId !== null}
        title="Remove Bazaar Assignment"
        message="Are you sure you want to remove this bazaar schedule assignment?"
        confirmText="Remove"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteScheduleId(null)}
      />
    </div>
  )
}
