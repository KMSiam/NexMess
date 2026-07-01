import { ArrowRight } from 'lucide-react'
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
  return (
    <div className="nex-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <ArrowRight className="w-4 h-4 text-nex-success" />
        <h3 className="text-sm font-semibold text-nex-text">Settle Up</h3>
        <span className="text-xs text-nex-muted">— minimum payments to close the month</span>
      </div>
      {settlements.length === 0 ? (
        <p className="text-sm text-nex-muted">Everyone is squared up. No transfers needed.</p>
      ) : (
        <ul className="divide-y divide-nex-border">
          {settlements.map((t, idx) => (
            <li key={idx} className="flex items-center justify-between py-2.5 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium text-nex-danger truncate">{t.from}</span>
                <ArrowRight className="w-3.5 h-3.5 text-nex-muted flex-shrink-0" />
                <span className="font-medium text-nex-success truncate">{t.to}</span>
              </div>
              <span className="font-semibold text-nex-text whitespace-nowrap ml-3">{formatCurrency(t.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
