'use client'

import { useEffect, useState, useCallback } from 'react'
import { useProfileStore, useMessStore } from '@/stores/appStore'
import { getMealRoutines, saveMealRoutines } from '@/actions/market'
import { usePusherRealtime } from '@/hooks/usePusherRealtime'
import { CalendarClock, Pencil, Save, X } from 'lucide-react'
import EmptyState from '@/components/EmptyState'
import { Skeleton } from '@/components/Skeleton'
import { getFoodEmoji } from '@/lib/utils'
import toast from 'react-hot-toast'

const DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

const PRESET_ITEMS = [
  { label: 'Chicken', emoji: '🍗' },
  { label: 'Fish', emoji: '🐟' },
  { label: 'Egg', emoji: '🥚' },
  { label: 'Vegetables', emoji: '🥬' },
  { label: 'Beef', emoji: '🥩' },
  { label: 'Mutton', emoji: '🍖' },
  { label: 'Dal', emoji: '🥣' },
  { label: 'Shrimp', emoji: '🍤' },
  { label: 'Rice', emoji: '🍚' },
  { label: 'Khichuri', emoji: '🍛' },
]

interface RoutineRow {
  day_of_week: number
  lunch: string
  dinner: string
}

export default function MealRoutine() {
  const { profile } = useProfileStore()
  const { currentMess, members } = useMessStore()
  const [routines, setRoutines] = useState<RoutineRow[]>([])
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState<RoutineRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingRoutines, setLoadingRoutines] = useState(true)
  const [activeEditCell, setActiveEditCell] = useState<{
    day: number
    type: 'lunch' | 'dinner'
  } | null>(null)

  const isManager = members.some((m) => m.user_id === profile?.id && m.role === 'manager')

  // Calculate day of week index for Dhaka (JS: 0=Sun, 6=Sat -> Sat=0, Sun=1...)
  // We offset UTC Day for Dhaka (since UTC Day + 1 % 7 maps correctly)
  const todayDow = (() => {
    const todayStr = new Date().toISOString().split('T')[0]
    const _dhakaBase = new Date(todayStr + 'T00:00:00+06:00')
    return (_dhakaBase.getUTCDay() + 1) % 7
  })()

  const fetchRoutines = useCallback(async () => {
    if (!currentMess?.id) return
    setLoadingRoutines(true)
    try {
      const data = await getMealRoutines(currentMess.id)

      const full: RoutineRow[] = Array.from({ length: 7 }, (_, i) => {
        const found = data?.find((d) => d.day_of_week === i)
        return found || { day_of_week: i, lunch: '', dinner: '' }
      })
      setRoutines(full)
    } catch (err: any) {
      toast.error('Failed to load routine')
    } finally {
      setLoadingRoutines(false)
    }
  }, [currentMess?.id])

  useEffect(() => {
    if (currentMess?.id) {
      fetchRoutines()
    }
  }, [currentMess?.id, fetchRoutines])

  // Real-time update via Pusher
  usePusherRealtime(currentMess?.id, ['meal_routines'], fetchRoutines)

  const startEditing = () => {
    setEditData(routines.map((r) => ({ ...r })))
    setEditing(true)
    setActiveEditCell(null)
  }

  const cancelEditing = () => {
    setEditing(false)
    setEditData([])
    setActiveEditCell(null)
  }

  const updateEditCell = (day: number, type: 'lunch' | 'dinner', value: string) => {
    setEditData((prev) => prev.map((r) => (r.day_of_week === day ? { ...r, [type]: value } : r)))
  }

  const addPresetToCell = (day: number, type: 'lunch' | 'dinner', label: string) => {
    const current = editData.find((r) => r.day_of_week === day)?.[type] || ''
    const newVal = current ? `${current}, ${label}` : label
    updateEditCell(day, type, newVal)
  }

  const saveRoutines = async () => {
    if (!currentMess?.id || !profile?.id) return
    setLoading(true)

    try {
      await saveMealRoutines(currentMess.id, editData)
      toast.success('Meal routine saved!')
      setEditing(false)
      setActiveEditCell(null)
      fetchRoutines()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save routine')
    } finally {
      setLoading(false)
    }
  }

  if (!currentMess) return null

  const displayData = editing ? editData : routines
  const hasAnyData = routines.some((r) => r.lunch || r.dinner)

  return (
    <div className="space-y-5">
      {/* Header Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <CalendarClock className="text-nex-primary h-6 w-6" />
          <h2 className="text-nex-text text-xl font-bold">Meal Routine</h2>
        </div>
        {isManager && (
          <div className="flex gap-2">
            {editing ? (
              <>
                <button
                  onClick={saveRoutines}
                  disabled={loading}
                  className="nex-btn-primary flex-1 justify-center text-xs disabled:opacity-50 sm:flex-none cursor-pointer"
                >
                  <Save className="h-4 w-4" /> Save Routine
                </button>
                <button
                  onClick={cancelEditing}
                  className="nex-btn-secondary flex-1 justify-center text-xs sm:flex-none cursor-pointer"
                >
                  <X className="h-4 w-4" /> Cancel
                </button>
              </>
            ) : (
              <button
                onClick={startEditing}
                className="nex-btn-primary flex-1 justify-center text-xs sm:flex-none cursor-pointer"
              >
                <Pencil className="h-4 w-4" /> Edit Routine
              </button>
            )}
          </div>
        )}
      </div>

      {/* Loading Skeletons */}
      {loadingRoutines && (
        <div className="nex-card space-y-4 p-5">
          <Skeleton className="h-6 w-32" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-7">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="border-nex-border space-y-2 rounded-xl border p-3">
                <Skeleton className="mx-auto h-4 w-12" />
                <Skeleton className="mx-auto h-3 w-16" />
                <Skeleton className="mx-auto h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loadingRoutines && !hasAnyData && !editing && (
        <div className="nex-card">
          <EmptyState
            icon={CalendarClock}
            title="No Meal Routine Set"
            description={
              isManager
                ? 'Click "Edit Routine" to set up the weekly meal menu.'
                : "The manager hasn't set a weekly meal menu yet."
            }
          />
        </div>
      )}

      {/* Preset Chips (only in edit mode) */}
      {editing && activeEditCell && (
        <div className="nex-card animate-slide-up p-4">
          <p className="text-nex-muted mb-2 text-xs font-medium">
            Quick add to <span className="text-nex-text font-bold">{DAYS[activeEditCell.day]}</span>{' '}
            {activeEditCell.type}:
          </p>
          <div className="flex flex-wrap gap-2">
            {PRESET_ITEMS.map((item) => (
              <button
                key={item.label}
                onClick={() => addPresetToCell(activeEditCell.day, activeEditCell.type, item.label)}
                className="bg-nex-elevated hover:bg-nex-hover text-nex-text rounded-full px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
              >
                {item.emoji} {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Desktop Table View */}
      {!loadingRoutines && (hasAnyData || editing) && (
        <div className="nex-card hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="bg-nex-elevated border-nex-border border-b">
                <th className="text-nex-muted w-20 px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase"></th>
                {DAYS.map((day, i) => (
                  <th
                    key={day}
                    className={`px-3 py-3 text-center text-xs font-semibold tracking-wider uppercase ${
                      todayDow === i ? 'text-nex-primary bg-nex-primary-light' : 'text-nex-muted'
                    }`}
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(['lunch', 'dinner'] as const).map((type) => (
                <tr key={type} className="border-nex-border border-b last:border-0">
                  <td className="text-nex-muted px-4 py-4 text-xs font-semibold uppercase">
                    {type === 'lunch' ? '☀️ Lunch' : '🌙 Dinner'}
                  </td>
                  {displayData.map((r) => {
                    const value = r[type] || ''
                    const isToday = todayDow === r.day_of_week
                    const isActive =
                      activeEditCell?.day === r.day_of_week && activeEditCell?.type === type

                    return (
                      <td
                        key={r.day_of_week}
                        className={`px-2 py-3 text-center ${isToday ? 'bg-nex-primary-light' : ''}`}
                      >
                        {editing ? (
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => updateEditCell(r.day_of_week, type, e.target.value)}
                            onFocus={() => setActiveEditCell({ day: r.day_of_week, type })}
                            className={`w-full rounded-lg border px-2 py-2 text-center text-xs transition-colors ${
                              isActive
                                ? 'border-nex-primary bg-nex-primary-light'
                                : 'border-nex-border bg-nex-surface'
                            } focus:border-nex-primary focus:outline-none`}
                            placeholder="—"
                          />
                        ) : value ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-base">{getFoodEmoji(value)}</span>
                            <span className="text-nex-text text-xs font-medium">{value}</span>
                          </div>
                        ) : (
                          <span className="text-nex-muted/40 text-xs">—</span>
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
      {!loadingRoutines && (hasAnyData || editing) && (
        <div className="space-y-2 sm:hidden">
          {displayData.map((r) => {
            const isToday = todayDow === r.day_of_week
            return (
              <div
                key={r.day_of_week}
                className={`nex-card p-4 ${isToday ? 'border-nex-primary border-2' : ''}`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <p
                    className={`text-sm font-bold ${isToday ? 'text-nex-primary' : 'text-nex-text'}`}
                  >
                    {DAYS[r.day_of_week]}
                    {isToday && (
                      <span className="bg-nex-primary ml-2 rounded-full px-2 py-0.5 text-xs font-medium text-white">
                        Today
                      </span>
                    )}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(['lunch', 'dinner'] as const).map((type) => {
                    const value = r[type] || ''
                    const isActive =
                      activeEditCell?.day === r.day_of_week && activeEditCell?.type === type
                    return (
                      <div
                        key={type}
                        className={`rounded-xl p-3 ${
                          type === 'lunch'
                            ? 'border border-amber-500/20 bg-amber-500/10'
                            : 'border border-indigo-500/20 bg-indigo-500/10'
                        }`}
                      >
                        <p
                          className={`mb-1.5 text-xs font-semibold tracking-wider uppercase ${
                            type === 'lunch' ? 'text-amber-600' : 'text-indigo-600'
                          }`}
                        >
                          {type === 'lunch' ? '☀️ Lunch' : '🌙 Dinner'}
                        </p>
                        {editing ? (
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => updateEditCell(r.day_of_week, type, e.target.value)}
                            onFocus={() => setActiveEditCell({ day: r.day_of_week, type })}
                            className={`bg-nex-surface w-full rounded-lg border px-2 py-1.5 text-sm transition-colors ${
                              isActive ? 'border-nex-primary' : 'border-transparent'
                            } focus:border-nex-primary focus:outline-none`}
                            placeholder="Set menu..."
                          />
                        ) : value ? (
                          <p className="text-nex-text text-sm font-medium">
                            {getFoodEmoji(value)} {value}
                          </p>
                        ) : (
                          <p className="text-nex-muted/50 text-xs">Not set</p>
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
