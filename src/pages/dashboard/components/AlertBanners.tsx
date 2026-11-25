import { Clock, AlertTriangle, Wallet, ShoppingBag, CheckCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatCurrency, formatNumber, mealCutoffApproaching, mealCutoffLabel } from '../../../lib/utils'
import type { DashboardMeals, DashboardStats } from '../../../hooks/useDashboardData'

interface AlertBannersProps {
  mealsData: DashboardMeals
  stats: DashboardStats
  unpaidFixed: number
  isBazaarMan: boolean
  isManager?: boolean
  onQuickMealToggle: (tab: 'today' | 'tomorrow', type: 'lunch' | 'dinner') => void
}

export default function AlertBanners({
  mealsData,
  stats,
  unpaidFixed,
  isBazaarMan,
  isManager = false,
  onQuickMealToggle,
}: AlertBannersProps) {
  const { t } = useTranslation()
  // Cut-off reminder: only for *today* and only when the meal isn't already on
  const lunchLeft = !mealsData.today.lunch ? mealCutoffApproaching('lunch') : null
  const dinnerLeft = !mealsData.today.dinner ? mealCutoffApproaching('dinner') : null
  const banners: { type: 'lunch' | 'dinner'; minutes: number }[] = []
  if (lunchLeft !== null) banners.push({ type: 'lunch', minutes: lunchLeft })
  if (dinnerLeft !== null) banners.push({ type: 'dinner', minutes: dinnerLeft })

  const alertsList: {
    id: string
    type: 'critical' | 'warning' | 'info'
    element: React.ReactNode
  }[] = []

  // 1. Cutoff Alerts
  banners.forEach((b) => {
    alertsList.push({
      id: `cutoff-${b.type}`,
      type: 'warning',
      element: (
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <div className="min-w-0">
              <p className="text-nex-text text-xs font-semibold">
                {b.type === 'lunch'
                  ? t('alerts.lunchApproaching', { minutes: formatNumber(b.minutes) })
                  : t('alerts.dinnerApproaching', { minutes: formatNumber(b.minutes) })}
              </p>
              <p className="text-nex-muted max-w-[200px] truncate text-[10px] sm:max-w-xs">
                {t('alerts.locksAt', { time: mealCutoffLabel(b.type) })}
              </p>
            </div>
          </div>
          <button
            onClick={() => onQuickMealToggle('today', b.type)}
            className="shrink-0 rounded-md bg-amber-500/10 px-2 py-1 text-[10px] font-bold tracking-wider text-amber-600 uppercase hover:bg-amber-500/20 dark:text-amber-400"
          >
            {t('alerts.markOn')}
          </button>
        </div>
      ),
    })
  })

  // 2. Low Balance
  if (stats.balance < 0) {
    alertsList.push({
      id: 'low-balance',
      type: 'critical',
      element: (
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <div>
            <p className="text-nex-text text-xs font-semibold">
              {t('alerts.lowBalance', { amount: formatCurrency(stats.balance) })}
            </p>
            <p className="text-nex-muted text-[10px]">{t('alerts.depositSoon')}</p>
          </div>
        </div>
      ),
    })
  }

  // 3. Unpaid Fixed Costs (Manager Only)
  if (unpaidFixed > 0 && isManager) {
    alertsList.push({
      id: 'fixed-costs',
      type: 'warning',
      element: (
        <div className="flex items-start gap-2.5">
          <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
          <div>
            <p className="text-nex-text text-xs font-semibold">
              {t('alerts.unpaidBills', { count: formatNumber(unpaidFixed) })}
            </p>
            <p className="text-nex-muted text-[10px]">{t('alerts.fixedCostsPending')}</p>
          </div>
        </div>
      ),
    })
  }

  // 4. Bazaar Duty
  if (isBazaarMan) {
    alertsList.push({
      id: 'bazaar-duty',
      type: 'info',
      element: (
        <div className="flex items-start gap-2.5">
          <ShoppingBag className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          <div>
            <p className="text-nex-text text-xs font-semibold">{t('alerts.bazaarDuty')}</p>
            <p className="text-nex-muted text-[10px]">{t('alerts.rememberLog')}</p>
          </div>
        </div>
      ),
    })
  }

  return (
    <div className="nex-card flex h-full min-h-[160px] flex-col justify-between p-5">
      <div>
        <div className="mb-3 flex shrink-0 items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
          <h4 className="text-nex-text text-xs font-bold tracking-wider uppercase">
            {t('alerts.title')}
          </h4>
        </div>

        {alertsList.length === 0 ? (
          <div className="flex shrink-0 flex-col items-center justify-center py-4 text-center">
            <CheckCircle className="mb-1 h-7 w-7 text-emerald-500" />
            <p className="text-nex-muted text-xs font-medium">{t('alerts.allNormal')}</p>
          </div>
        ) : (
          <div className="divide-nex-border mt-2 space-y-3 divide-y">
            {alertsList.map((alert, idx) => (
              <div
                key={alert.id}
                className={`flex w-full items-center justify-between ${idx > 0 ? 'pt-3' : ''}`}
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
