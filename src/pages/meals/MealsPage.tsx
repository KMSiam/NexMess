import { useEffect, useState, useMemo, useCallback, useReducer } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../stores/authStore'
import { useMessStore } from '../../stores/messStore'
import { supabase } from '../../lib/supabase'
import { Meal } from '../../types/database'
import { Utensils, ChevronLeft, ChevronRight, Sun, Moon, ShieldCheck, X } from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isToday,
  isSameMonth,
  startOfWeek,
  endOfWeek,
  isBefore,
  startOfDay,
} from 'date-fns'
import toast from 'react-hot-toast'
import { isMealCutoffPassed, mealCutoffLabel } from '../../lib/utils'
import { usePageTitle } from '../../hooks/usePageTitle'
import { useRealtimeTable } from '../../hooks/useRealtimeTable'
import { sanitizeAppError } from '../../lib/errorHandler'

export default function MealsPage() {
  const { t } = useTranslation()
  usePageTitle(t('nav.meals'))
  const { user } = useAuthStore()
  const { currentMess, members } = useMessStore()

  const [meals, setMeals] = useState<Meal[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'personal' | 'all'>('personal')

  // Re-render every minute so lunch/dinner locked state stays current as cutoff times pass
  const [, tick] = useReducer((n: number) => n + 1, 0)
  useEffect(() => {
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [tick])

  const isManager = members.some(
    (m) => m.user_id === user?.id && m.role === 'manager' && m.status === 'approved'
  )

  const [overrideOpen, setOverrideOpen] = useState(false)
  const [ovUserId, setOvUserId] = useState('')
  const [ovDate, setOvDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [ovLunch, setOvLunch] = useState(false)
  const [ovDinner, setOvDinner] = useState(false)
  const [ovGuestLunch, setOvGuestLunch] = useState(0)
  const [ovGuestDinner, setOvGuestDinner] = useState(0)
  const [ovSaving, setOvSaving] = useState(false)

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 6 }) // Saturday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 6 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  const monthStr = format(currentDate, 'yyyy-MM')
  const calendarStartStr = format(calendarStart, 'yyyy-MM-dd')
  const calendarEndStr = format(calendarEnd, 'yyyy-MM-dd')

  const fetchMeals = useCallback(async () => {
    if (!currentMess?.id) return

    let query = supabase
      .from('meals')
      .select('*')
      .eq('mess_id', currentMess.id)
      .gte('date', calendarStartStr)
      .lte('date', calendarEndStr)

    if (viewMode === 'personal') {
      query = query.eq('user_id', user!.id)
    }

    const { data } = await query
    if (data) setMeals(data as Meal[])
  }, [currentMess?.id, user, calendarStartStr, calendarEndStr, viewMode])

  useEffect(() => {
    fetchMeals()
  }, [fetchMeals])

  useRealtimeTable(
    currentMess?.id ? { table: 'meals', filter: `mess_id=eq.${currentMess.id}` } : [],
    fetchMeals
  )

  const toggleMeal = async (date: string, type: 'lunch' | 'dinner') => {
    if (!user?.id || !currentMess?.id) return

    if (isBefore(new Date(date), startOfDay(new Date()))) {
      toast.error('Cannot update meals for past days')
      return
    }

    if (isMealCutoffPassed(date, type)) {
      toast.error(
        `${type === 'lunch' ? 'Lunch' : 'Dinner'} cut-off (${mealCutoffLabel(type)}) has passed`
      )
      return
    }

    const existing = meals.find((m) => m.user_id === user.id && m.date === date)
    const currentLunch = existing?.lunch ?? false
    const currentDinner = existing?.dinner ?? false

    const newValue = type === 'lunch' ? !currentLunch : !currentDinner

    setMeals((prev) => {
      const idx = prev.findIndex((m) => m.user_id === user.id && m.date === date)
      const updated = {
        ...(existing || {
          id: 'temp',
          user_id: user.id,
          mess_id: currentMess.id,
          date,
          lunch: false,
          dinner: false,
          guest_lunch: 0,
          guest_dinner: 0,
        }),
        [type]: newValue,
      } as Meal
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = updated
        return copy
      }
      return [...prev, updated]
    })

    // Only include the toggled column — DO UPDATE SET touches only it, so the other
    // meal column stays identical (OLD = NEW) and the trigger's lunch_changed / dinner_changed
    // stays false. Including the other column caused false "cut-off has passed" raises when
    // local state was stale vs the DB value.
    const { error } = await supabase.from('meals').upsert(
      {
        user_id: user.id,
        mess_id: currentMess.id,
        date,
        [type]: newValue,
      },
      { onConflict: 'user_id,mess_id,date' }
    )

    if (error) {
      toast.error(sanitizeAppError(error, 'Failed to update meal'))
      fetchMeals() // Revert
    }
  }

  useEffect(() => {
    if (!overrideOpen || !ovUserId || !ovDate || !currentMess?.id) return
    let cancelled = false
    supabase
      .from('meals')
      .select('lunch, dinner, guest_lunch, guest_dinner')
      .eq('user_id', ovUserId)
      .eq('mess_id', currentMess.id)
      .eq('date', ovDate)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        setOvLunch(!!data?.lunch)
        setOvDinner(!!data?.dinner)
        setOvGuestLunch(data?.guest_lunch ?? 0)
        setOvGuestDinner(data?.guest_dinner ?? 0)
      })
    return () => {
      cancelled = true
    }
  }, [overrideOpen, ovUserId, ovDate, currentMess?.id])

  const openOverride = (presetUserId?: string, presetDate?: string) => {
    if (!isManager) return
    setOvUserId(presetUserId || members.find((m) => m.status === 'approved')?.user_id || '')
    setOvDate(presetDate || format(new Date(), 'yyyy-MM-dd'))
    setOvLunch(false)
    setOvDinner(false)
    setOvGuestLunch(0)
    setOvGuestDinner(0)
    setOverrideOpen(true)
  }

  const submitOverride = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!currentMess?.id || !ovUserId || !ovDate) return
    if (ovGuestLunch < 0 || ovGuestDinner < 0) {
      toast.error('Guest counts cannot be negative')
      return
    }
    if (ovGuestLunch > 20 || ovGuestDinner > 20) {
      toast.error('Guest count cannot exceed 20 meals per person')
      return
    }
    setOvSaving(true)
    const { error } = await supabase.rpc('manager_upsert_meal', {
      p_user_id: ovUserId,
      p_mess_id: currentMess.id,
      p_date: ovDate,
      p_lunch: ovLunch,
      p_dinner: ovDinner,
      p_guest_lunch: ovGuestLunch,
      p_guest_dinner: ovGuestDinner,
    })
    setOvSaving(false)
    if (error) {
      toast.error(sanitizeAppError(error, 'Override failed'))
      return
    }
    toast.success('Meal updated')
    setOverrideOpen(false)
    fetchMeals()
  }

  const monthlyStats = useMemo(() => {
    const relevantMeals = meals.filter(
      (m) => m.date.startsWith(monthStr) && (viewMode === 'all' || m.user_id === user?.id)
    )
    const lunchCount = relevantMeals.reduce(
      (acc, m) => acc + (m.lunch ? 1 : 0) + (m.guest_lunch || 0),
      0
    )
    const dinnerCount = relevantMeals.reduce(
      (acc, m) => acc + (m.dinner ? 1 : 0) + (m.guest_dinner || 0),
      0
    )
    return { total: lunchCount + dinnerCount, lunch: lunchCount, dinner: dinnerCount }
  }, [meals, user?.id, monthStr, viewMode])

  const getMealForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return meals.find((m) => m.user_id === user?.id && m.date === dateStr)
  }

  const getAllMealsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return meals.filter((m) => m.date === dateStr)
  }

  if (!currentMess) return null

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Utensils className="text-nex-primary h-6 w-6" />
          <h1 className="text-nex-text text-2xl font-bold">{t('meals.title')}</h1>
        </div>
        <div className="scrollbar-none mt-4 flex w-full flex-row items-center justify-start gap-2 overflow-x-auto pb-1 sm:mt-0 sm:w-auto sm:justify-end sm:pb-0">
          {isManager && (
            <button
              onClick={() => openOverride()}
              className="rounded-btn border-nex-border bg-nex-surface text-nex-text hover:bg-nex-hover flex shrink-0 items-center justify-center gap-1.5 border px-3 py-1.5 text-xs font-medium shadow-sm transition-colors"
              title={t('meals.overrideDesc')}
            >
              <ShieldCheck className="text-nex-primary h-3.5 w-3.5" />
              {t('meals.override')}
            </button>
          )}

          <div className="bg-nex-elevated rounded-btn flex shrink-0 gap-1 p-1 shadow-sm">
            <button
              onClick={() => setViewMode('personal')}
              className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                viewMode === 'personal'
                  ? 'bg-nex-surface text-nex-text shadow-sm'
                  : 'text-nex-muted hover:text-nex-text'
              }`}
            >
              {t('meals.myMeals')}
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                viewMode === 'all'
                  ? 'bg-nex-surface text-nex-text shadow-sm'
                  : 'text-nex-muted hover:text-nex-text'
              }`}
            >
              {t('meals.allMembers')}
            </button>
          </div>
        </div>
      </div>

      <div className="nex-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="rounded-btn hover:bg-nex-hover text-nex-muted p-2 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-nex-text text-lg font-semibold">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="rounded-btn hover:bg-nex-hover text-nex-muted p-2 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-3">
          <div className="bg-nex-primary-light rounded-xl p-3 text-center">
            <p className="text-nex-primary text-2xl font-bold">{monthlyStats.total}</p>
            <p className="text-xs font-medium tracking-wider text-blue-600 uppercase">
              {t('meals.totalMeals')}
            </p>
          </div>
          <div className="rounded-xl bg-amber-500/10 p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{monthlyStats.lunch}</p>
            <p className="text-xs font-medium tracking-wider text-amber-600 uppercase">
              {t('meals.lunch')}
            </p>
          </div>
          <div className="rounded-xl bg-indigo-500/10 p-3 text-center">
            <p className="text-2xl font-bold text-indigo-600">{monthlyStats.dinner}</p>
            <p className="text-xs font-medium tracking-wider text-indigo-600 uppercase">
              {t('meals.dinner')}
            </p>
          </div>
        </div>

        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="grid min-w-[320px] grid-cols-7 gap-1">
            {[
              t('days.sat'),
              t('days.sun'),
              t('days.mon'),
              t('days.tue'),
              t('days.wed'),
              t('days.thu'),
              t('days.fri'),
            ].map((d) => (
              <div
                key={d}
                className="text-nex-muted py-2 text-center text-xs font-semibold tracking-wider uppercase"
              >
                {d}
              </div>
            ))}

            {calendarDays.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const meal = getMealForDate(day)
              const allMeals = viewMode === 'all' ? getAllMealsForDate(day) : []
              const inMonth = isSameMonth(day, currentDate)
              const today = isToday(day)
              const isPastDate = isBefore(day, startOfDay(new Date()))

              const managerClickable = isManager && viewMode === 'all' && inMonth
              return (
                <div
                  key={dateStr}
                  onClick={managerClickable ? () => openOverride(undefined, dateStr) : undefined}
                  role={managerClickable ? 'button' : undefined}
                  tabIndex={managerClickable ? 0 : undefined}
                  className={`relative min-h-[72px] rounded-xl border p-1.5 transition-colors ${
                    today
                      ? 'border-nex-primary bg-nex-primary-light'
                      : inMonth
                        ? 'border-nex-border bg-nex-surface'
                        : 'bg-nex-elevated/50 border-transparent'
                  } ${managerClickable ? 'hover:border-nex-primary cursor-pointer' : ''}`}
                >
                  <p
                    className={`mb-1 text-center text-xs font-medium ${
                      today ? 'text-nex-primary' : inMonth ? 'text-nex-text' : 'text-nex-muted/40'
                    }`}
                  >
                    {format(day, 'd')}
                  </p>

                  {inMonth &&
                    viewMode === 'personal' &&
                    (() => {
                      const lunchLocked = isPastDate || isMealCutoffPassed(dateStr, 'lunch')
                      const dinnerLocked = isPastDate || isMealCutoffPassed(dateStr, 'dinner')
                      const lunchTitle = isPastDate
                        ? 'Cannot update past meals'
                        : isMealCutoffPassed(dateStr, 'lunch')
                          ? `Lunch cut-off (${mealCutoffLabel('lunch')}) has passed`
                          : 'Toggle Lunch'
                      const dinnerTitle = isPastDate
                        ? 'Cannot update past meals'
                        : isMealCutoffPassed(dateStr, 'dinner')
                          ? `Dinner cut-off (${mealCutoffLabel('dinner')}) has passed`
                          : 'Toggle Dinner'
                      return (
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => toggleMeal(dateStr, 'lunch')}
                            disabled={lunchLocked}
                            className={`flex w-full items-center justify-center gap-0.5 rounded px-1 py-1 text-[10px] font-medium transition-colors ${
                              meal?.lunch || (meal?.guest_lunch || 0) > 0
                                ? 'bg-amber-500/15 text-amber-500'
                                : 'bg-nex-elevated text-nex-muted hover:bg-nex-hover'
                            } ${lunchLocked ? 'cursor-not-allowed opacity-50' : ''}`}
                            title={lunchTitle}
                          >
                            <Sun className="h-2.5 w-2.5" /> L{' '}
                            {(meal?.guest_lunch || 0) > 0 && `+${meal?.guest_lunch}`}
                          </button>
                          <button
                            onClick={() => toggleMeal(dateStr, 'dinner')}
                            disabled={dinnerLocked}
                            className={`flex w-full items-center justify-center gap-0.5 rounded px-1 py-1 text-[10px] font-medium transition-colors ${
                              meal?.dinner || (meal?.guest_dinner || 0) > 0
                                ? 'bg-indigo-500/15 text-indigo-400'
                                : 'bg-nex-elevated text-nex-muted hover:bg-nex-hover'
                            } ${dinnerLocked ? 'cursor-not-allowed opacity-50' : ''}`}
                            title={dinnerTitle}
                          >
                            <Moon className="h-2.5 w-2.5" /> D{' '}
                            {(meal?.guest_dinner || 0) > 0 && `+${meal?.guest_dinner}`}
                          </button>
                        </div>
                      )
                    })()}

                  {inMonth &&
                    viewMode === 'all' &&
                    allMeals.length > 0 &&
                    (() => {
                      const lunchTotal = allMeals.reduce(
                        (s, m) => s + (m.lunch ? 1 : 0) + (m.guest_lunch || 0),
                        0
                      )
                      const dinnerTotal = allMeals.reduce(
                        (s, m) => s + (m.dinner ? 1 : 0) + (m.guest_dinner || 0),
                        0
                      )
                      if (lunchTotal === 0 && dinnerTotal === 0) return null
                      return (
                        <div className="mt-1 flex flex-col items-center gap-0.5">
                          {lunchTotal > 0 && (
                            <div className="flex w-full items-center justify-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-500">
                              <span>L:</span>
                              <span>{lunchTotal}</span>
                            </div>
                          )}
                          {dinnerTotal > 0 && (
                            <div className="flex w-full items-center justify-center gap-1 rounded bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-bold text-indigo-400">
                              <span>D:</span>
                              <span>{dinnerTotal}</span>
                            </div>
                          )}
                        </div>
                      )
                    })()}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {overrideOpen && isManager && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOverrideOpen(false)}
        >
          <form
            onSubmit={submitOverride}
            onClick={(e) => e.stopPropagation()}
            className="nex-card w-full max-w-md space-y-4 p-5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-nex-primary h-5 w-5" />
                <h3 className="text-nex-text text-lg font-semibold">{t('meals.override')}</h3>
              </div>
              <button
                type="button"
                onClick={() => setOverrideOpen(false)}
                className="hover:bg-nex-hover text-nex-muted rounded p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-nex-muted text-xs">
              {t('meals.overrideDesc')}
            </p>

            <div>
              <label className="text-nex-text mb-1 block text-xs font-medium">{t('common.member')}</label>
              <select
                value={ovUserId}
                onChange={(e) => setOvUserId(e.target.value)}
                className="nex-input w-full"
                required
              >
                <option value="" disabled>
                  {t('finance.depositModal.selectMember')}
                </option>
                {members
                  .filter((m) => m.status === 'approved')
                  .map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.profiles?.username || m.user_id.slice(0, 8)}
                      {m.user_id === user?.id ? ' (you)' : ''}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="text-nex-text mb-1 block text-xs font-medium">{t('common.date')}</label>
              <input
                type="date"
                value={ovDate}
                onChange={(e) => setOvDate(e.target.value)}
                className="nex-input w-full"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="rounded-btn border-nex-border bg-nex-surface flex cursor-pointer items-center gap-2 border p-3">
                <input
                  type="checkbox"
                  checked={ovLunch}
                  onChange={(e) => setOvLunch(e.target.checked)}
                />
                <Sun className="h-4 w-4 text-amber-500" />
                <span className="text-nex-text text-sm">{t('dashboard.lunch')}</span>
              </label>
              <label className="rounded-btn border-nex-border bg-nex-surface flex cursor-pointer items-center gap-2 border p-3">
                <input
                  type="checkbox"
                  checked={ovDinner}
                  onChange={(e) => setOvDinner(e.target.checked)}
                />
                <Moon className="h-4 w-4 text-indigo-400" />
                <span className="text-nex-text text-sm">{t('dashboard.dinner')}</span>
              </label>
              <div>
                <label className="text-nex-muted mb-1 block text-xs font-medium">
                  {t('dashboard.guests')} ({t('dashboard.lunch')})
                </label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={ovGuestLunch}
                  onChange={(e) => setOvGuestLunch(Math.max(0, parseInt(e.target.value) || 0))}
                  className="nex-input w-full"
                />
              </div>
              <div>
                <label className="text-nex-muted mb-1 block text-xs font-medium">
                  {t('dashboard.guests')} ({t('dashboard.dinner')})
                </label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={ovGuestDinner}
                  onChange={(e) => setOvGuestDinner(Math.max(0, parseInt(e.target.value) || 0))}
                  className="nex-input w-full"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOverrideOpen(false)}
                className="rounded-btn border-nex-border bg-nex-surface text-nex-text hover:bg-nex-hover flex-1 border px-4 py-2 text-sm font-medium"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={ovSaving || !ovUserId}
                className="nex-btn-primary flex-1 text-sm disabled:opacity-50"
              >
                {ovSaving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
