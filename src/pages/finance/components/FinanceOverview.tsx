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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="nex-card p-5">
        <p className="text-nex-muted text-xs font-medium tracking-wider uppercase">
          {t('finance.cards.totalDeposit')}
        </p>
        <p className="text-nex-success mt-2 text-2xl font-bold">{formatCurrency(totalDeposits)}</p>
      </div>
      <div className="nex-card p-5">
        <p className="text-nex-muted text-xs font-medium tracking-wider uppercase">
          {t('finance.cards.totalBazaar')}
        </p>
        <p className="text-nex-text mt-2 text-2xl font-bold">{formatCurrency(totalExpenses)}</p>
      </div>
      <div className="nex-card p-5">
        <p className="text-nex-muted text-xs font-medium tracking-wider uppercase">
          {t('finance.cards.totalFixed')}
        </p>
        <p className="mt-2 text-2xl font-bold text-amber-600">{formatCurrency(totalFixed)}</p>
      </div>
      <div className="nex-card p-5">
        <p className="text-nex-muted text-xs font-medium tracking-wider uppercase">
          {t('finance.cards.treasuryCash')}
        </p>
        <p
          className={`mt-2 text-2xl font-bold ${messBalance >= 0 ? 'text-nex-success' : 'text-red-500'}`}
        >
          {formatCurrency(messBalance)}
        </p>
        <p className="text-nex-muted mt-1 text-[10px]">{t('finance.cards.formula')}</p>
      </div>
    </div>
  )
}
