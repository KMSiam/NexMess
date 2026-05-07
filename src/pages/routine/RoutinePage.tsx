import { useEffect, useState } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { useMessStore } from '../../stores/messStore'
import { supabase } from '../../lib/supabase'
import { CalendarClock, Pencil, Save, X } from 'lucide-react'
import toast from 'react-hot-toast'

const DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const DAY_SHORT = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri']

const FOOD_EMOJI_MAP: Record<string, string> = {
  chicken: '🍗', fish: '🐟', egg: '🥚', vegetables: '🥬', beef: '🍖',
  mutton: '🍖', dal: '🫘', rice: '🍚', potato: '🥔', shrimp: '🍤',
  prawn: '🍤', curry: '🍛', soup: '🍲', noodles: '🍜', bread: '🍞',
  roti: '🫓', paneer: '🧀', milk: '🥛', salad: '🥗', fruit: '🍎',
  biryani: '🍚', khichuri: '🍚', polao: '🍚',
}

const PRESET_ITEMS = [
  { label: 'Chicken', emoji: '🍗' },
  { label: 'Fish', emoji: '🐟' },
  { label: 'Egg', emoji: '🥚' },
  { label: 'Vegetables', emoji: '🥬' },
  { label: 'Beef', emoji: '🍖' },
  { label: 'Mutton', emoji: '🍖' },
  { label: 'Dal', emoji: '🫘' },
  { label: 'Shrimp', emoji: '🍤' },
  { label: 'Rice', emoji: '🍚' },
  { label: 'Khichuri', emoji: '🍚' },
]

export function getFoodEmoji(text: string): string {
  if (!text) return ''
  const lower = text.toLowerCase()
  for (const [key, emoji] of Object.entries(FOOD_EMOJI_MAP)) {
    if (lower.includes(key)) return emoji
  }
  return '🍽️'
}

interface RoutineRow {
  day_of_week: number
  lunch: string
  dinner: string
}

export default function RoutinePage() {
  const { user } = useAuthStore()
  const { currentMess, members } = useMessStore()
  const [routines, setRoutines] = useState<RoutineRow[]>([])
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState<RoutineRow[]>([])
  const [loading, setLoading] = useState(false)
  const [activeEditCell, setActiveEditCell] = useState<{day: number, type: 'lunch' | 'dinner'} | null>(null)

  const isManager = members.some(m => m.user_id === user?.id && m.role === 'manager')
  const todayDow = (new Date().getDay() + 1) % 7 // JS: 0=Sun → our mapping: 0=Sat

  useEffect(() => {
    if (!currentMess?.id) return
    fetchRoutines()
  }, [currentMess?.id])

  const fetchRoutines = async () => {
    if (!currentMess?.id) return
    const { data } = await supabase
      .from('meal_routines')
      .select('day_of_week, lunch, dinner')
      .eq('mess_id', currentMess.id)
      .order('day_of_week', { ascending: true })

    // Fill in all 7 days even if some are missing
    const full: RoutineRow[] = Array.from({ length: 7 }, (_, i) => {
      const found = data?.find(d => d.day_of_week === i)
      return found || { day_of_week: i, lunch: '', dinner: '' }
    })
    setRoutines(full)
  }

  const startEditing = () => {
    setEditData(routines.map(r => ({ ...r })))
    setEditing(true)
    setActiveEditCell(null)
  }

  const cancelEditing = () => {
    setEditing(false)
    setEditData([])
    setActiveEditCell(null)
  }

  const updateEditCell = (day: number, type: 'lunch' | 'dinner', value: string) => {
    setEditData(prev => prev.map(r => r.day_of_week === day ? { ...r, [type]: value } : r))
  }

  const addPresetToCell = (day: number, type: 'lunch' | 'dinner', label: string) => {
    const current = editData.find(r => r.day_of_week === day)?.[type] || ''
    const newVal = current ? `${current}, ${label}` : label
    updateEditCell(day, type, newVal)
  }

  const saveRoutines = async () => {
    if (!currentMess?.id || !user?.id) return
    setLoading(true)

    const upserts = editData.map(r => ({
      mess_id: currentMess.id,
      day_of_week: r.day_of_week,
      lunch: r.lunch.trim(),
      dinner: r.dinner.trim(),
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }))

    const { error } = await supabase.from('meal_routines').upsert(upserts, { onConflict: 'mess_id,day_of_week' })

    if (error) toast.error('Failed to save routine')
    else {
      toast.success('Meal routine saved!')
      setEditing(false)
      setActiveEditCell(null)
      fetchRoutines()
    }
    setLoading(false)
  }

  if (!currentMess) return null

  const displayData = editing ? editData : routines
  const hasAnyData = routines.some(r => r.lunch || r.dinner)

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div className="flex items-center gap-3">
          <CalendarClock className="w-6 h-6 text-nex-primary" />
          <h1 className="text-2xl font-bold text-nex-text">Meal Routine</h1>
        </div>
        {isManager && (
          <div className="flex gap-2">
            {editing ? (
              <>
                <button onClick={saveRoutines} disabled={loading} className="nex-btn-primary text-xs flex-1 sm:flex-none justify-center disabled:opacity-50">
                  <Save className="w-4 h-4" /> Save Routine
                </button>
                <button onClick={cancelEditing} className="nex-btn-secondary text-xs flex-1 sm:flex-none justify-center">
                  <X className="w-4 h-4" /> Cancel
                </button>
              </>
            ) : (
              <button onClick={startEditing} className="nex-btn-primary text-xs flex-1 sm:flex-none justify-center">
                <Pencil className="w-4 h-4" /> Edit Routine
              </button>
            )}
          </div>
        )}
      </div>

      {/* Empty state */}
      {!hasAnyData && !editing && (
        <div className="nex-card p-12 text-center">
          <CalendarClock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-nex-text mb-1">No Meal Routine Set</h3>
          <p className="text-sm text-nex-muted">
            {isManager ? 'Click "Edit Routine" to set up the weekly meal menu.' : 'The manager hasn\'t set a weekly meal routine yet.'}
          </p>
        </div>
      )}

      {/* Preset Chips (only in edit mode) */}
      {editing && activeEditCell && (
        <div className="nex-card p-4 animate-slide-up">
          <p className="text-xs font-medium text-nex-muted mb-2">
            Quick add to <span className="font-bold text-nex-text">{DAYS[activeEditCell.day]}</span> {activeEditCell.type}:
          </p>
          <div className="flex flex-wrap gap-2">
            {PRESET_ITEMS.map(item => (
              <button
                key={item.label}
                onClick={() => addPresetToCell(activeEditCell.day, activeEditCell.type, item.label)}
                className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-medium text-nex-text transition-colors"
              >
                {item.emoji} {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Desktop Table View */}
      {(hasAnyData || editing) && (
        <div className="hidden sm:block nex-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-nex-border">
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-nex-muted uppercase tracking-wider w-20"></th>
                {DAYS.map((day, i) => (
                  <th key={day} className={`px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-wider ${todayDow === i ? 'text-nex-primary bg-blue-50/50' : 'text-nex-muted'}`}>
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(['lunch', 'dinner'] as const).map(type => (
                <tr key={type} className="border-b border-nex-border last:border-0">
                  <td className="px-4 py-4 text-xs font-semibold text-nex-muted uppercase">
                    {type === 'lunch' ? '☀️ Lunch' : '🌙 Dinner'}
                  </td>
                  {displayData.map(r => {
                    const value = r[type]
                    const isToday = todayDow === r.day_of_week
                    const isActive = activeEditCell?.day === r.day_of_week && activeEditCell?.type === type

                    return (
                      <td key={r.day_of_week} className={`px-2 py-3 text-center ${isToday ? 'bg-blue-50/30' : ''}`}>
                        {editing ? (
                          <input
                            type="text"
                            value={value}
                            onChange={e => updateEditCell(r.day_of_week, type, e.target.value)}
                            onFocus={() => setActiveEditCell({ day: r.day_of_week, type })}
                            className={`w-full text-center text-xs rounded-lg px-2 py-2 border transition-colors ${isActive ? 'border-nex-primary bg-blue-50' : 'border-nex-border bg-white'} focus:outline-none focus:border-nex-primary`}
                            placeholder="—"
                          />
                        ) : value ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-base">{getFoodEmoji(value)}</span>
                            <span className="text-xs font-medium text-nex-text">{value}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile Card View */}
      {(hasAnyData || editing) && (
        <div className="sm:hidden space-y-2">
          {displayData.map(r => {
            const isToday = todayDow === r.day_of_week
            return (
              <div key={r.day_of_week} className={`nex-card p-4 ${isToday ? 'border-nex-primary border-2' : ''}`}>
                <div className="flex items-center justify-between mb-3">
                  <p className={`text-sm font-bold ${isToday ? 'text-nex-primary' : 'text-nex-text'}`}>
                    {DAYS[r.day_of_week]}
                    {isToday && <span className="ml-2 text-[10px] font-medium bg-nex-primary text-white px-2 py-0.5 rounded-full">Today</span>}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(['lunch', 'dinner'] as const).map(type => {
                    const value = r[type]
                    const isActive = activeEditCell?.day === r.day_of_week && activeEditCell?.type === type
                    return (
                      <div key={type} className={`rounded-xl p-3 ${type === 'lunch' ? 'bg-amber-50 border border-amber-100' : 'bg-indigo-50 border border-indigo-100'}`}>
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${type === 'lunch' ? 'text-amber-600' : 'text-indigo-600'}">
                          {type === 'lunch' ? '☀️ Lunch' : '🌙 Dinner'}
                        </p>
                        {editing ? (
                          <input
                            type="text"
                            value={value}
                            onChange={e => updateEditCell(r.day_of_week, type, e.target.value)}
                            onFocus={() => setActiveEditCell({ day: r.day_of_week, type })}
                            className={`w-full text-sm rounded-lg px-2 py-1.5 border bg-white transition-colors ${isActive ? 'border-nex-primary' : 'border-transparent'} focus:outline-none focus:border-nex-primary`}
                            placeholder="Set menu..."
                          />
                        ) : value ? (
                          <p className="text-sm font-medium text-nex-text">{getFoodEmoji(value)} {value}</p>
                        ) : (
                          <p className="text-xs text-slate-400">Not set</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
