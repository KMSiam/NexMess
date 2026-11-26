import { useMemo } from 'react'
import { PieChart } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { computeSpendingBreakdown } from '../../../lib/spending'
import { formatCurrency, formatNumber } from '../../../lib/utils'
import type { Expense, FixedCost } from '../../../types/database'

interface SpendingBreakdownProps {
  expenses: Expense[]
  fixedCosts: FixedCost[]
  totalDeposits: number
}

export default function SpendingBreakdown({
  expenses,
  fixedCosts,
  totalDeposits,
}: SpendingBreakdownProps) {
  const { t } = useTranslation()

  const breakdown = useMemo(
    () => computeSpendingBreakdown(expenses, fixedCosts, totalDeposits),
    [expenses, fixedCosts, totalDeposits]
  )

  const clampedBarPercent = Math.min(100, Math.max(0, breakdown.depositUtilizationPercent))

  return (
    <div className="nex-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PieChart className="text-nex-primary h-4 w-4" />
          <h3 className="text-nex-text text-sm font-semibold">
            {t('finance.breakdown.title')}
          </h3>
        </div>
        <div className="text-right">
          <span className="text-nex-muted text-xs">{t('finance.breakdown.totalSpent')}: </span>
          <span className="text-nex-text text-sm font-bold tabular-nums">
            {formatCurrency(breakdown.totalOutflow)}
          </span>
        </div>
      </div>

      {breakdown.slices.length === 0 ? (
        <p className="text-nex-muted py-4 text-center text-xs">
          {t('finance.breakdown.empty')}
        </p>
      ) : (
        <div className="space-y-4">
          {/* Category Segmented Bar */}
          <div>
            <div
              className="bg-nex-elevated flex h-3 w-full overflow-hidden rounded-full"
              role="img"
              aria-label={t('finance.breakdown.title')}
            >
              {breakdown.slices.map((slice) => (
                <div
                  key={slice.category}
                  className={`${slice.colorClass} h-full transition-all duration-300`}
                  style={{ width: `${Math.max(slice.percent, 2)}%` }}
                  title={`${t(`finance.categories.${slice.category}`)}: ${formatCurrency(slice.amount)} (${formatNumber(slice.percent)}%)`}
                />
              ))}
            </div>
          </div>

          {/* Category Breakdown List */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {breakdown.slices.map((slice) => (
              <div
                key={slice.category}
                className="bg-nex-elevated/60 border-nex-border/60 flex items-center justify-between rounded-xl border px-3 py-2 text-xs"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${slice.dotClass}`} />
                  <span className="text-nex-text truncate font-medium">
                    {t(`finance.categories.${slice.category}`)}
                  </span>
                </div>
                <div className="ml-2 flex shrink-0 items-baseline gap-1.5 tabular-nums">
                  <span className="text-nex-text font-semibold">{formatCurrency(slice.amount)}</span>
                  <span className="text-nex-muted text-[11px]">
                    ({formatNumber(slice.percent)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Deposit Pool Utilization & Variable vs Fixed Comparison */}
          <div className="border-nex-border/70 grid grid-cols-1 gap-3 border-t pt-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-nex-muted">{t('finance.breakdown.budgetUsage')}</span>
                <span
                  className={`font-semibold tabular-nums ${
                    breakdown.isOverBudget ? 'text-nex-danger' : 'text-nex-text'
                  }`}
                >
                  {formatNumber(breakdown.depositUtilizationPercent)}%
                  {breakdown.totalDeposits > 0 && (
                    <span className="text-nex-muted font-normal">
                      {' '}
                      / {formatCurrency(breakdown.totalDeposits)}
                    </span>
                  )}
                </span>
              </div>
              <div className="bg-nex-elevated h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    breakdown.isOverBudget ? 'bg-nex-danger' : 'bg-nex-primary'
                  }`}
                  style={{ width: `${clampedBarPercent}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 text-xs sm:justify-end">
              <div className="bg-nex-elevated rounded-lg px-2.5 py-1.5">
                <span className="text-nex-muted">{t('finance.breakdown.variableExpenses')}: </span>
                <span className="text-nex-text font-semibold tabular-nums">
                  {formatCurrency(breakdown.totalVariable)}
                </span>
              </div>
              <div className="bg-nex-elevated rounded-lg px-2.5 py-1.5">
                <span className="text-nex-muted">{t('finance.breakdown.fixedBills')}: </span>
                <span className="text-nex-text font-semibold tabular-nums">
                  {formatCurrency(breakdown.totalFixed)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
