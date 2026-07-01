import { formatCurrency } from '../../../lib/utils'
import type { DashboardStats } from '../../../hooks/useDashboardData'

interface StatsGridProps {
  stats: DashboardStats
}

export default function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div className="nex-card p-4 text-center">
        <p className="text-xs font-medium text-nex-muted uppercase tracking-wider">My Meals</p>
        <p className="mt-1 text-xl font-bold text-nex-text">{stats.totalMeals}</p>
      </div>
      <div className="nex-card p-4 text-center">
        <p className="text-xs font-medium text-nex-muted uppercase tracking-wider">Balance</p>
        <p className={`mt-1 text-xl font-bold ${stats.balance >= 0 ? 'text-nex-success' : 'text-red-500'}`}>{formatCurrency(stats.balance)}</p>
      </div>
      <div className="nex-card p-4 text-center">
        <p className="text-xs font-medium text-nex-muted uppercase tracking-wider">Meal Rate</p>
        <p className="mt-1 text-xl font-bold text-nex-text">{formatCurrency(stats.mealRate)}</p>
      </div>
      <div className="nex-card p-4 text-center">
        <p className="text-xs font-medium text-nex-muted uppercase tracking-wider">Mess Spent</p>
        <p className="mt-1 text-xl font-bold text-amber-600">{formatCurrency(stats.messTotalSpent)}</p>
      </div>
    </div>
  )
}
