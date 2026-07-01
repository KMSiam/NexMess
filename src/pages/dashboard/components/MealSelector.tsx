import { useState } from 'react'
import { UtensilsCrossed } from 'lucide-react'
import { isMealCutoffPassed, mealCutoffLabel, getFoodEmoji, dhakaToday, dhakaTomorrow } from '../../../lib/utils'
import type { DashboardMeals, DashboardRoutines } from '../../../hooks/useDashboardData'

interface MealSelectorProps {
  mealsData: DashboardMeals
  routines: DashboardRoutines
  mealLoading: boolean
  onToggleMeal: (tab: 'today' | 'tomorrow', type: 'lunch' | 'dinner') => void
  onUpdateGuest: (tab: 'today' | 'tomorrow', type: 'lunch' | 'dinner', delta: number) => void
}

export default function MealSelector({ mealsData, routines, mealLoading, onToggleMeal, onUpdateGuest }: MealSelectorProps) {
  const [mealTab, setMealTab] = useState<'today' | 'tomorrow'>('today')
  const today = dhakaToday()
  const tomorrow = dhakaTomorrow()
  const currentMData = mealsData[mealTab]

  return (
    <div className="nex-card p-5 h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-nex-text uppercase tracking-wider">My Meals</h4>
          {routines[mealTab].lunch || routines[mealTab].dinner ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 rounded-full border border-amber-500/20">
              <UtensilsCrossed className="w-3 h-3 text-amber-500" />
              <span className="text-xs font-medium text-amber-500">
                {mealTab === 'today' ? 'Today' : 'Tomorrow'}: {routines[mealTab].lunch ? `${getFoodEmoji(routines[mealTab].lunch)} ${routines[mealTab].lunch} (L)` : ''}
                {routines[mealTab].lunch && routines[mealTab].dinner ? ' · ' : ''}
                {routines[mealTab].dinner ? `${getFoodEmoji(routines[mealTab].dinner)} ${routines[mealTab].dinner} (D)` : ''}
              </span>
            </div>
          ) : null}
        </div>
        <div className="flex gap-1 bg-nex-elevated p-1 rounded-btn self-start sm:self-auto">
          <button onClick={() => setMealTab('today')} className={`px-3 py-1 text-xs font-medium rounded transition-colors ${mealTab === 'today' ? 'bg-nex-surface text-nex-text shadow-sm' : 'text-nex-muted'}`}>Today</button>
          <button onClick={() => setMealTab('tomorrow')} className={`px-3 py-1 text-xs font-medium rounded transition-colors ${mealTab === 'tomorrow' ? 'bg-nex-surface text-nex-text shadow-sm' : 'text-nex-muted'}`}>Tomorrow</button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { type: 'lunch' as const, emoji: '☀️', on: currentMData.lunch, label: 'Lunch', guests: currentMData.gl },
          { type: 'dinner' as const, emoji: '🌙', on: currentMData.dinner, label: 'Dinner', guests: currentMData.gd },
        ].map(({ type, emoji, on, label, guests }) => {
          const targetDate = mealTab === 'today' ? today : tomorrow
          const locked = isMealCutoffPassed(targetDate, type)
          const lockTitle = locked ? `${label} cut-off (${mealCutoffLabel(type)}) has passed` : ''
          return (
            <div key={type} className={`flex flex-col p-4 rounded-xl border transition-colors duration-200 ${on || guests > 0 ? 'bg-nex-success-light border-emerald-200 dark:border-emerald-500/25' : 'bg-nex-elevated border-nex-border'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{emoji}</span>
                  <div>
                    <p className="text-sm font-medium text-nex-text">{label}</p>
                    <p className={`text-xs font-medium ${locked ? 'text-nex-muted' : on ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-nex-muted'}`}>
                      {locked ? `Locked · ${mealCutoffLabel(type)}` : on ? 'Eating' : 'Skipping'}
                    </p>
                  </div>
                </div>
                <button onClick={() => onToggleMeal(mealTab, type)} disabled={mealLoading || locked} title={lockTitle} className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${on ? 'nex-toggle-on' : 'nex-toggle-off'} ${locked ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${on ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-emerald-100/50">
                <p className="text-xs font-medium text-slate-500">Guests</p>
                <div className="flex items-center gap-3">
                  <button onClick={() => onUpdateGuest(mealTab, type, -1)} disabled={mealLoading || locked || guests === 0} title={lockTitle} className="w-6 h-6 rounded-md bg-nex-surface border border-nex-border flex items-center justify-center text-nex-muted hover:bg-nex-hover disabled:opacity-50">-</button>
                  <span className="text-sm font-semibold w-4 text-center">{guests}</span>
                  <button onClick={() => onUpdateGuest(mealTab, type, 1)} disabled={mealLoading || locked} title={lockTitle} className="w-6 h-6 rounded-md bg-nex-surface border border-nex-border flex items-center justify-center text-nex-muted hover:bg-nex-hover disabled:opacity-50">+</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
