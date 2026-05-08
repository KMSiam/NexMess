import { useEffect, useState, useMemo } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { useMessStore } from '../../stores/messStore'
import { supabase } from '../../lib/supabase'
import { Meal } from '../../types/database'
import { Utensils, ChevronLeft, ChevronRight, Sun, Moon } from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  addMonths, subMonths, isToday, isSameMonth, startOfWeek, endOfWeek,
  isBefore, startOfDay,
} from 'date-fns'
import toast from 'react-hot-toast'

export default function MealsPage() {
  const { user } = useAuthStore()
  const { currentMess } = useMessStore()
  
  const [meals, setMeals] = useState<Meal[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'personal' | 'all'>('personal')

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 6 }) // Saturday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 6 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  const monthStr = format(currentDate, 'yyyy-MM')

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
  }, [currentMess?.id, user?.id, monthStr, viewMode])

  async function fetchMeals() {
    if (!currentMess?.id) return

    let query = supabase
      .from('meals')
      .select('*')
      .eq('mess_id', currentMess.id)
      .gte('date', format(calendarStart, 'yyyy-MM-dd'))
      .lte('date', format(calendarEnd, 'yyyy-MM-dd'))

    if (viewMode === 'personal') {
      query = query.eq('user_id', user!.id)
    }

    const { data } = await query
    if (data) setMeals(data as Meal[])
  }

  const toggleMeal = async (date: string, type: 'lunch' | 'dinner') => {
    if (!user?.id || !currentMess?.id) return

    if (isBefore(new Date(date), startOfDay(new Date()))) {
      toast.error('Cannot update meals for past days')
      return
    }

    const existing = meals.find(m => m.user_id === user.id && m.date === date)
    const currentLunch = existing?.lunch || false
    const currentDinner = existing?.dinner || false

    const newValue = type === 'lunch' ? !currentLunch : !currentDinner

    // Optimistic update
    setMeals(prev => {
      const idx = prev.findIndex(m => m.user_id === user.id && m.date === date)
      const updated = {
        ...(existing || { id: 'temp', user_id: user.id, mess_id: currentMess.id, date, lunch: false, dinner: false }),
        [type]: newValue,
      } as Meal
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = updated
        return copy
      }
      return [...prev, updated]
    })

    const { error } = await supabase.from('meals').upsert({
      user_id: user.id,
      mess_id: currentMess.id,
      date,
      lunch: type === 'lunch' ? newValue : currentLunch,
      dinner: type === 'dinner' ? newValue : currentDinner,
    }, { onConflict: 'user_id,mess_id,date' })

    if (error) {
      toast.error('Failed to update meal')
      fetchMeals() // Revert
    }
  }

  // Monthly stats
  const monthlyStats = useMemo(() => {
    const relevantMeals = meals.filter(m => m.date.startsWith(monthStr) && (viewMode === 'all' || m.user_id === user?.id))
    const lunchCount = relevantMeals.reduce((acc, m) => acc + (m.lunch ? 1 : 0) + (m.guest_lunch || 0), 0)
    const dinnerCount = relevantMeals.reduce((acc, m) => acc + (m.dinner ? 1 : 0) + (m.guest_dinner || 0), 0)
    return { total: lunchCount + dinnerCount, lunch: lunchCount, dinner: dinnerCount }
  }, [meals, user?.id, monthStr, viewMode])

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

            return (
              <div
                key={dateStr}
                className={`relative min-h-[72px] p-1.5 rounded-xl border transition-colors ${
                  today ? 'border-nex-primary bg-nex-primary-light' :
                  inMonth ? 'border-nex-border bg-nex-surface' : 'border-transparent bg-nex-elevated/50'
                }`}
              >
                <p className={`text-xs font-medium text-center mb-1 ${
                  today ? 'text-nex-primary' : inMonth ? 'text-nex-text' : 'text-nex-muted/40'
                }`}>
                  {format(day, 'd')}
                </p>

                {inMonth && viewMode === 'personal' && (
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => toggleMeal(dateStr, 'lunch')}
                      disabled={isPastDate}
                      className={`flex items-center justify-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium transition-colors ${
                        meal?.lunch || (meal?.guest_lunch || 0) > 0
                          ? 'bg-amber-500/15 text-amber-500'
                          : 'bg-nex-elevated text-nex-muted hover:bg-nex-hover'
                      } ${isPastDate ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={isPastDate ? "Cannot update past meals" : "Toggle Lunch"}
                    >
                      <Sun className="w-2.5 h-2.5" /> L {(meal?.guest_lunch || 0) > 0 && `+${meal?.guest_lunch}`}
                    </button>
                    <button
                      onClick={() => toggleMeal(dateStr, 'dinner')}
                      disabled={isPastDate}
                      className={`flex items-center justify-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium transition-colors ${
                        meal?.dinner || (meal?.guest_dinner || 0) > 0
                          ? 'bg-indigo-500/15 text-indigo-400'
                          : 'bg-nex-elevated text-nex-muted hover:bg-nex-hover'
                      } ${isPastDate ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={isPastDate ? "Cannot update past meals" : "Toggle Dinner"}
                    >
                      <Moon className="w-2.5 h-2.5" /> D {(meal?.guest_dinner || 0) > 0 && `+${meal?.guest_dinner}`}
                    </button>
                  </div>
                )}

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
    </div>
  )
}
