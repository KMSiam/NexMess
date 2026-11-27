import { useState, useEffect } from 'react'
import { Plus, ImageIcon, Receipt, Edit2, Trash2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatCurrency, formatLocalizedDate, isSafeHttpUrl } from '../../../lib/utils'
import EmptyState from '../../../components/EmptyState'
import ConfirmDialog from '../../../components/ConfirmDialog'
import type { Expense } from '../../../types/database'
import { getFinanceCategoryMeta } from './financeCategories'

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
  const { t } = useTranslation()
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
    setExpCategory('bazaar')
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
    setExpCategory('bazaar')
    setExpFile(null)
  }

  useEffect(() => {
    if (!showAddExpense) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showAddExpense])

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
        onClick={() => setShowAddExpense(true)}
        className="nex-btn-primary text-sm"
      >
        <Plus className="h-4 w-4" /> {t('finance.expenseModal.addTitle')}
      </button>

      {showAddExpense && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={handleCancel}
        >
          <div
            className="nex-card animate-slide-up w-full max-w-md rounded-b-none p-5 sm:rounded-b-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-nex-text text-lg font-semibold">
                {editingExpenseId
                  ? t('finance.expenseModal.editTitle')
                  : t('finance.expenseModal.addTitle')}
              </h3>
              <button
                type="button"
                onClick={handleCancel}
                className="text-nex-muted hover:text-nex-text rounded-lg p-1"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-nex-text mb-1 block text-sm font-medium">
                  {t('finance.expenseModal.amountLabel')}
                </label>
                <input
                  type="number"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  className="nex-input"
                  placeholder="0.00"
                  required
                  step="0.01"
                  min="0"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-nex-text mb-1 block text-sm font-medium">
                  {t('finance.expenseModal.descLabel')}
                </label>
                <input
                  type="text"
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  className="nex-input"
                  placeholder={t('finance.expenseModal.descPlaceholder')}
                />
              </div>
              {!editingExpenseId && (
                <div>
                  <label className="text-nex-text mb-1 block text-sm font-medium">
                    {t('finance.expenseModal.receiptLabel')}
                  </label>
                  <label className="border-nex-border hover:bg-nex-hover flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 py-2 transition-colors">
                    <ImageIcon className="text-nex-muted h-4 w-4 shrink-0" />
                    <span className="text-nex-muted truncate text-sm">
                      {expFile ? expFile.name : t('finance.expenseModal.uploadReceipt')}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => setExpFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="nex-btn-secondary flex-1"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="nex-btn-primary flex-1 disabled:opacity-50"
                >
                  {loading ? t('common.saving') : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="nex-card divide-nex-border divide-y">
        {expenses.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={t('finance.expenseModal.empty')}
            description={t('finance.expenseModal.emptyDesc')}
          />
        ) : (
          expenses.map((exp) => {
            const meta = getFinanceCategoryMeta(exp.category)
            const CategoryIcon = meta.icon
            return (
              <div
                key={exp.id}
                className="hover:bg-nex-hover flex items-center justify-between px-5 py-3 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.bgClass}`}
                  >
                    <CategoryIcon className={`h-4 w-4 ${meta.textClass}`} />
                  </div>
                <div>
                  <p className="text-nex-text flex items-center gap-2 text-sm font-medium">
                    {exp.description || t(`finance.categories.${exp.category}`, { defaultValue: exp.category })}
                    {exp.receipt_url && isSafeHttpUrl(exp.receipt_url) && (
                      <a
                        href={exp.receipt_url}
                        target="_blank"
                        rel="noreferrer"
                        title="View Receipt"
                        className="text-nex-primary-ink transition-colors hover:underline"
                      >
                        <Receipt className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </p>
                  <p className="text-nex-muted text-xs">
                    {formatLocalizedDate(exp.date, 'MMM d')} · {(exp as any).profiles?.username}
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
                      type="button"
                      onClick={() => startEdit(exp)}
                      className="rounded-btn text-nex-muted hover:text-nex-primary hover:bg-nex-hover p-1 transition-colors"
                      title={t('common.edit')}
                      aria-label={t('common.edit')}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteExpenseId(exp.id)}
                      className="rounded-btn text-nex-muted hover:text-nex-danger hover:bg-nex-hover p-1 transition-colors"
                      title={t('common.delete')}
                      aria-label={t('common.delete')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            )
          })
        )}
      </div>

      <ConfirmDialog
        open={deleteExpenseId !== null}
        title={t('common.delete')}
        message={t('finance.expenseModal.deleteConfirm')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteExpenseId(null)}
      />
    </div>
  )
}
