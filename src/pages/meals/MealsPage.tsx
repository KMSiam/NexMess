import { useEffect, useState, useMemo, useCallback, useReducer } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { useMessStore } from '../../stores/messStore'
import { supabase } from '../../lib/supabase'
import { Meal } from '../../types/database'
import { Utensils, ChevronLeft, ChevronRight, Sun, Moon, ShieldCheck, X, Download } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  addMonths, subMonths, isToday, isSameMonth, startOfWeek, endOfWeek,
  isBefore, startOfDay,
} from 'date-fns'
import toast from 'react-hot-toast'
import { isMealCutoffPassed, mealCutoffLabel } from '../../lib/utils'

export default function MealsPage() {
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

  const isManager = members.some(m => m.user_id === user?.id && m.role === 'manager' && m.status === 'approved')

  // Manager override modal state
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
    if (!currentMess?.id || !user?.id) return
    fetchMeals()

    // Real-time subscription for meals
    const channel = supabase
      .channel(`meals-${currentMess.id}-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meals', filter: `mess_id=eq.${currentMess.id}` },
        () => {
          setTimeout(fetchMeals, 300)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentMess?.id, user?.id, monthStr, viewMode, fetchMeals])

  const toggleMeal = async (date: string, type: 'lunch' | 'dinner') => {
    if (!user?.id || !currentMess?.id) return

    if (isBefore(new Date(date), startOfDay(new Date()))) {
      toast.error('Cannot update meals for past days')
      return
    }

    if (isMealCutoffPassed(date, type)) {
      toast.error(`${type === 'lunch' ? 'Lunch' : 'Dinner'} cut-off (${mealCutoffLabel(type)}) has passed`)
      return
    }

    const existing = meals.find(m => m.user_id === user.id && m.date === date)
    const currentLunch = existing?.lunch ?? false
    const currentDinner = existing?.dinner ?? false

    const newValue = type === 'lunch' ? !currentLunch : !currentDinner

    // Optimistic update
    setMeals(prev => {
      const idx = prev.findIndex(m => m.user_id === user.id && m.date === date)
      const updated = {
        ...(existing || { id: 'temp', user_id: user.id, mess_id: currentMess.id, date, lunch: false, dinner: false, guest_lunch: 0, guest_dinner: 0 }),
        [type]: newValue,
      } as Meal
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = updated
        return copy
      }
      return [...prev, updated]
    })

    // Note: guest_lunch/guest_dinner intentionally omitted — DO UPDATE SET only touches
    // specified columns, so manager-set guest counts are preserved on conflict
    const { error } = await supabase.from('meals').upsert({
      user_id: user.id,
      mess_id: currentMess.id,
      date,
      lunch: type === 'lunch' ? newValue : currentLunch,
      dinner: type === 'dinner' ? newValue : currentDinner,
    }, { onConflict: 'user_id,mess_id,date' })

    if (error) {
      toast.error(error.message || 'Failed to update meal')
      fetchMeals() // Revert
    }
  }

  // Prefill the override modal whenever the manager picks a different (member, date)
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
    return () => { cancelled = true }
  }, [overrideOpen, ovUserId, ovDate, currentMess?.id])

  const openOverride = (presetUserId?: string, presetDate?: string) => {
    if (!isManager) return
    setOvUserId(presetUserId || members.find(m => m.status === 'approved')?.user_id || '')
    setOvDate(presetDate || format(new Date(), 'yyyy-MM-dd'))
    setOvLunch(false)
    setOvDinner(false)
    setOvGuestLunch(0)
    setOvGuestDinner(0)
    setOverrideOpen(true)
  }

  const submitOverride = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentMess?.id || !ovUserId || !ovDate) return
    if (ovGuestLunch < 0 || ovGuestDinner < 0) {
      toast.error('Guest counts cannot be negative')
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
      toast.error(error.message || 'Override failed')
      return
    }
    toast.success('Meal updated')
    setOverrideOpen(false)
    fetchMeals()
  }

  // Monthly stats
  const monthlyStats = useMemo(() => {
    const relevantMeals = meals.filter(m => m.date.startsWith(monthStr) && (viewMode === 'all' || m.user_id === user?.id))
    const lunchCount = relevantMeals.reduce((acc, m) => acc + (m.lunch ? 1 : 0) + (m.guest_lunch || 0), 0)
    const dinnerCount = relevantMeals.reduce((acc, m) => acc + (m.dinner ? 1 : 0) + (m.guest_dinner || 0), 0)
    return { total: lunchCount + dinnerCount, lunch: lunchCount, dinner: dinnerCount }
  }, [meals, user?.id, monthStr, viewMode])

  const handleDownloadMealPDF = () => {
    if (!currentMess) return
    const monthMeals = meals.filter(m => m.date.startsWith(monthStr))

    // Group counts per user
    const byUser = new Map<string, { lunch: number; dinner: number; gLunch: number; gDinner: number }>()
    for (const m of monthMeals) {
      const cur = byUser.get(m.user_id) || { lunch: 0, dinner: 0, gLunch: 0, gDinner: 0 }
      cur.lunch += m.lunch ? 1 : 0
      cur.dinner += m.dinner ? 1 : 0
      cur.gLunch += m.guest_lunch || 0
      cur.gDinner += m.guest_dinner || 0
      byUser.set(m.user_id, cur)
    }

    const nameOf = (uid: string): string => {
      const mem = members.find(m => m.user_id === uid)
      const p = mem?.profiles as { username?: string } | null | undefined
      return p?.username || 'Unknown'
    }

    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text(`${currentMess.name} - Meal Report`, 14, 20)
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Month: ${format(currentDate, 'MMMM yyyy')}`, 14, 27)
    doc.setTextColor(0)

    const rows = Array.from(byUser.entries())
      .map(([uid, c]) => {
        const total = c.lunch + c.dinner + c.gLunch + c.gDinner
        return [nameOf(uid), c.lunch, c.dinner, c.gLunch, c.gDinner, total]
      })
      .sort((a, b) => Number(b[5]) - Number(a[5]))

    autoTable(doc, {
      startY: 35,
      head: [['Member', 'Lunch', 'Dinner', 'Guest L', 'Guest D', 'Total']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: { 5: { fontStyle: 'bold', halign: 'right' } },
    })

    doc.save(`NexMess_${currentMess.name.replace(/\s+/g, '_')}_Meals_${monthStr}.pdf`)
    toast.success('Meal report downloaded')
  }

  // Get meal for a specific date
  const getMealForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return meals.find(m => m.user_id === user?.id && m.date === dateStr)
  }

  // Get all member meals for a date (for "all" view)
  const getAllMealsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return meals.filter(m => m.date === dateStr)
  }

  if (!currentMess) return null

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Utensils className="w-6 h-6 text-nex-primary" />
          <h1 className="text-2xl font-bold text-nex-text">Meal Calendar</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadMealPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-btn border border-nex-border bg-nex-surface text-nex-text hover:bg-nex-hover transition-colors"
            title="Download meal report (PDF)"
          >
            <Download className="w-3.5 h-3.5 text-nex-primary" />
            PDF
          </button>
          {isManager && (
            <button
              onClick={() => openOverride()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-btn border border-nex-border bg-nex-surface text-nex-text hover:bg-nex-hover transition-colors"
              title="Override a member's meal (bypasses cut-off)"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-nex-primary" />
              Override
            </button>
          )}
          <div className="flex gap-1 bg-nex-elevated p-1 rounded-btn">
            <button onClick={() => setViewMode('personal')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'personal' ? 'bg-nex-surface text-nex-text shadow-sm' : 'text-nex-muted'
              }`}>My Meals</button>
            <button onClick={() => setViewMode('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'all' ? 'bg-nex-surface text-nex-text shadow-sm' : 'text-nex-muted'
              }`}>All Members</button>
          </div>
        </div>
      </div>

      {/* Month Navigator + Stats */}
      <div className="nex-card p-5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-2 rounded-btn hover:bg-nex-hover text-nex-muted transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold text-nex-text">{format(currentDate, 'MMMM yyyy')}</h2>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-2 rounded-btn hover:bg-nex-hover text-nex-muted transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-nex-primary-light rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-nex-primary">{monthlyStats.total}</p>
            <p className="text-[10px] text-blue-600 uppercase tracking-wider font-medium">Total Meals</p>
          </div>
          <div className="bg-amber-500/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{monthlyStats.lunch}</p>
            <p className="text-[10px] text-amber-600 uppercase tracking-wider font-medium">Lunch</p>
          </div>
          <div className="bg-indigo-500/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-indigo-600">{monthlyStats.dinner}</p>
            <p className="text-[10px] text-indigo-600 uppercase tracking-wider font-medium">Dinner</p>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Day Headers */}
          {['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(d => (
            <div key={d} className="text-center text-[10px] font-semibold text-nex-muted uppercase tracking-wider py-2">
              {d}
            </div>
          ))}

          {/* Days */}
          {calendarDays.map(day => {
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
                className={`relative min-h-[72px] p-1.5 rounded-xl border transition-colors ${
                  today ? 'border-nex-primary bg-nex-primary-light' :
                  inMonth ? 'border-nex-border bg-nex-surface' : 'border-transparent bg-nex-elevated/50'
                } ${managerClickable ? 'cursor-pointer hover:border-nex-primary' : ''}`}
              >
                <p className={`text-xs font-medium text-center mb-1 ${
                  today ? 'text-nex-primary' : inMonth ? 'text-nex-text' : 'text-nex-muted/40'
                }`}>
                  {format(day, 'd')}
                </p>

                {inMonth && viewMode === 'personal' && (() => {
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
                      className={`flex items-center justify-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium transition-colors ${
                        meal?.lunch || (meal?.guest_lunch || 0) > 0
                          ? 'bg-amber-500/15 text-amber-500'
                          : 'bg-nex-elevated text-nex-muted hover:bg-nex-hover'
                      } ${lunchLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={lunchTitle}
                    >
                      <Sun className="w-2.5 h-2.5" /> L {(meal?.guest_lunch || 0) > 0 && `+${meal?.guest_lunch}`}
                    </button>
                    <button
                      onClick={() => toggleMeal(dateStr, 'dinner')}
                      disabled={dinnerLocked}
                      className={`flex items-center justify-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium transition-colors ${
                        meal?.dinner || (meal?.guest_dinner || 0) > 0
                          ? 'bg-indigo-500/15 text-indigo-400'
                          : 'bg-nex-elevated text-nex-muted hover:bg-nex-hover'
                      } ${dinnerLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={dinnerTitle}
                    >
                      <Moon className="w-2.5 h-2.5" /> D {(meal?.guest_dinner || 0) > 0 && `+${meal?.guest_dinner}`}
                    </button>
                  </div>
                  )
                })()}

                {inMonth && viewMode === 'all' && allMeals.length > 0 && (
                  <div className="flex flex-col gap-0.5 mt-1 items-center">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded w-full justify-center">
                      <span>L:</span>
                      <span>{allMeals.reduce((s, m) => s + (m.lunch ? 1 : 0) + (m.guest_lunch || 0), 0)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded w-full justify-center">
                      <span>D:</span>
                      <span>{allMeals.reduce((s, m) => s + (m.dinner ? 1 : 0) + (m.guest_dinner || 0), 0)}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Manager Override Modal */}
      {overrideOpen && isManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOverrideOpen(false)}>
          <form
            onSubmit={submitOverride}
            onClick={(e) => e.stopPropagation()}
            className="nex-card w-full max-w-md p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-nex-primary" />
                <h3 className="text-lg font-semibold text-nex-text">Manager Override</h3>
              </div>
              <button type="button" onClick={() => setOverrideOpen(false)}
                className="p-1 rounded hover:bg-nex-hover text-nex-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-nex-muted">
              Edit a member's meal even after the cut-off has passed. Use sparingly.
            </p>

            <div>
              <label className="block text-xs font-medium text-nex-text mb-1">Member</label>
              <select
                value={ovUserId}
                onChange={e => setOvUserId(e.target.value)}
                className="nex-input w-full"
                required
              >
                <option value="" disabled>Select a member</option>
                {members
                  .filter(m => m.status === 'approved')
                  .map(m => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.profiles?.username || m.user_id.slice(0, 8)}
                      {m.user_id === user?.id ? ' (you)' : ''}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-nex-text mb-1">Date</label>
              <input
                type="date"
                value={ovDate}
                onChange={e => setOvDate(e.target.value)}
                className="nex-input w-full"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 p-3 rounded-btn border border-nex-border bg-nex-surface cursor-pointer">
                <input type="checkbox" checked={ovLunch} onChange={e => setOvLunch(e.target.checked)} />
                <Sun className="w-4 h-4 text-amber-500" />
                <span className="text-sm text-nex-text">Lunch</span>
              </label>
              <label className="flex items-center gap-2 p-3 rounded-btn border border-nex-border bg-nex-surface cursor-pointer">
                <input type="checkbox" checked={ovDinner} onChange={e => setOvDinner(e.target.checked)} />
                <Moon className="w-4 h-4 text-indigo-400" />
                <span className="text-sm text-nex-text">Dinner</span>
              </label>
              <div>
                <label className="block text-xs font-medium text-nex-muted mb-1">Guest Lunch</label>
                <input type="number" min={0} max={20} value={ovGuestLunch}
                  onChange={e => setOvGuestLunch(Math.max(0, parseInt(e.target.value) || 0))}
                  className="nex-input w-full" />
              </div>
              <div>
                <label className="block text-xs font-medium text-nex-muted mb-1">Guest Dinner</label>
                <input type="number" min={0} max={20} value={ovGuestDinner}
                  onChange={e => setOvGuestDinner(Math.max(0, parseInt(e.target.value) || 0))}
                  className="nex-input w-full" />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOverrideOpen(false)}
                className="flex-1 px-4 py-2 rounded-btn border border-nex-border bg-nex-surface text-nex-text text-sm font-medium hover:bg-nex-hover"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={ovSaving || !ovUserId}
                className="flex-1 nex-btn-primary text-sm disabled:opacity-50"
              >
                {ovSaving ? 'Saving…' : 'Save Override'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
