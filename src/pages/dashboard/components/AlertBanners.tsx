import { Clock, AlertTriangle, Wallet, ShoppingBag } from 'lucide-react'
import { formatCurrency, mealCutoffApproaching, mealCutoffLabel } from '../../../lib/utils'
import type { DashboardMeals, DashboardStats } from '../../../hooks/useDashboardData'

interface AlertBannersProps {
  mealsData: DashboardMeals
  stats: DashboardStats
  unpaidFixed: number
  isBazaarMan: boolean
  onQuickMealToggle: (tab: 'today' | 'tomorrow', type: 'lunch' | 'dinner') => void
}

export default function AlertBanners({ mealsData, stats, unpaidFixed, isBazaarMan, onQuickMealToggle }: AlertBannersProps) {
  // Cut-off reminder: only for *today* and only when the meal isn't already on
  const lunchLeft = !mealsData.today.lunch ? mealCutoffApproaching('lunch') : null
  const dinnerLeft = !mealsData.today.dinner ? mealCutoffApproaching('dinner') : null
  const banners: { type: 'lunch' | 'dinner'; minutes: number }[] = []
  if (lunchLeft !== null) banners.push({ type: 'lunch', minutes: lunchLeft })
  if (dinnerLeft !== null) banners.push({ type: 'dinner', minutes: dinnerLeft })

  const hasAlerts = banners.length > 0 || stats.balance < 0 || unpaidFixed > 0 || isBazaarMan

  if (!hasAlerts) return null

  return (
    <div className="space-y-3">
      {/* Cut-off Timers */}
      {banners.map(b => (
        <div key={b.type} className="relative overflow-hidden rounded-2xl bg-amber-500/5 border border-amber-500/20 p-4 flex items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-700 dark:text-amber-400">
                {b.type === 'lunch' ? 'Lunch' : 'Dinner'} Cut-off approaching
              </h4>
              <p className="text-xs text-nex-muted mt-0.5 max-w-md">
                Closing in <span className="font-bold text-amber-600 dark:text-amber-400">{b.minutes} mins</span>. Set your menu choice before {mealCutoffLabel(b.type)}.
              </p>
            </div>
          </div>
          <button
            onClick={() => onQuickMealToggle('today', b.type)}
            className="nex-btn-primary py-1.5 px-3 text-xs font-semibold whitespace-nowrap bg-amber-600 hover:bg-amber-700 text-white shrink-0 border-0"
          >
            Eat {b.type === 'lunch' ? 'Lunch' : 'Dinner'}
          </button>
        </div>
      ))}

      {/* Low Balance Alert */}
      {stats.balance < 0 && (
        <div className="relative overflow-hidden rounded-2xl bg-rose-500/5 border border-rose-500/20 p-4 flex items-start gap-3 animate-fade-in">
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-rose-700 dark:text-rose-400">Low Balance Alert</h4>
            <p className="text-xs text-nex-muted mt-0.5">
              Your personal account balance is negative (<span className="font-bold text-rose-600 dark:text-rose-400">{formatCurrency(stats.balance)}</span>). Please make a deposit soon to continue marking meals.
            </p>
          </div>
        </div>
      )}

      {/* Unpaid Fixed Costs */}
      {unpaidFixed > 0 && (
        <div className="relative overflow-hidden rounded-2xl bg-orange-500/5 border border-orange-500/20 p-4 flex items-start gap-3 animate-fade-in">
          <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-orange-700 dark:text-orange-400">Unpaid Fixed Bills</h4>
            <p className="text-xs text-nex-muted mt-0.5">
              The mess has <span className="font-bold text-orange-600 dark:text-orange-400">{unpaidFixed} unpaid bills</span> listed for this month.
            </p>
          </div>
        </div>
      )}

      {/* Bazaar Man Duty */}
      {isBazaarMan && (
        <div className="relative overflow-hidden rounded-2xl bg-emerald-500/5 border border-emerald-500/20 p-4 flex items-start gap-3 animate-fade-in">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-emerald-700 dark:text-emerald-400">🛒 You're the Bazaar Man today!</h4>
            <p className="text-xs text-nex-muted mt-0.5">
              It is your turn to shop for mess groceries today. Please log all bazaar expenses in the Finance tab afterwards.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
