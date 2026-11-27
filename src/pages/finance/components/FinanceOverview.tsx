import { useTranslation } from 'react-i18next'
import { formatCurrency } from '../../../lib/utils'

interface FinanceOverviewProps {
  totalExpenses: number
  totalDeposits: number
  totalFixed: number
  messBalance: number
}

export default function FinanceOverview({
  totalExpenses,
  totalDeposits,
  totalFixed,
  messBalance,
}: FinanceOverviewProps) {
  const { t } = useTranslation()

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <div className="nex-card p-4 sm:p-5">
        <p className="text-nex-muted text-[11px] font-medium tracking-wider uppercase sm:text-xs">
          {t('finance.cards.totalDeposit')}
        </p>
        <p className="text-nex-success mt-1.5 text-lg font-bold tabular-nums sm:mt-2 sm:text-2xl">
          {formatCurrency(totalDeposits)}
        </p>
      </div>
      <div className="nex-card p-4 sm:p-5">
        <p className="text-nex-muted text-[11px] font-medium tracking-wider uppercase sm:text-xs">
          {t('finance.cards.totalBazaar')}
        </p>
        <p className="text-nex-text mt-1.5 text-lg font-bold tabular-nums sm:mt-2 sm:text-2xl">
          {formatCurrency(totalExpenses)}
        </p>
      </div>
      <div className="nex-card p-4 sm:p-5">
        <p className="text-nex-muted text-[11px] font-medium tracking-wider uppercase sm:text-xs">
          {t('finance.cards.totalFixed')}
        </p>
        <p className="text-nex-warning mt-1.5 text-lg font-bold tabular-nums sm:mt-2 sm:text-2xl">
          {formatCurrency(totalFixed)}
        </p>
      </div>
      <div className="nex-card p-4 sm:p-5">
        <p className="text-nex-muted text-[11px] font-medium tracking-wider uppercase sm:text-xs">
          {t('finance.cards.treasuryCash')}
        </p>
        <p
          className={`mt-1.5 text-lg font-bold tabular-nums sm:mt-2 sm:text-2xl ${messBalance >= 0 ? 'text-nex-success' : 'text-nex-danger'}`}
        >
          {formatCurrency(messBalance)}
        </p>
        <p className="text-nex-muted mt-1 text-[10px] leading-snug">{t('finance.cards.formula')}</p>
      </div>
    </div>
  )
}
