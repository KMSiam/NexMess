'use client'

import { useState } from 'react'
import { UtensilsCrossed } from 'lucide-react'
import {
  isMealCutoffPassed,
  mealCutoffLabel,
  getFoodEmoji,
  dhakaToday,
  dhakaTomorrow,
} from '@/lib/utils'

interface DashboardMeals {
  today: { lunch: boolean; dinner: boolean; gl: number; gd: number }
  tomorrow: { lunch: boolean; dinner: boolean; gl: number; gd: number }
}

interface DashboardRoutines {
  today: { lunch: string; dinner: string }
  tomorrow: { lunch: string; dinner: string }
}

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
  const [mealTab, setMealTab] = useState<'today' | 'tomorrow'>('today')
  const today = dhakaToday()
  const tomorrow = dhakaTomorrow()
  const currentMData = mealsData[mealTab]

  return (
    <div className="nex-card h-full p-5">
      <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <h4 className="text-nex-text text-sm font-semibold tracking-wider uppercase">My Meals</h4>
          {routines[mealTab]?.lunch || routines[mealTab]?.dinner ? (
            <div className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1">
              <UtensilsCrossed className="h-3 w-3 text-amber-500" />
              <span className="text-xs font-medium text-amber-500">
                {mealTab === 'today' ? 'Today' : 'Tomorrow'}:{' '}
                {routines[mealTab].lunch
                  ? `${getFoodEmoji(routines[mealTab].lunch)} ${routines[mealTab].lunch} (L)`
                  : ''}
                {routines[mealTab].lunch && routines[mealTab].dinner ? ' · ' : ''}
                {routines[mealTab].dinner
                  ? `${getFoodEmoji(routines[mealTab].dinner)} ${routines[mealTab].dinner} (D)`
                  : ''}
              </span>
            </div>
          ) : null}
        </div>
        <div className="bg-nex-elevated rounded-btn flex gap-1 self-start p-1 sm:self-auto">
          <button
            onClick={() => setMealTab('today')}
            className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
              mealTab === 'today' ? 'bg-nex-surface text-nex-text shadow-sm' : 'text-nex-muted'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setMealTab('tomorrow')}
            className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
              mealTab === 'tomorrow' ? 'bg-nex-surface text-nex-text shadow-sm' : 'text-nex-muted'
            }`}
          >
            Tomorrow
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          {
            type: 'lunch' as const,
            emoji: '☀️',
            on: currentMData?.lunch || false,
            label: 'Lunch',
            guests: currentMData?.gl || 0,
          },
          {
            type: 'dinner' as const,
            emoji: '🌙',
            on: currentMData?.dinner || false,
            label: 'Dinner',
            guests: currentMData?.gd || 0,
          },
        ].map(({ type, emoji, on, label, guests }) => {
          const targetDate = mealTab === 'today' ? today : tomorrow
          const locked = isMealCutoffPassed(targetDate, type)
          const lockTitle = locked ? `${label} cut-off (${mealCutoffLabel(type)}) has passed` : ''
          return (
            <div
              key={type}
              className={`flex flex-col rounded-xl border p-4 transition-colors duration-200 ${
                on || guests > 0
                  ? 'bg-nex-success-light border-emerald-200 dark:border-emerald-500/25'
                  : 'bg-nex-elevated border-nex-border'
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{emoji}</span>
                  <div>
                    <p className="text-nex-text text-sm font-medium">{label}</p>
                    <p
                      className={`text-xs font-medium ${
                        locked
                          ? 'text-nex-muted'
                          : on
                            ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                            : 'text-nex-muted'
                      }`}
                    >
                      {locked ? `Locked · ${mealCutoffLabel(type)}` : on ? 'Eating' : 'Skipping'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onToggleMeal(mealTab, type)}
                  disabled={mealLoading || locked}
                  title={lockTitle}
                  className={`relative h-7 w-12 rounded-full transition-colors duration-200 ${
                    on ? 'nex-toggle-on' : 'nex-toggle-off'
                  } ${locked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      on ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between border-t border-emerald-100/50 pt-3">
                <p className="text-xs font-medium text-slate-500">Guests</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onUpdateGuest(mealTab, type, -1)}
                    disabled={mealLoading || locked || guests === 0}
                    title={lockTitle}
                    className="bg-nex-surface border-nex-border text-nex-muted hover:bg-nex-hover flex h-6 w-6 items-center justify-center rounded-md border disabled:opacity-50 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="w-4 text-center text-sm font-semibold">{guests}</span>
                  <button
                    onClick={() => onUpdateGuest(mealTab, type, 1)}
                    disabled={mealLoading || locked}
                    title={lockTitle}
                    className="bg-nex-surface border-nex-border text-nex-muted hover:bg-nex-hover flex h-6 w-6 items-center justify-center rounded-md border disabled:opacity-50 cursor-pointer"
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
