import { useTranslation } from 'react-i18next'
import { formatCurrency } from '../../../lib/utils'
import type { DashboardStats } from '../../../hooks/useDashboardData'

interface StatsGridProps {
  stats: DashboardStats
}

export default function StatsGrid({ stats }: StatsGridProps) {
  const { t } = useTranslation()

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div className="nex-card p-4 text-center">
        <p className="text-nex-muted text-xs font-medium tracking-wider uppercase">
          {t('dashboard.stats.myMeals')}
        </p>
        <p className="text-nex-text mt-1 text-xl font-bold">{stats.totalMeals}</p>
      </div>
      <div className="nex-card p-4 text-center">
        <p className="text-nex-muted text-xs font-medium tracking-wider uppercase">
          {t('dashboard.stats.balance')}
        </p>
        <p
          className={`mt-1 text-xl font-bold ${stats.balance >= 0 ? 'text-nex-success' : 'text-red-500'}`}
        >
          {formatCurrency(stats.balance)}
        </p>
      </div>
      <div className="nex-card p-4 text-center">
        <p className="text-nex-muted text-xs font-medium tracking-wider uppercase">
          {t('dashboard.stats.mealRate')}
        </p>
        <p className="text-nex-text mt-1 text-xl font-bold">{formatCurrency(stats.mealRate)}</p>
      </div>
      <div className="nex-card p-4 text-center">
        <p className="text-nex-muted text-xs font-medium tracking-wider uppercase">
          {t('dashboard.stats.messSpent')}
        </p>
        <p className="mt-1 text-xl font-bold text-amber-600">
          {formatCurrency(stats.messTotalSpent)}
        </p>
      </div>
    </div>
  )
}
