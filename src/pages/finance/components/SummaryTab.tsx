import { getInitials, formatCurrency } from '../../../lib/utils'
import type { MessMember } from '../../../types/database'

interface SummaryTabProps {
  financeMembers: MessMember[]
  balances: Record<string, any>
  totalFixed: number
}

export default function SummaryTab({ financeMembers, balances, totalFixed }: SummaryTabProps) {
  return (
    <div className="nex-card divide-nex-border divide-y overflow-x-auto">
      {/* Desktop Table Header */}
      <div className="bg-nex-elevated hidden min-w-[480px] px-5 py-3 sm:block">
        <div className="text-nex-muted grid grid-cols-7 gap-2 text-xs font-semibold tracking-wider uppercase">
          <span className="col-span-2">Member</span>
          <span className="text-right">Meals</span>
          <span className="text-right">Meal Cost</span>
          <span className="text-right">Other Cost</span>
          <span className="text-right">Deposited</span>
          <span className="text-right">Balance</span>
        </div>
      </div>

      {financeMembers.map((member) => {
        const p = member.profiles as any
        const b = balances[member.user_id] || {}
        const mealCost = Number(b.individual_cost || 0)
        const perPersonFixedCost =
          financeMembers.length > 0 ? totalFixed / financeMembers.length : 0
        const totalExp = mealCost + perPersonFixedCost
        const deposited = Number(b.total_deposits || 0)
        const realBalance = deposited - totalExp

        return (
          <div
            key={member.user_id}
            className="hover:bg-nex-hover px-4 py-3 transition-colors sm:px-5"
          >
            {/* Desktop Row */}
            <div className="hidden grid-cols-7 items-center gap-2 sm:grid">
              <div className="col-span-2 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-xs font-semibold text-white">
                  {getInitials(p?.username || '?')}
                </div>
                <span className="text-nex-text truncate text-sm font-medium">
                  {p?.username || 'Member'}
                  {member.status === 'left' && (
                    <span className="ml-2 rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-red-500 uppercase">
                      Left
                    </span>
                  )}
                </span>
              </div>
              <p className="text-nex-text text-right text-sm">{b.personal_meals || 0}</p>
              <p className="text-nex-text text-right text-sm">{formatCurrency(mealCost)}</p>
              <p className="text-nex-text text-right text-sm">
                {formatCurrency(perPersonFixedCost)}
              </p>
              <p className="text-nex-success text-right text-sm">{formatCurrency(deposited)}</p>
              <p
                className={`text-right text-sm font-semibold ${realBalance >= 0 ? 'text-nex-success' : 'text-nex-danger'}`}
              >
                {formatCurrency(realBalance)}
              </p>
            </div>
            {/* Mobile Card */}
            <div className="sm:hidden">
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-xs font-semibold text-white">
                  {getInitials(p?.username || '?')}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-nex-text flex items-center gap-2 truncate text-sm font-medium">
                    {p?.username || 'Member'}
                    {member.status === 'left' && (
                      <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-xs font-bold tracking-wider text-red-500 uppercase">
                        Left
                      </span>
                    )}
                  </p>
                  <p className="text-nex-muted text-xs">{b.personal_meals || 0} meals</p>
                </div>
                <p
                  className={`text-sm font-bold ${realBalance >= 0 ? 'text-nex-success' : 'text-nex-danger'}`}
                >
                  {formatCurrency(realBalance)}
                </p>
              </div>
              <div className="ml-12 grid grid-cols-2 gap-2">
                <div className="text-nex-muted text-xs">
                  Meal Cost:{' '}
                  <span className="text-nex-text font-medium">{formatCurrency(mealCost)}</span>
                </div>
                <div className="text-nex-muted text-xs">
                  Other Cost:{' '}
                  <span className="text-nex-text font-medium">
                    {formatCurrency(perPersonFixedCost)}
                  </span>
                </div>
                <div className="text-nex-muted col-span-2 text-xs">
                  Deposited:{' '}
                  <span className="text-nex-success font-medium">{formatCurrency(deposited)}</span>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
