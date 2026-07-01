import { formatCurrency } from '../../../lib/utils'

interface FinanceOverviewProps {
  totalExpenses: number
  totalDeposits: number
  totalFixed: number
}

export default function FinanceOverview({ totalExpenses, totalDeposits, totalFixed }: FinanceOverviewProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="nex-card p-5">
        <p className="text-xs font-medium text-nex-muted uppercase tracking-wider">Total Bazaar</p>
        <p className="mt-2 text-2xl font-bold text-nex-text">{formatCurrency(totalExpenses)}</p>
      </div>
      <div className="nex-card p-5">
        <p className="text-xs font-medium text-nex-muted uppercase tracking-wider">Total Deposits</p>
        <p className="mt-2 text-2xl font-bold text-nex-success">{formatCurrency(totalDeposits)}</p>
      </div>
      <div className="nex-card p-5">
        <p className="text-xs font-medium text-nex-muted uppercase tracking-wider">Fixed Costs</p>
        <p className="mt-2 text-2xl font-bold text-amber-600">{formatCurrency(totalFixed)}</p>
      </div>
    </div>
  )
}
