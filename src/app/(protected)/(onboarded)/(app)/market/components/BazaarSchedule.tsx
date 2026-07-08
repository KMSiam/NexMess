'use client'

import { useEffect, useState, useCallback } from 'react'
import { useProfileStore, useMessStore } from '@/stores/appStore'
import {
  getMarketSchedules,
  assignMarketDuties,
  deleteMarketDuty,
  autoAssignMarketDuties,
  runDailyBazaarChecks,
} from '@/actions/market'
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
import { getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Skeleton } from '@/components/Skeleton'
import ConfirmDialog from '@/components/ConfirmDialog'
import { usePusherRealtime } from '@/hooks/usePusherRealtime'

interface MarketSchedule {
  id: string
  mess_id: string
  user_id: string
  assigned_date: string
  profiles?: {
    username: string
    avatar_url?: string | null
  }
}

export default function BazaarSchedule() {
  const { profile } = useProfileStore()
  const { currentMess, members } = useMessStore()
  const [schedules, setSchedules] = useState<MarketSchedule[]>([])
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [showAdd, setShowAdd] = useState(false)
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingSchedules, setLoadingSchedules] = useState(true)
  const [deleteScheduleId, setDeleteScheduleId] = useState<string | null>(null)

  const isManager = members.some((m) => m.user_id === profile?.id && m.role === 'manager')
  const approvedMembers = members.filter((m) => m.status === 'approved')

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 6 })
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 6 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })
  const weekStartStr = format(weekStart, 'yyyy-MM-dd')
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd')

  const fetchSchedules = useCallback(async () => {
    if (!currentMess?.id) return
    setLoadingSchedules(true)
    try {
      const data = await getMarketSchedules(currentMess.id, weekStartStr, weekEndStr)
      setSchedules(data)
    } catch (err: any) {
      toast.error('Failed to load bazaar schedules')
    } finally {
      setLoadingSchedules(false)
    }
  }, [currentMess?.id, weekStartStr, weekEndStr])

  useEffect(() => {
    if (currentMess?.id) {
      fetchSchedules()
    }
  }, [currentMess?.id, currentWeek, fetchSchedules])

  // Pusher realtime subscription
  usePusherRealtime(currentMess?.id, ['market_schedules', 'notifications'], fetchSchedules)

  // Daily Checks
  useEffect(() => {
    if (!currentMess?.id) return
    runDailyBazaarChecks(currentMess.id).catch((err) => {
      console.error('Failed to run daily bazaar checks:', err)
    })
  }, [currentMess?.id])

  const handleAssign = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!currentMess?.id || !selectedUser || selectedDates.length === 0) return
    setLoading(true)

    const assignments = selectedDates.map((date) => ({
      user_id: selectedUser,
      assigned_date: date,
    }))

    try {
      await assignMarketDuties(currentMess.id, assignments)
      toast.success(`Bazaar duty assigned for ${selectedDates.length} date(s)!`)
      setShowAdd(false)
      setSelectedUser('')
      setSelectedDates([])
      fetchSchedules()
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign bazaar duties')
    } finally {
      setLoading(false)
    }
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
    if (!deleteScheduleId || !currentMess?.id) return
    try {
      await deleteMarketDuty(currentMess.id, deleteScheduleId)
      toast.success('Assignment removed')
      setDeleteScheduleId(null)
      fetchSchedules()
    } catch (err: any) {
      toast.error('Failed to remove assignment')
    }
  }

  const autoAssign = async () => {
    if (!currentMess?.id || approvedMembers.length === 0) return
    setLoading(true)

    const nextWeekStart = startOfWeek(addWeeks(currentWeek, 1), { weekStartsOn: 6 })
    const nextWeekStartStr = format(nextWeekStart, 'yyyy-MM-dd')

    try {
      await autoAssignMarketDuties(currentMess.id, nextWeekStartStr)
      toast.success('Next week auto-assigned!')
      setCurrentWeek(addWeeks(currentWeek, 1))
    } catch (err: any) {
      toast.error('Failed to auto-assign')
    } finally {
      setLoading(false)
    }
  }

  if (!currentMess) return null

  return (
    <div className="space-y-5 animate-fade-in">
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
              className="nex-btn-secondary flex-1 justify-center text-xs sm:flex-none cursor-pointer"
              id="auto-assign-btn"
            >
              <ArrowRightLeft className="h-4 w-4" /> Auto Assign
            </button>
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="nex-btn-primary flex-1 justify-center text-xs sm:flex-none cursor-pointer"
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
              <button type="button" onClick={clearDates} className="nex-btn-secondary text-xs cursor-pointer">
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
                        className={`rounded-lg p-2 text-left text-xs font-medium transition-colors cursor-pointer ${
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
              className="nex-btn-primary w-full disabled:opacity-50 cursor-pointer"
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
            className="rounded-btn hover:bg-nex-hover text-nex-muted p-2 transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-nex-text text-sm font-semibold sm:text-base">
            {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
          </h2>
          <button
            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            className="rounded-btn hover:bg-nex-hover text-nex-muted p-2 transition-colors cursor-pointer"
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
                                  // eslint-disable-next-line @next/next/no-img-element
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
                                  className="text-nex-muted hover:text-nex-danger transition-colors cursor-pointer"
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
                                  // eslint-disable-next-line @next/next/no-img-element
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
                                  className="text-nex-muted hover:text-nex-danger p-1.5 transition-colors cursor-pointer"
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
