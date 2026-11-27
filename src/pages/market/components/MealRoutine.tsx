import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../../stores/authStore'
import { useMessStore } from '../../../stores/messStore'
import { supabase } from '../../../lib/supabase'
import { CalendarClock, Moon, Pencil, Plus, Save, Sun, X } from 'lucide-react'
import EmptyState from '../../../components/EmptyState'
import { Skeleton } from '../../../components/Skeleton'
import {
  formatFoodName,
  getMealRoutineDow,
  dhakaToday,
  isApprovedManager,
} from '../../../lib/utils'
import { sanitizeAppError } from '../../../lib/errorHandler'
import toast from 'react-hot-toast'
import { getFoodIconMeta } from './foodIcons'
import { createRealtimeChannelName } from '../../../hooks/useRealtimeTable'

const DAYS_EN = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const DAYS_BN = ['শনিবার', 'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার']

const PRESET_ITEMS = [
  'Chicken',
  'Fish',
  'Egg',
  'Vegetables',
  'Beef',
  'Mutton',
  'Dal',
  'Shrimp',
  'Rice',
  'Khichuri',
] as const

interface RoutineRow {
  day_of_week: number
  lunch: string
  dinner: string
}

export default function MealRoutine() {
  const { t, i18n } = useTranslation()
  const isBangla = (i18n.language || 'en').startsWith('bn')
  const DAYS = isBangla ? DAYS_BN : DAYS_EN
  const { user } = useAuthStore()
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

  const isManager = isApprovedManager(members, user?.id)
  const todayDow = getMealRoutineDow(dhakaToday())

  const fetchRoutines = useCallback(async () => {
    if (!currentMess?.id) return
    setLoadingRoutines(true)
    try {
      const { data } = await supabase
        .from('meal_routines')
        .select('day_of_week, lunch, dinner')
        .eq('mess_id', currentMess.id)
        .order('day_of_week', { ascending: true })

      const full: RoutineRow[] = Array.from({ length: 7 }, (_, i) => {
        const found = data?.find((d) => d.day_of_week === i)
        return found || { day_of_week: i, lunch: '', dinner: '' }
      })
      setRoutines(full)
    } finally {
      setLoadingRoutines(false)
    }
  }, [currentMess?.id])

  useEffect(() => {
    if (!currentMess?.id) return
    void fetchRoutines()

    // Real-time subscription for routine
    const channel = supabase
      .channel(createRealtimeChannelName(`routine-realtime-${currentMess.id}`))
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meal_routines',
          filter: `mess_id=eq.${currentMess.id}`,
        },
        () => fetchRoutines()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentMess?.id, fetchRoutines])

  const startEditing = () => {
    setEditData(routines.map((r) => ({ ...r })))
    setEditing(true)
    setActiveEditCell({ day: todayDow, type: 'lunch' })
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
    if (!currentMess?.id || !user?.id) return
    setLoading(true)

    const upserts = editData.map((r) => ({
      mess_id: currentMess.id,
      day_of_week: r.day_of_week,
      lunch: r.lunch.trim(),
      dinner: r.dinner.trim(),
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }))

    const { error } = await supabase
      .from('meal_routines')
      .upsert(upserts, { onConflict: 'mess_id,day_of_week' })

    if (error) toast.error(sanitizeAppError(error, 'Failed to save routine'))
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
  const hasAnyData = routines.some((r) => r.lunch || r.dinner)

  const renderDishContent = (rawValue: string) => {
    const dishes = rawValue
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)

    if (dishes.length === 0) {
      return <p className="text-nex-muted/75 text-xs">{t('market.routine.notSet')}</p>
    }

    if (dishes.length === 1) {
      const meta = getFoodIconMeta(dishes[0])
      const DishIcon = meta.icon
      return (
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.bgClass}`}
          >
            <DishIcon className={`h-4 w-4 ${meta.textClass}`} />
          </div>
          <span className="text-nex-text min-w-0 truncate text-sm font-semibold">
            {formatFoodName(dishes[0])}
          </span>
        </div>
      )
    }

    return (
      <div className="flex flex-wrap gap-1.5">
        {dishes.map((dish, idx) => {
          const meta = getFoodIconMeta(dish)
          const DishIcon = meta.icon
          return (
            <span
              key={`${dish}-${idx}`}
              className="border-nex-border/80 bg-nex-surface inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium text-nex-text"
            >
              <DishIcon className={`h-3.5 w-3.5 shrink-0 ${meta.textClass}`} />
              <span>{formatFoodName(dish)}</span>
            </span>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-nex-primary/10 text-nex-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-nex-text text-xl font-bold">{t('market.routine.title')}</h2>
          </div>
        </div>
        {isManager && (
          <div className="flex gap-2">
            {editing ? (
              <>
                <button
                  onClick={saveRoutines}
                  disabled={loading}
                  className="nex-btn-primary flex-1 justify-center text-xs disabled:opacity-50 sm:flex-none"
                >
                  <Save className="h-4 w-4" /> {t('market.routine.save')}
                </button>
                <button
                  onClick={cancelEditing}
                  className="nex-btn-secondary flex-1 justify-center text-xs sm:flex-none"
                >
                  <X className="h-4 w-4" /> {t('common.cancel')}
                </button>
              </>
            ) : (
              <button
                onClick={startEditing}
                className="nex-btn-primary flex-1 justify-center text-xs sm:flex-none"
              >
                <Pencil className="h-4 w-4" /> {t('market.routine.editTitle')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Loading Skeletons */}
      {loadingRoutines && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="nex-card space-y-3 p-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loadingRoutines && !hasAnyData && !editing && (
        <div className="nex-card">
          <EmptyState
            icon={CalendarClock}
            title={t('market.routine.emptyTitle')}
            description={
              isManager
                ? t('market.routine.emptyDescManager')
                : t('market.routine.emptyDescMember')
            }
          />
        </div>
      )}

      {/* Preset Chips (only in edit mode) */}
      {editing && activeEditCell && (
        <div className="nex-card animate-slide-up border-nex-primary/25 bg-nex-surface/95 sticky top-[70px] z-20 p-4 backdrop-blur-md">
          <p className="text-nex-muted mb-2.5 flex items-center gap-1.5 text-xs font-medium">
            <Plus className="text-nex-primary h-3.5 w-3.5" />
            <span>{t('market.routine.quickAdd')}</span>
            <span className="text-nex-text font-bold">{DAYS[activeEditCell.day]}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1 font-semibold">
              {activeEditCell.type === 'lunch' ? (
                <>
                  <Sun className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
                  {t('dashboard.lunch')}
                </>
              ) : (
                <>
                  <Moon className="text-nex-primary h-3.5 w-3.5 dark:text-emerald-400" />
                  {t('dashboard.dinner')}
                </>
              )}
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {PRESET_ITEMS.map((label) => {
              const meta = getFoodIconMeta(label)
              const PresetIcon = meta.icon
              return (
                <button
                  key={label}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addPresetToCell(activeEditCell.day, activeEditCell.type, label)}
                  className="bg-nex-elevated hover:bg-nex-hover border-nex-border/70 text-nex-text inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors active:scale-95"
                >
                  <PresetIcon className={`h-3.5 w-3.5 ${meta.textClass}`} />
                  <span>{formatFoodName(label)}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Responsive 7-Day Card Grid */}
      {!loadingRoutines && (hasAnyData || editing) && (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {displayData.map((r) => {
            const isToday = todayDow === r.day_of_week
            return (
              <div
                key={r.day_of_week}
                className={`nex-card overflow-hidden transition-all ${
                  isToday
                    ? 'border-nex-primary/70 ring-nex-primary/15 ring-1'
                    : ''
                }`}
              >
                <div
                  className={`border-nex-border/80 flex items-center justify-between gap-2 border-b px-4 py-3 ${
                    isToday
                      ? 'bg-nex-primary-light/70 dark:bg-nex-primary/15'
                      : 'bg-nex-elevated/55 dark:bg-white/[0.02]'
                  }`}
                >
                  <h3
                    className={`text-sm font-bold tracking-tight ${
                      isToday ? 'text-nex-primary dark:text-emerald-400' : 'text-nex-text'
                    }`}
                  >
                    {DAYS[r.day_of_week]}
                  </h3>
                  {isToday && (
                    <span className="bg-nex-primary rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-white uppercase">
                      {t('common.today')}
                    </span>
                  )}
                </div>

                <div className="divide-nex-border/70 divide-y">
                  {(['lunch', 'dinner'] as const).map((type) => {
                    const value = r[type]
                    const isLunch = type === 'lunch'
                    const isActive =
                      activeEditCell?.day === r.day_of_week && activeEditCell?.type === type
                    const SlotIcon = isLunch ? Sun : Moon

                    return (
                      <div
                        key={type}
                        className={`px-4 py-3.5 transition-colors ${
                          isActive ? 'bg-nex-primary-light/40' : ''
                        }`}
                      >
                        <div className="mb-2 flex items-center gap-1.5">
                          <SlotIcon
                            className={`h-3.5 w-3.5 shrink-0 ${
                              isLunch
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-nex-muted dark:text-stone-400'
                            }`}
                          />
                          <span className="text-nex-muted text-[11px] font-semibold tracking-wider uppercase">
                            {isLunch ? t('dashboard.lunch') : t('dashboard.dinner')}
                          </span>
                        </div>

                        {editing ? (
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => updateEditCell(r.day_of_week, type, e.target.value)}
                            onFocus={() => setActiveEditCell({ day: r.day_of_week, type })}
                            className={`bg-nex-elevated/60 text-nex-text focus:border-nex-primary w-full rounded-lg border px-2.5 py-1.5 text-sm transition-colors focus:outline-none ${
                              isActive ? 'border-nex-primary' : 'border-nex-border'
                            }`}
                            placeholder={t('market.routine.placeholder')}
                          />
                        ) : value ? (
                          renderDishContent(value)
                        ) : (
                          <p className="text-nex-muted/75 text-xs">{t('market.routine.notSet')}</p>
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
