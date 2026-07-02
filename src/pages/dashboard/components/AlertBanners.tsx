import { Clock, AlertTriangle, Wallet, ShoppingBag, CheckCircle } from 'lucide-react'
import { formatCurrency, mealCutoffApproaching, mealCutoffLabel } from '../../../lib/utils'
import type { DashboardMeals, DashboardStats } from '../../../hooks/useDashboardData'

interface AlertBannersProps {
  mealsData: DashboardMeals
  stats: DashboardStats
  unpaidFixed: number
  isBazaarMan: boolean
  isManager?: boolean
  onQuickMealToggle: (tab: 'today' | 'tomorrow', type: 'lunch' | 'dinner') => void
}

export default function AlertBanners({ mealsData, stats, unpaidFixed, isBazaarMan, isManager = false, onQuickMealToggle }: AlertBannersProps) {
  // Cut-off reminder: only for *today* and only when the meal isn't already on
  const lunchLeft = !mealsData.today.lunch ? mealCutoffApproaching('lunch') : null
  const dinnerLeft = !mealsData.today.dinner ? mealCutoffApproaching('dinner') : null
  const banners: { type: 'lunch' | 'dinner'; minutes: number }[] = []
  if (lunchLeft !== null) banners.push({ type: 'lunch', minutes: lunchLeft })
  if (dinnerLeft !== null) banners.push({ type: 'dinner', minutes: dinnerLeft })

  const alertsList: { id: string; type: 'critical' | 'warning' | 'info'; element: React.ReactNode }[] = []

  // 1. Cutoff Alerts
  banners.forEach(b => {
    alertsList.push({
      id: `cutoff-${b.type}`,
      type: 'warning',
      element: (
        <div className="flex items-center justify-between gap-3 w-full">
          <div className="flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-nex-text">
                {b.type === 'lunch' ? 'Lunch' : 'Dinner'} Cut-off approaching ({b.minutes}m)
              </p>
              <p className="text-[10px] text-nex-muted truncate max-w-[200px] sm:max-w-xs">
                Locks at {mealCutoffLabel(b.type)}.
              </p>
            </div>
          </div>
          <button
            onClick={() => onQuickMealToggle('today', b.type)}
            className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-md shrink-0"
          >
            Mark On
          </button>
        </div>
      )
    })
  })

  // 2. Low Balance
  if (stats.balance < 0) {
    alertsList.push({
      id: 'low-balance',
      type: 'critical',
      element: (
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-nex-text">
              Low Balance ({formatCurrency(stats.balance)})
            </p>
            <p className="text-[10px] text-nex-muted">Please deposit funds soon.</p>
          </div>
        </div>
      )
    })
  }

  // 3. Unpaid Fixed Costs (Manager Only)
  if (unpaidFixed > 0 && isManager) {
    alertsList.push({
      id: 'fixed-costs',
      type: 'warning',
      element: (
        <div className="flex items-start gap-2.5">
          <Wallet className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-nex-text">
              {unpaidFixed} Unpaid Mess Bills
            </p>
            <p className="text-[10px] text-nex-muted">Fixed costs pending payment.</p>
          </div>
        </div>
      )
    })
  }

  // 4. Bazaar Duty
  if (isBazaarMan) {
    alertsList.push({
      id: 'bazaar-duty',
      type: 'info',
      element: (
        <div className="flex items-start gap-2.5">
          <ShoppingBag className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-nex-text">
              🛒 You're the Bazaar Man today!
            </p>
            <p className="text-[10px] text-nex-muted">Remember to log expenses.</p>
          </div>
        </div>
      )
    })
  }

  return (
    <div className="nex-card p-5 h-full flex flex-col justify-between min-h-[160px]">
      <div>
        <div className="flex items-center gap-2 mb-3 shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-nex-text">
            Mess Alerts
          </h4>
        </div>

        {alertsList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4 text-center shrink-0">
            <CheckCircle className="w-7 h-7 text-emerald-500 mb-1" />
            <p className="text-xs text-nex-muted font-medium">All systems normal. No alerts.</p>
          </div>
        ) : (
          <div className="space-y-3 mt-2 divide-y divide-nex-border">
            {alertsList.map((alert, idx) => (
              <div
                key={alert.id}
                className={`flex items-center justify-between w-full ${idx > 0 ? 'pt-3' : ''}`}
              >
                {alert.element}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
