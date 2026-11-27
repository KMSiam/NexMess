import { useState, useEffect, useReducer } from 'react'
import { UtensilsCrossed, Check, Lock, Clock, Sun, Moon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  isMealCutoffPassed,
  mealCutoffLabel,
  mealCutoffCountdown,
  formatCountdownDuration,
  formatFoodName,
  formatNumber,
  dhakaToday,
  dhakaTomorrow,
} from '../../../lib/utils'
import { getFoodIconMeta } from '../../market/components/foodIcons'
import type { DashboardMeals, DashboardRoutines } from '../../../hooks/useDashboardData'
import SlidingTabs from '../../../components/SlidingTabs'

interface MealSelectorProps {
  mealsData: DashboardMeals
  routines: DashboardRoutines
  mealLoading: boolean
  onToggleMeal: (tab: 'today' | 'tomorrow', type: 'lunch' | 'dinner') => void
  onUpdateGuest: (tab: 'today' | 'tomorrow', type: 'lunch' | 'dinner', delta: number) => void
}

export default function MealSelector({
  mealsData,
  routines,
  mealLoading,
  onToggleMeal,
  onUpdateGuest,
}: MealSelectorProps) {
  const { t } = useTranslation()
  const [mealTab, setMealTab] = useState<'today' | 'tomorrow'>('today')
  const [, tick] = useReducer((n: number) => n + 1, 0)

  useEffect(() => {
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [tick])

  const today = dhakaToday()
  const tomorrow = dhakaTomorrow()
  const currentMData = mealsData[mealTab]

  const renderRoutineSlot = (rawDish: string, shortLabel: string) => {
    const dishes = rawDish
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)

    return (
      <span className="inline-flex flex-wrap items-center gap-1">
        {dishes.map((dish, index) => {
          const meta = getFoodIconMeta(dish)
          const DishIcon = meta.icon
          return (
            <span key={`${dish}-${index}`} className="inline-flex items-center gap-1">
              {index > 0 && <span className="text-nex-muted">,</span>}
              <span
                className={`inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md ${meta.bgClass}`}
              >
                <DishIcon className={`h-3 w-3 ${meta.textClass}`} />
              </span>
              <span>{formatFoodName(dish)}</span>
            </span>
          )
        })}
        <span className="opacity-80">({shortLabel})</span>
      </span>
    )
  }

  return (
    <div className="nex-card h-full p-5">
      <div className="mb-4 space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-nex-text shrink-0 text-xs font-bold tracking-wider whitespace-nowrap uppercase sm:text-sm sm:font-semibold">
            {t('dashboard.myMealsTitle')}
          </h2>
          <SlidingTabs
            layoutId="meal-selector-tabs"
            size="sm"
            tabs={[
              { key: 'today', label: t('common.today') },
              { key: 'tomorrow', label: t('common.tomorrow') },
            ]}
            activeTab={mealTab}
            onChange={setMealTab}
          />
        </div>
        {(routines[mealTab].lunch || routines[mealTab].dinner) && (
          <div className="inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-800 dark:text-amber-300">
            <UtensilsCrossed className="h-3 w-3 shrink-0 text-amber-700 dark:text-amber-400" />
            <span>{mealTab === 'today' ? t('common.today') : t('common.tomorrow')}:</span>
            {routines[mealTab].lunch &&
              renderRoutineSlot(routines[mealTab].lunch, t('meals.lunchShort'))}
            {routines[mealTab].lunch && routines[mealTab].dinner && (
              <span aria-hidden="true" className="opacity-60">
                ·
              </span>
            )}
            {routines[mealTab].dinner &&
              renderRoutineSlot(routines[mealTab].dinner, t('meals.dinnerShort'))}
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
        {[
          {
            type: 'lunch' as const,
            Icon: Sun,
            iconBgClass: 'bg-amber-500/12 dark:bg-amber-400/15',
            iconTextClass: 'text-amber-700 dark:text-amber-400',
            on: currentMData.lunch,
            label: t('dashboard.lunch'),
            guests: currentMData.gl,
          },
          {
            type: 'dinner' as const,
            Icon: Moon,
            iconBgClass: 'bg-nex-secondary-light',
            iconTextClass: 'text-nex-secondary',
            on: currentMData.dinner,
            label: t('dashboard.dinner'),
            guests: currentMData.gd,
          },
        ].map(({ type, Icon, iconBgClass, iconTextClass, on, label, guests }) => {
          const targetDate = mealTab === 'today' ? today : tomorrow
          const locked = isMealCutoffPassed(targetDate, type)
          const countdown = mealCutoffCountdown(targetDate, type)
          const lockTitle = locked
            ? t('meals.cutoffTooltip', { meal: label, time: mealCutoffLabel(type) })
            : ''
          const isActive = on || guests > 0
          return (
            <div
              key={type}
              className={`flex flex-col rounded-xl border p-4 transition-all duration-300 ${
                isActive
                  ? 'border-emerald-200/90 bg-emerald-50/75 dark:border-emerald-500/25 dark:bg-emerald-500/[0.08]'
                  : 'border-nex-border bg-nex-elevated/70 dark:border-[#2c2c32] dark:bg-[#1c1c20]'
              }`}
            >
              <div className="mb-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${iconBgClass}`}
                      aria-hidden="true"
                    >
                      <Icon className={`h-4 w-4 ${iconTextClass}`} />
                    </span>
                    <p className="text-nex-text truncate text-sm font-semibold">{label}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={label}
                    onClick={() => onToggleMeal(mealTab, type)}
                    disabled={mealLoading || locked}
                    title={lockTitle}
                    className={`focus-visible:ring-nex-primary/50 relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 ${
                      locked ? 'cursor-not-allowed' : 'cursor-pointer active:scale-[0.96]'
                    } ${
                      on
                        ? locked
                          ? 'bg-[#4a6d56]/55 dark:bg-emerald-500/40'
                          : 'bg-gradient-to-r from-[#3a5643] to-[#4a6d56] shadow-inner shadow-black/15 dark:from-emerald-600 dark:to-emerald-500 dark:shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                        : locked
                          ? 'border border-black/5 bg-[#e6dfd5]/70 dark:border-white/5 dark:bg-[#242429]'
                          : 'border border-black/5 bg-[#ded6ca] hover:bg-[#d4cabe] dark:border-white/10 dark:bg-[#2f2f36] dark:hover:bg-[#3a3a42]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                        on ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    >
                      {locked ? (
                        <Lock className="text-nex-muted h-2.5 w-2.5" />
                      ) : on ? (
                        <Check className="h-2.5 w-2.5 stroke-[3] text-[#3a5643] dark:text-emerald-600" />
                      ) : null}
                    </span>
                  </button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-1.5 pl-9">
                  <p
                    className={`flex items-center gap-1 text-[11px] font-medium whitespace-nowrap ${
                      locked
                        ? 'text-nex-muted'
                        : on
                          ? 'font-semibold text-[#3a5643] dark:text-emerald-400'
                          : 'text-nex-muted'
                    }`}
                  >
                    {locked
                      ? `${t('dashboard.locked')} · ${mealCutoffLabel(type)}`
                      : on
                        ? t('common.eating')
                        : t('common.skipping')}
                  </p>
                  {countdown.status === 'open' && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                        countdown.isUrgent
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                          : 'bg-nex-surface/80 text-nex-muted dark:bg-white/5'
                      }`}
                    >
                      <Clock className="h-2.5 w-2.5 shrink-0" />
                      {t('meals.locksIn', {
                        time: formatCountdownDuration(countdown.hoursLeft, countdown.minutesLeft),
                      })}
                    </span>
                  )}
                </div>
              </div>
              <div
                className={`flex items-center justify-between border-t pt-3 ${
                  isActive
                    ? 'border-emerald-200/60 dark:border-emerald-500/15'
                    : 'border-nex-border/70 dark:border-white/5'
                }`}
              >
                <p className="text-nex-muted text-xs font-medium">{t('dashboard.guests')}</p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onUpdateGuest(mealTab, type, -1)}
                    disabled={mealLoading || locked || guests === 0}
                    title={lockTitle}
                    aria-label={`${label}: -1 ${t('dashboard.guests')}`}
                    className="bg-nex-surface border-nex-border text-nex-muted hover:bg-nex-hover flex h-6 w-6 items-center justify-center rounded-md border transition-colors disabled:opacity-45 dark:bg-[#161618] dark:hover:bg-[#26262b]"
                  >
                    -
                  </button>
                  <span className="text-nex-text w-4 text-center text-sm font-semibold">
                    {formatNumber(guests)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onUpdateGuest(mealTab, type, 1)}
                    disabled={mealLoading || locked}
                    title={lockTitle}
                    aria-label={`${label}: +1 ${t('dashboard.guests')}`}
                    className="bg-nex-surface border-nex-border text-nex-muted hover:bg-nex-hover flex h-6 w-6 items-center justify-center rounded-md border transition-colors disabled:opacity-45 dark:bg-[#161618] dark:hover:bg-[#26262b]"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
