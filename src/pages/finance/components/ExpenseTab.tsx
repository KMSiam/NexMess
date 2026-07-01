import { useState } from 'react'
import { Plus, ImageIcon, Receipt, Edit2, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { formatCurrency } from '../../../lib/utils'
import EmptyState from '../../../components/EmptyState'
import ConfirmDialog from '../../../components/ConfirmDialog'
import type { Expense } from '../../../types/database'

interface ExpenseTabProps {
  expenses: Expense[]
  isManager: boolean
  onAddExpense: (amount: number, category: string, desc: string, file: File | null) => Promise<void>
  onUpdateExpense: (id: string, amount: number, category: string, desc: string) => Promise<void>
  onDeleteExpense: (id: string) => Promise<void>
}

export default function ExpenseTab({
  expenses,
  isManager,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
}: ExpenseTabProps) {
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)
  
  // Form State
  const [expAmount, setExpAmount] = useState('')
  const [expDesc, setExpDesc] = useState('')
  const [expCategory, setExpCategory] = useState('bazaar')
  const [expFile, setExpFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  // Delete State
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const amount = parseFloat(expAmount)
    if (!amount || amount <= 0) return
    setLoading(true)

    if (editingExpenseId) {
      await onUpdateExpense(editingExpenseId, amount, expCategory, expDesc)
      setEditingExpenseId(null)
    } else {
      await onAddExpense(amount, expCategory, expDesc, expFile)
    }

    setShowAddExpense(false)
    setExpAmount('')
    setExpDesc('')
    setExpFile(null)
    setLoading(false)
  }

  const startEdit = (exp: Expense) => {
    setEditingExpenseId(exp.id)
    setExpAmount(exp.amount.toString())
    setExpDesc(exp.description || '')
    setExpCategory(exp.category || 'bazaar')
    setShowAddExpense(true)
  }

  const handleCancel = () => {
    setShowAddExpense(false)
    setEditingExpenseId(null)
    setExpAmount('')
    setExpDesc('')
    setExpFile(null)
  }

  const confirmDelete = async () => {
    if (!deleteExpenseId) return
    setLoading(true)
    await onDeleteExpense(deleteExpenseId)
    setDeleteExpenseId(null)
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => {
          if (showAddExpense) handleCancel()
          else setShowAddExpense(true)
        }}
        className="nex-btn-primary text-sm"
      >
        <Plus className="w-4 h-4" /> {editingExpenseId ? 'Edit Expense' : 'Add Expense'}
      </button>

      {showAddExpense && (
        <div className="nex-card p-5 animate-slide-up">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-nex-text mb-1">Amount (৳)</label>
                <input
                  type="number"
                  value={expAmount}
                  onChange={e => setExpAmount(e.target.value)}
                  className="nex-input"
                  placeholder="0.00"
                  required
                  step="0.01"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-nex-text mb-1">Category</label>
                <select
                  value={expCategory}
                  onChange={e => setExpCategory(e.target.value)}
                  className="nex-input"
                >
                  <option value="bazaar">🛒 Bazaar</option>
                  <option value="utilities">💡 Utilities</option>
                  <option value="rent">🏠 Rent</option>
                  <option value="other">📋 Other</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-nex-text mb-1">Description</label>
              <input
                type="text"
                value={expDesc}
                onChange={e => setExpDesc(e.target.value)}
                className="nex-input"
                placeholder="e.g., Fish, vegetables"
              />
            </div>
            {!editingExpenseId && (
              <div>
                <label className="block text-sm font-medium text-nex-text mb-1">Receipt (optional)</label>
                <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-nex-border rounded-lg cursor-pointer hover:bg-nex-hover transition-colors">
                  <ImageIcon className="w-4 h-4 text-nex-muted" />
                  <span className="text-sm text-nex-muted">{expFile ? expFile.name : 'Upload receipt photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => setExpFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={loading} className="nex-btn-primary disabled:opacity-50">
                {editingExpenseId ? 'Update' : 'Save'}
              </button>
              <button type="button" onClick={handleCancel} className="nex-btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="nex-card divide-y divide-nex-border">
        {expenses.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No expenses recorded"
            description="All mess bazaar and utility logs for this month will show here."
          />
        ) : (
          expenses.map(exp => (
            <div key={exp.id} className="flex items-center justify-between px-5 py-3 hover:bg-nex-hover transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg ${
                  exp.category === 'bazaar' ? 'bg-emerald-500/10' : exp.category === 'rent' ? 'bg-blue-500/10' : 'bg-amber-500/10'
                }`}>
                  {exp.category === 'bazaar' ? '🛒' : exp.category === 'rent' ? '🏠' : exp.category === 'utilities' ? '💡' : '📋'}
                </div>
                <div>
                  <p className="text-sm font-medium text-nex-text flex items-center gap-2">
                    {exp.description || exp.category}
                    {exp.receipt_url && (
                      <a
                        href={exp.receipt_url}
                        target="_blank"
                        rel="noreferrer"
                        title="View Receipt"
                        className="text-nex-primary hover:text-blue-700 transition-colors"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </p>
                  <p className="text-xs text-nex-muted">{format(new Date(exp.date), 'MMM d')} · {(exp as any).profiles?.username}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold text-nex-text">{formatCurrency(Number(exp.amount))}</p>
                {isManager && (
                  <div className="flex items-center gap-1.5 ml-2 border-l border-nex-border pl-3">
                    <button
                      onClick={() => startEdit(exp)}
                      className="p-1 rounded-btn text-nex-muted hover:text-nex-primary hover:bg-nex-hover transition-colors"
                      title="Edit Expense"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteExpenseId(exp.id)}
                      className="p-1 rounded-btn text-nex-muted hover:text-nex-danger hover:bg-nex-hover transition-colors"
                      title="Delete Expense"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={deleteExpenseId !== null}
        title="Delete Expense"
        message="Are you sure you want to delete this expense? The calculations will be re-run automatically."
        confirmText="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteExpenseId(null)}
      />
    </div>
  )
}
