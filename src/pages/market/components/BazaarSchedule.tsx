import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
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
  X,
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
import { getInitials, formatNumber, formatLocalizedDate, isApprovedManager } from '../../../lib/utils'
import { sanitizeAppError } from '../../../lib/errorHandler'
import toast from 'react-hot-toast'
import { Skeleton } from '../../../components/Skeleton'
import ConfirmDialog from '../../../components/ConfirmDialog'

export default function BazaarSchedule() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const { currentMess, members } = useMessStore()
  const [schedules, setSchedules] = useState<MarketSchedule[]>([])
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [showAdd, setShowAdd] = useState(false)
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingSchedules, setLoadingSchedules] = useState(true)
  const [deleteScheduleId, setDeleteScheduleId] = useState<string | null>(null)

  const isManager = isApprovedManager(members, user?.id)
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

  // Daily AI price report and bazaar reminders are now handled server-side
  // by the `morning-reminder` edge function via pg_cron (7:00 AM BST daily)

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
        error.message.includes('duplicate')
          ? 'Already assigned for some dates'
          : sanitizeAppError(error, 'Failed to assign')
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
          <h2 className="text-nex-text text-xl font-bold">{t('market.schedule.title')}</h2>
        </div>
        {isManager && (
          <div className="flex gap-2">
            <button
              onClick={autoAssign}
              disabled={loading}
              className="nex-btn-secondary flex-1 justify-center text-xs sm:flex-none"
              id="auto-assign-btn"
            >
              <ArrowRightLeft className="h-4 w-4" /> {t('market.schedule.autoAssign')}
            </button>
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="nex-btn-primary flex-1 justify-center text-xs sm:flex-none"
              id="add-schedule-btn"
            >
              <Plus className="h-4 w-4" /> {t('market.schedule.assign')}
            </button>
          </div>
        )}
      </div>

      {/* Add Form Modal */}
      {showAdd && isManager && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setShowAdd(false)}
        >
          <div
            className="nex-card animate-slide-up max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-b-none p-5 sm:rounded-b-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-nex-text text-lg font-semibold">{t('market.schedule.assignTitle')}</h3>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="text-nex-muted hover:text-nex-text rounded-lg p-1"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleAssign} className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="nex-input flex-1"
                  required
                  id="schedule-member"
                >
                  <option value="">{t('market.schedule.selectMember')}</option>
                  {approvedMembers.map((m) => {
                    const p = m.profiles as any
                    return (
                      <option key={m.user_id} value={m.user_id}>
                        {p?.username || t('common.member')}
                      </option>
                    )
                  })}
                </select>
                <button type="button" onClick={clearDates} className="nex-btn-secondary text-xs">
                  {t('market.schedule.clearDates')}
                </button>
              </div>

              <div>
                <p className="text-nex-text mb-2 text-sm font-medium">{t('market.schedule.selectDates')}</p>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
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
                                ? 'bg-nex-elevated text-nex-muted/50 cursor-not-allowed'
                                : 'bg-nex-elevated text-nex-text hover:bg-nex-hover'
                          }`}
                        >
                          <span className="block text-[10px] uppercase opacity-75">
                            {formatLocalizedDate(dayDate, 'EEE')}
                          </span>
                          <span className="block font-semibold">{formatLocalizedDate(dayDate, 'MMM d')}</span>
                        </button>
                      )
                    }
                  )}
                </div>
              </div>

              {selectedDates.length > 0 && (
                <p className="text-nex-muted text-xs">
                  {formatNumber(selectedDates.length)} {t('market.schedule.datesSelected')}:{' '}
                  {selectedDates.map((d) => formatLocalizedDate(d, 'MMM d')).join(', ')}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="nex-btn-secondary flex-1"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading || selectedDates.length === 0}
                  className="nex-btn-primary flex-1 disabled:opacity-50"
                >
                  {loading
                    ? t('market.schedule.assigning')
                    : t('market.schedule.assignToCount', { count: formatNumber(selectedDates.length) })}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Week Navigator */}
      <div className="nex-card p-5">
        <div className="mb-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
            aria-label="Previous week"
            className="rounded-btn hover:bg-nex-hover text-nex-muted p-2 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-nex-text text-sm font-semibold sm:text-base">
            {formatLocalizedDate(weekStart, 'MMM d')} – {formatLocalizedDate(weekEnd, 'MMM d, yyyy')}
          </h2>
          <button
            type="button"
            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            aria-label="Next week"
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
                      {formatLocalizedDate(day, 'EEE')}
                    </p>
                    <p
                      className={`mb-2 text-lg font-bold ${todayFlag ? 'text-nex-primary' : 'text-nex-text'}`}
                    >
                      {formatLocalizedDate(day, 'd')}
                    </p>
                    {daySchedules.length > 0 ? (
                      <div className="space-y-2">
                        {daySchedules.map((ds) => {
                          const assignee = ds.profiles as any
                          return (
                            <div key={ds.id} className="flex flex-col items-center gap-0.5">
                              <div className="nex-avatar mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white">
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
                                  type="button"
                                  onClick={() => handleDelete(ds.id)}
                                  aria-label={t('common.delete')}
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
                        <Calendar className="text-nex-muted/70 mx-auto h-5 w-5" />
                        <p className="text-nex-muted/75 mt-1 text-xs">{t('market.schedule.unassigned')}</p>
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
                      <p className="text-xs font-semibold uppercase">{formatLocalizedDate(day, 'EEE')}</p>
                      <p className="text-lg leading-tight font-bold">{formatLocalizedDate(day, 'd')}</p>
                    </div>

                    <div className="bg-nex-border w-px shrink-0 self-stretch"></div>

                    {/* Assignees */}
                    {daySchedules.length > 0 ? (
                      <div className="flex-1 space-y-2">
                        {daySchedules.map((ds) => {
                          const assignee = ds.profiles as any
                          return (
                            <div key={ds.id} className="flex items-center gap-3">
                              <div className="nex-avatar flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white">
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
                                <p className="text-nex-muted text-xs">{t('market.schedule.duty')}</p>
                              </div>
                              {isManager && (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(ds.id)}
                                  aria-label={t('common.delete')}
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
                      <div className="text-nex-muted/75 flex flex-1 items-center gap-2 py-1">
                        <Calendar className="h-4 w-4" />
                        <p className="text-xs">{t('market.schedule.unassigned')}</p>
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
          {t('market.schedule.dutyCount')}
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
                  <div className="nex-avatar flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white">
                    {getInitials(p?.username || '?')}
                  </div>
                  <span className="text-nex-text text-sm">{p?.username || t('common.member')}</span>
                </div>
                <span className="nex-badge-primary text-xs">{formatNumber(count)} {t('market.schedule.days')}</span>
              </div>
            )
          })}
        </div>
      </div>

      <ConfirmDialog
        open={deleteScheduleId !== null}
        title={t('market.schedule.deleteTitle')}
        message={t('market.schedule.deleteMsg')}
        confirmText={t('market.schedule.remove')}
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteScheduleId(null)}
      />
    </div>
  )
}
