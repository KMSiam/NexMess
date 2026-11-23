import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatCurrency } from '../../../lib/utils'

interface Settlement {
  from: string
  to: string
  amount: number
}

interface SettleUpSheetProps {
  settlements: Settlement[]
}

export default function SettleUpSheet({ settlements }: SettleUpSheetProps) {
  const { t } = useTranslation()

  return (
    <div className="nex-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <ArrowRight className="text-nex-success h-4 w-4" />
        <h3 className="text-nex-text text-sm font-semibold">{t('finance.tabs.settleUp')}</h3>
        <span className="text-nex-muted text-xs">— {t('finance.settlement.title')}</span>
      </div>
      {settlements.length === 0 ? (
        <p className="text-nex-muted text-sm">{t('finance.settlement.allSettled')}</p>
      ) : (
        <ul className="divide-nex-border divide-y">
          {settlements.map((t, idx) => (
            <li key={idx} className="flex items-center justify-between py-2.5 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-nex-danger truncate font-medium">{t.from}</span>
                <ArrowRight className="text-nex-muted h-3.5 w-3.5 flex-shrink-0" />
                <span className="text-nex-success truncate font-medium">{t.to}</span>
              </div>
              <span className="text-nex-text ml-3 font-semibold whitespace-nowrap">
                {formatCurrency(t.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
