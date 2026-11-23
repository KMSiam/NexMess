import { useState } from 'react'
import { Plus, CheckCircle2, DollarSign, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatCurrency } from '../../../lib/utils'
import EmptyState from '../../../components/EmptyState'
import type { FixedCost } from '../../../types/database'

interface FixedCostTabProps {
  fixedCosts: FixedCost[]
  isManager: boolean
  onAddFixedCost: (
    category: string,
    amount: number,
    label: string,
    editId: string | null
  ) => Promise<void>
  onMarkPaid: (id: string) => Promise<void>
  onDeleteFixedCost: (id: string) => Promise<void>
}

export default function FixedCostTab({
  fixedCosts,
  isManager,
  onAddFixedCost,
  onMarkPaid,
  onDeleteFixedCost,
}: FixedCostTabProps) {
  const { t } = useTranslation()
  const [showAddFixed, setShowAddFixed] = useState(false)
  const [editFixedCostId, setEditFixedCostId] = useState<string | null>(null)
  const [fixCategory, setFixCategory] = useState('rent')
  const [fixAmount, setFixAmount] = useState('')
  const [fixLabel, setFixLabel] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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

  const icons: Record<string, string> = {
    rent: '🏠',
    utilities: '💡',
    maid: '🧹',
    internet: '🌐',
    gas: '🔥',
    other: '📋',
  }

  return (
    <div className="space-y-4">
      {isManager && (
        <button onClick={() => setShowAddFixed(!showAddFixed)} className="nex-btn-primary text-sm">
          <Plus className="h-4 w-4" />{' '}
          {editFixedCostId
            ? t('finance.fixedModal.editTitle')
            : t('finance.fixedModal.addTitle')}
        </button>
      )}

      {showAddFixed && (
        <div className="nex-card animate-slide-up p-5">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-nex-text mb-1 block text-sm font-medium">
                  {t('finance.fixedModal.categoryLabel')}
                </label>
                <select
                  value={fixCategory}
                  onChange={(e) => setFixCategory(e.target.value)}
                  className="nex-input"
                >
                  <option value="rent">🏠 {t('finance.categories.rent')}</option>
                  <option value="utilities">💡 {t('finance.categories.utilities')}</option>
                  <option value="maid">🧹 {t('finance.categories.maid')}</option>
                  <option value="internet">🌐 {t('finance.categories.internet')}</option>
                  <option value="gas">🔥 {t('finance.categories.gas')}</option>
                  <option value="other">📋 {t('finance.categories.other')}</option>
                </select>
              </div>
              <div>
                <label className="text-nex-text mb-1 block text-sm font-medium">
                  {t('finance.fixedModal.amountLabel')}
                </label>
                <input
                  type="number"
                  value={fixAmount}
                  onChange={(e) => setFixAmount(e.target.value)}
                  className="nex-input"
                  placeholder="0.00"
                  required
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
            <div>
              <label className="text-nex-text mb-1 block text-sm font-medium">
                {t('finance.fixedModal.labelLabel')}
              </label>
              <input
                type="text"
                value={fixLabel}
                onChange={(e) => setFixLabel(e.target.value)}
                className="nex-input"
                placeholder={t('finance.fixedModal.labelPlaceholder')}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="nex-btn-primary disabled:opacity-50"
              >
                {t('common.save')}
              </button>
              <button type="button" onClick={handleCancel} className="nex-btn-secondary">
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="nex-card divide-nex-border divide-y">
        {fixedCosts.length === 0 ? (
          <EmptyState
            icon={DollarSign}
            title={t('finance.fixedModal.empty')}
            description={t('finance.fixedModal.emptyDesc')}
          />
        ) : (
          fixedCosts.map((fc) => (
            <div
              key={fc.id}
              className="hover:bg-nex-hover flex items-center justify-between px-5 py-3 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{icons[fc.category] || '📋'}</span>
                <div>
                  <p className="text-nex-text text-sm font-medium capitalize">
                    {fc.label || t(`finance.categories.${fc.category}`, { defaultValue: fc.category })}
                  </p>
                  <p className="text-nex-muted text-xs">{fc.month}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-amber-600">
                    {formatCurrency(Number(fc.amount))}
                  </p>
                  {isManager && (
                    <button
                      onClick={() => onDeleteFixedCost(fc.id)}
                      className="p-1 text-red-500 transition-colors hover:text-red-700"
                      title={t('common.delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {fc.is_paid ? (
                  <span className="text-nex-success flex items-center gap-0.5 text-xs">
                    <CheckCircle2 className="h-3 w-3" />
                    {t('finance.fixedModal.paid')}
                  </span>
                ) : (
                  isManager && (
                    <div className="mt-1 flex gap-2">
                      <button
                        onClick={() => startEdit(fc)}
                        className="text-nex-primary text-xs font-medium transition-colors hover:text-blue-700"
                      >
                        {t('common.edit')}
                      </button>
                      <button
                        onClick={() => onMarkPaid(fc.id)}
                        className="flex items-center gap-0.5 text-xs font-medium text-emerald-600 transition-colors hover:text-emerald-800"
                      >
                        <CheckCircle2 className="h-3 w-3" /> {t('finance.fixedModal.markPaid')}
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
