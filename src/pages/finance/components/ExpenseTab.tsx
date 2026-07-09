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

  const [expAmount, setExpAmount] = useState('')
  const [expDesc, setExpDesc] = useState('')
  const [expCategory, setExpCategory] = useState('bazaar')
  const [expFile, setExpFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

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
        <Plus className="h-4 w-4" /> {editingExpenseId ? 'Edit Expense' : 'Add Expense'}
      </button>

      {showAddExpense && (
        <div className="nex-card animate-slide-up p-5">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-nex-text mb-1 block text-sm font-medium">Amount (৳)</label>
                <input
                  type="number"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  className="nex-input"
                  placeholder="0.00"
                  required
                  step="0.01"
                  min="0"
                />
              </div>
              <div>
                <label className="text-nex-text mb-1 block text-sm font-medium">Category</label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
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
              <label className="text-nex-text mb-1 block text-sm font-medium">Description</label>
              <input
                type="text"
                value={expDesc}
                onChange={(e) => setExpDesc(e.target.value)}
                className="nex-input"
                placeholder="e.g., Fish, vegetables"
              />
            </div>
            {!editingExpenseId && (
              <div>
                <label className="text-nex-text mb-1 block text-sm font-medium">
                  Receipt (optional)
                </label>
                <label className="border-nex-border hover:bg-nex-hover flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 py-2 transition-colors">
                  <ImageIcon className="text-nex-muted h-4 w-4" />
                  <span className="text-nex-muted text-sm">
                    {expFile ? expFile.name : 'Upload receipt photo'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setExpFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="nex-btn-primary disabled:opacity-50"
              >
                {editingExpenseId ? 'Update' : 'Save'}
              </button>
              <button type="button" onClick={handleCancel} className="nex-btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="nex-card divide-nex-border divide-y">
        {expenses.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No expenses recorded"
            description="All mess bazaar and utility logs for this month will show here."
          />
        ) : (
          expenses.map((exp) => (
            <div
              key={exp.id}
              className="hover:bg-nex-hover flex items-center justify-between px-5 py-3 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg ${
                    exp.category === 'bazaar'
                      ? 'bg-emerald-500/10'
                      : exp.category === 'rent'
                        ? 'bg-blue-500/10'
                        : 'bg-amber-500/10'
                  }`}
                >
                  {exp.category === 'bazaar'
                    ? '🛒'
                    : exp.category === 'rent'
                      ? '🏠'
                      : exp.category === 'utilities'
                        ? '💡'
                        : '📋'}
                </div>
                <div>
                  <p className="text-nex-text flex items-center gap-2 text-sm font-medium">
                    {exp.description || exp.category}
                    {exp.receipt_url && (
                      <a
                        href={exp.receipt_url}
                        target="_blank"
                        rel="noreferrer"
                        title="View Receipt"
                        className="text-nex-primary transition-colors hover:text-blue-700"
                      >
                        <Receipt className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </p>
                  <p className="text-nex-muted text-xs">
                    {format(new Date(exp.date), 'MMM d')} · {(exp as any).profiles?.username}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-nex-text text-sm font-semibold">
                  {formatCurrency(Number(exp.amount))}
                </p>
                {isManager && (
                  <div className="border-nex-border ml-2 flex items-center gap-1.5 border-l pl-3">
                    <button
                      onClick={() => startEdit(exp)}
                      className="rounded-btn text-nex-muted hover:text-nex-primary hover:bg-nex-hover p-1 transition-colors"
                      title="Edit Expense"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteExpenseId(exp.id)}
                      className="rounded-btn text-nex-muted hover:text-nex-danger hover:bg-nex-hover p-1 transition-colors"
                      title="Delete Expense"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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
