import { useState } from 'react'
import { Plus, CheckCircle2, DollarSign } from 'lucide-react'
import { format } from 'date-fns'
import { formatCurrency } from '../../../lib/utils'
import EmptyState from '../../../components/EmptyState'
import type { FixedCost } from '../../../types/database'

interface FixedCostTabProps {
  fixedCosts: FixedCost[]
  isManager: boolean
  onAddFixedCost: (category: string, amount: number, label: string, editId: string | null) => Promise<void>
  onMarkPaid: (id: string) => Promise<void>
}

export default function FixedCostTab({ fixedCosts, isManager, onAddFixedCost, onMarkPaid }: FixedCostTabProps) {
  const [showAddFixed, setShowAddFixed] = useState(false)
  const [editFixedCostId, setEditFixedCostId] = useState<string | null>(null)
  const [fixCategory, setFixCategory] = useState('rent')
  const [fixAmount, setFixAmount] = useState('')
  const [fixLabel, setFixLabel] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(fixAmount)
    if (!amount || amount <= 0) return
    setLoading(true)
    await onAddFixedCost(fixCategory, amount, fixLabel, editFixedCostId)
    setShowAddFixed(false)
    setFixAmount('')
    setFixLabel('')
    setFixCategory('rent')
    setEditFixedCostId(null)
    setLoading(false)
  }

  const startEdit = (fc: FixedCost) => {
    setFixCategory(fc.category)
    setFixAmount(fc.amount.toString())
    setFixLabel(fc.label || '')
    setEditFixedCostId(fc.id)
    setShowAddFixed(true)
  }

  const handleCancel = () => {
    setShowAddFixed(false)
    setEditFixedCostId(null)
    setFixCategory('rent')
    setFixAmount('')
    setFixLabel('')
  }

  const icons: Record<string, string> = { rent: '🏠', utilities: '💡', maid: '🧹', internet: '🌐', gas: '🔥', other: '📋' }

  return (
    <div className="space-y-4">
      {isManager && (
        <button onClick={() => setShowAddFixed(!showAddFixed)} className="nex-btn-primary text-sm">
          <Plus className="w-4 h-4" /> Add Fixed Cost
        </button>
      )}

      {showAddFixed && (
        <div className="nex-card p-5 animate-slide-up">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-nex-text mb-1">Category</label>
                <select value={fixCategory} onChange={e => setFixCategory(e.target.value)} className="nex-input">
                  <option value="rent">🏠 Rent</option>
                  <option value="utilities">💡 Utilities</option>
                  <option value="maid">🧹 Maid</option>
                  <option value="internet">🌐 Internet</option>
                  <option value="gas">🔥 Gas</option>
                  <option value="other">📋 Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-nex-text mb-1">Amount (৳)</label>
                <input type="number" value={fixAmount} onChange={e => setFixAmount(e.target.value)}
                  className="nex-input" placeholder="0.00" required step="0.01" min="0" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-nex-text mb-1">Label (optional)</label>
              <input type="text" value={fixLabel} onChange={e => setFixLabel(e.target.value)} className="nex-input" placeholder="e.g., Electric bill May" />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={loading} className="nex-btn-primary disabled:opacity-50">{editFixedCostId ? 'Update' : 'Save'}</button>
              <button type="button" onClick={handleCancel} className="nex-btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="nex-card divide-y divide-nex-border">
        {fixedCosts.length === 0 ? (
          <EmptyState icon={DollarSign} title="No fixed costs listed" description={`All fixed costs for ${format(new Date(), 'MMMM yyyy')} will show here.`} />
        ) : fixedCosts.map(fc => (
          <div key={fc.id} className="flex items-center justify-between px-5 py-3 hover:bg-nex-hover transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-lg">{icons[fc.category] || '📋'}</span>
              <div>
                <p className="text-sm font-medium text-nex-text capitalize">{fc.label || fc.category}</p>
                <p className="text-xs text-nex-muted">{fc.month}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <p className="text-sm font-semibold text-amber-600">{formatCurrency(Number(fc.amount))}</p>
              {fc.is_paid ? (
                <span className="text-xs text-nex-success flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" />Paid</span>
              ) : isManager && (
                <div className="flex gap-2 mt-1">
                  <button onClick={() => startEdit(fc)} className="text-xs font-medium text-nex-primary hover:text-blue-700 transition-colors">Edit</button>
                  <button onClick={() => onMarkPaid(fc.id)} className="text-xs font-medium text-emerald-600 hover:text-emerald-800 transition-colors flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" /> Mark Paid</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
