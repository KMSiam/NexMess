import { formatCurrency } from '../../../lib/utils'
import type { DashboardStats } from '../../../hooks/useDashboardData'

interface StatsGridProps {
  stats: DashboardStats
}

export default function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div className="nex-card p-4 text-center">
        <p className="text-nex-muted text-xs font-medium tracking-wider uppercase">My Meals</p>
        <p className="text-nex-text mt-1 text-xl font-bold">{stats.totalMeals}</p>
      </div>
      <div className="nex-card p-4 text-center">
        <p className="text-nex-muted text-xs font-medium tracking-wider uppercase">Balance</p>
        <p
          className={`mt-1 text-xl font-bold ${stats.balance >= 0 ? 'text-nex-success' : 'text-red-500'}`}
        >
          {formatCurrency(stats.balance)}
        </p>
      </div>
      <div className="nex-card p-4 text-center">
        <p className="text-nex-muted text-xs font-medium tracking-wider uppercase">Meal Rate</p>
        <p className="text-nex-text mt-1 text-xl font-bold">{formatCurrency(stats.mealRate)}</p>
      </div>
      <div className="nex-card p-4 text-center">
        <p className="text-nex-muted text-xs font-medium tracking-wider uppercase">Mess Spent</p>
        <p className="mt-1 text-xl font-bold text-amber-600">
          {formatCurrency(stats.messTotalSpent)}
        </p>
      </div>
    </div>
  )
}
