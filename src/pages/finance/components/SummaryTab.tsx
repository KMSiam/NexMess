import { getInitials, formatCurrency } from '../../../lib/utils'
import type { MessMember } from '../../../types/database'

interface SummaryTabProps {
  financeMembers: MessMember[]
  balances: Record<string, any>
  totalFixed: number
}

export default function SummaryTab({ financeMembers, balances, totalFixed }: SummaryTabProps) {
  return (
    <div className="nex-card divide-y divide-nex-border overflow-x-auto">
      {/* Desktop Table Header */}
      <div className="hidden sm:block px-5 py-3 bg-nex-elevated min-w-[480px]">
        <div className="grid grid-cols-7 gap-2 text-xs font-semibold text-nex-muted uppercase tracking-wider">
          <span className="col-span-2">Member</span>
          <span className="text-right">Meals</span>
          <span className="text-right">Meal Cost</span>
          <span className="text-right">Other Cost</span>
          <span className="text-right">Deposited</span>
          <span className="text-right">Balance</span>
        </div>
      </div>

      {financeMembers.map(member => {
        const p = member.profiles as any
        const b = balances[member.user_id] || {}
        const mealCost = Number(b.individual_cost || 0)
        const perPersonFixedCost = financeMembers.length > 0 ? totalFixed / financeMembers.length : 0
        const totalExp = mealCost + perPersonFixedCost
        const deposited = Number(b.total_deposits || 0)
        const realBalance = deposited - totalExp

        return (
          <div key={member.user_id} className="px-4 sm:px-5 py-3 hover:bg-nex-hover transition-colors">
            {/* Desktop Row */}
            <div className="hidden sm:grid grid-cols-7 gap-2 items-center">
              <div className="col-span-2 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                  {getInitials(p?.username || '?')}
                </div>
                <span className="text-sm font-medium text-nex-text truncate">
                  {p?.username || 'Member'}
                  {member.status === 'left' && <span className="ml-2 text-[10px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Left</span>}
                </span>
              </div>
              <p className="text-sm text-nex-text text-right">{b.personal_meals || 0}</p>
              <p className="text-sm text-nex-text text-right">{formatCurrency(mealCost)}</p>
              <p className="text-sm text-nex-text text-right">{formatCurrency(perPersonFixedCost)}</p>
              <p className="text-sm text-nex-success text-right">{formatCurrency(deposited)}</p>
              <p className={`text-sm font-semibold text-right ${realBalance >= 0 ? 'text-nex-success' : 'text-nex-danger'}`}>
                {formatCurrency(realBalance)}
              </p>
            </div>
            {/* Mobile Card */}
            <div className="sm:hidden">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                  {getInitials(p?.username || '?')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-nex-text truncate flex items-center gap-2">
                    {p?.username || 'Member'}
                    {member.status === 'left' && <span className="text-xs bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Left</span>}
                  </p>
                  <p className="text-xs text-nex-muted">{b.personal_meals || 0} meals</p>
                </div>
                <p className={`text-sm font-bold ${realBalance >= 0 ? 'text-nex-success' : 'text-nex-danger'}`}>
                  {formatCurrency(realBalance)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 ml-12">
                <div className="text-xs text-nex-muted">Meal Cost: <span className="font-medium text-nex-text">{formatCurrency(mealCost)}</span></div>
                <div className="text-xs text-nex-muted">Other Cost: <span className="font-medium text-nex-text">{formatCurrency(perPersonFixedCost)}</span></div>
                <div className="text-xs text-nex-muted col-span-2">Deposited: <span className="font-medium text-nex-success">{formatCurrency(deposited)}</span></div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
