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

  return (
    <div className="space-y-3">
      {banners.map(b => (
        <div key={b.type} className="nex-card p-4 border-l-4 border-amber-500 bg-amber-500/5 flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
              {b.type === 'lunch' ? 'Lunch' : 'Dinner'} cut-off in {b.minutes} min
            </p>
            <p className="text-xs text-nex-muted mt-0.5">
              Set today's {b.type} before {mealCutoffLabel(b.type)} or the manager will need to override it.
            </p>
          </div>
          <button
            onClick={() => onQuickMealToggle('today', b.type)}
            className="nex-btn-primary text-xs py-1.5 px-3 whitespace-nowrap"
          >
            Mark on
          </button>
        </div>
      ))}

      {stats.balance < 0 && (
        <div className="nex-card p-4 border-l-4 border-red-500 bg-red-500/5 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-500">Low Balance Alert</p>
            <p className="text-xs text-nex-muted mt-0.5">Your balance is negative ({formatCurrency(stats.balance)}). Please deposit money.</p>
          </div>
        </div>
      )}

      {unpaidFixed > 0 && (
        <div className="nex-card p-4 border-l-4 border-orange-400 bg-orange-500/5 flex items-center gap-3">
          <Wallet className="w-5 h-5 text-orange-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-orange-500">Unpaid Fixed Costs</p>
            <p className="text-xs text-nex-muted mt-0.5">The mess has {unpaidFixed} unpaid fixed costs this month.</p>
          </div>
        </div>
      )}

      {isBazaarMan && (
        <div className="nex-card p-4 border-l-4 border-emerald-400 bg-emerald-500/5 flex items-center gap-3">
          <ShoppingBag className="w-5 h-5 text-emerald-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-500">🛒 You're the Bazaar Man today!</p>
            <p className="text-xs text-nex-muted mt-0.5">Don't forget to log your expenses after shopping.</p>
          </div>
        </div>
      )}
    </div>
  )
}
