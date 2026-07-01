import { useState } from 'react'
import { Plus, PiggyBank, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { formatCurrency } from '../../../lib/utils'
import EmptyState from '../../../components/EmptyState'
import type { Deposit, MessMember } from '../../../types/database'

interface DepositTabProps {
  deposits: Deposit[]
  approvedMembers: MessMember[]
  isManager: boolean
  onAddDeposit: (userId: string, amount: number, note: string) => Promise<void>
}

export default function DepositTab({ deposits, approvedMembers, isManager, onAddDeposit }: DepositTabProps) {
  const [showAddDeposit, setShowAddDeposit] = useState(false)
  const [depUserId, setDepUserId] = useState('')
  const [depAmount, setDepAmount] = useState('')
  const [depNote, setDepNote] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(depAmount)
    if (!amount || amount <= 0 || !depUserId) return
    setLoading(true)
    await onAddDeposit(depUserId, amount, depNote)
    setShowAddDeposit(false)
    setDepAmount('')
    setDepNote('')
    setDepUserId('')
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      {isManager && (
        <button onClick={() => setShowAddDeposit(!showAddDeposit)} className="nex-btn-primary text-sm">
          <Plus className="w-4 h-4" /> Record Deposit
        </button>
      )}

      {showAddDeposit && (
        <div className="nex-card p-5 animate-slide-up">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-nex-text mb-1">Member</label>
                <select value={depUserId} onChange={e => setDepUserId(e.target.value)} className="nex-input" required>
                  <option value="">Select member</option>
                  {approvedMembers.map(m => {
                    const p = m.profiles as any
                    return <option key={m.user_id} value={m.user_id}>{p?.username || 'Member'}</option>
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-nex-text mb-1">Amount (৳)</label>
                <input type="number" value={depAmount} onChange={e => setDepAmount(e.target.value)}
                  className="nex-input" placeholder="0.00" required step="0.01" min="0" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-nex-text mb-1">Note</label>
              <input type="text" value={depNote} onChange={e => setDepNote(e.target.value)} className="nex-input" placeholder="e.g., May deposit" />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={loading} className="nex-btn-primary disabled:opacity-50">Save</button>
              <button type="button" onClick={() => setShowAddDeposit(false)} className="nex-btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="nex-card divide-y divide-nex-border">
        {deposits.length === 0 ? (
          <EmptyState icon={PiggyBank} title="No deposits recorded" description="Deposits collected from mess members this month will show here." />
        ) : deposits.map(dep => (
          <div key={dep.id} className="flex items-center justify-between px-5 py-3 hover:bg-nex-hover transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <PiggyBank className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-nex-text">{(dep as any).profiles?.username}</p>
                <p className="text-xs text-nex-muted">{format(new Date(dep.date), 'MMM d')} {dep.note && `· ${dep.note}`}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-nex-success">{formatCurrency(Number(dep.amount))}</p>
              {dep.verified && <span className="text-xs text-nex-success flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" />Verified</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
