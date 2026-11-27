import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, CheckCircle2, DollarSign, Trash2, X, ChevronDown, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatCurrency, formatLocalizedDate } from '../../../lib/utils'
import { FIXED_COST_CATEGORIES, type FixedCostCategory } from '../../../lib/spending'
import EmptyState from '../../../components/EmptyState'
import type { FixedCost } from '../../../types/database'
import { getFinanceCategoryMeta } from './financeCategories'

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
  const [fixCategory, setFixCategory] = useState<FixedCostCategory>('rent')
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false)
  const [fixAmount, setFixAmount] = useState('')
  const [fixLabel, setFixLabel] = useState('')
  const [loading, setLoading] = useState(false)
  const categoryDropdownRef = useRef<HTMLDivElement>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const amount = parseFloat(fixAmount)
    if (!amount || amount <= 0) return
    setLoading(true)
    await onAddFixedCost(fixCategory, amount, fixLabel, editFixedCostId)
    setShowAddFixed(false)
    setCategoryMenuOpen(false)
    setFixAmount('')
    setFixLabel('')
    setFixCategory('rent')
    setEditFixedCostId(null)
    setLoading(false)
  }

  const startEdit = (fc: FixedCost) => {
    setFixCategory(getFinanceCategoryMeta(fc.category).key as FixedCostCategory)
    setCategoryMenuOpen(false)
    setFixAmount(fc.amount.toString())
    setFixLabel(fc.label || '')
    setEditFixedCostId(fc.id)
    setShowAddFixed(true)
  }

  const handleCancel = useCallback(() => {
    setShowAddFixed(false)
    setCategoryMenuOpen(false)
    setEditFixedCostId(null)
    setFixCategory('rent')
    setFixAmount('')
    setFixLabel('')
  }, [])

  useEffect(() => {
    if (!showAddFixed) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (categoryMenuOpen) {
          setCategoryMenuOpen(false)
          return
        }
        handleCancel()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showAddFixed, categoryMenuOpen, handleCancel])

  useEffect(() => {
    if (!categoryMenuOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(e.target as Node)
      ) {
        setCategoryMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [categoryMenuOpen])

  const selectedMeta = getFinanceCategoryMeta(fixCategory)
  const SelectedIcon = selectedMeta.icon

  return (
    <div className="space-y-4">
      {isManager && (
        <button
          onClick={() => {
            setCategoryMenuOpen(false)
            setShowAddFixed(true)
          }}
          className="nex-btn-primary text-sm"
        >
          <Plus className="h-4 w-4" /> {t('finance.fixedModal.addTitle')}
        </button>
      )}

      {showAddFixed && (
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
                {editFixedCostId
                  ? t('finance.fixedModal.editTitle')
                  : t('finance.fixedModal.addTitle')}
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div ref={categoryDropdownRef} className="relative">
                  <label
                    id="fixed-cost-category-label"
                    className="text-nex-text mb-1 block text-sm font-medium"
                  >
                    {t('finance.fixedModal.categoryLabel')}
                  </label>
                  <button
                    type="button"
                    aria-labelledby="fixed-cost-category-label"
                    aria-haspopup="listbox"
                    aria-expanded={categoryMenuOpen}
                    onClick={() => setCategoryMenuOpen((open) => !open)}
                    className="nex-input flex items-center justify-between gap-2 px-3 py-2 text-left"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${selectedMeta.bgClass}`}
                      >
                        <SelectedIcon className={`h-3.5 w-3.5 ${selectedMeta.textClass}`} />
                      </span>
                      <span className="text-nex-text truncate text-sm font-medium">
                        {t(`finance.categories.${fixCategory}`)}
                      </span>
                    </span>
                    <ChevronDown
                      className={`text-nex-muted h-4 w-4 shrink-0 transition-transform ${
                        categoryMenuOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {categoryMenuOpen && (
                    <div
                      role="listbox"
                      aria-labelledby="fixed-cost-category-label"
                      className="bg-nex-surface border-nex-border animate-fade-in absolute top-full left-0 z-30 mt-1.5 max-h-60 w-full min-w-[220px] overflow-y-auto rounded-xl border p-1.5 shadow-xl"
                    >
                      {FIXED_COST_CATEGORIES.map((categoryKey) => {
                        const meta = getFinanceCategoryMeta(categoryKey)
                        const OptionIcon = meta.icon
                        const isSelected = fixCategory === categoryKey
                        return (
                          <button
                            key={categoryKey}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => {
                              setFixCategory(categoryKey)
                              setCategoryMenuOpen(false)
                            }}
                            className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                              isSelected
                                ? 'bg-nex-primary-light text-nex-primary font-semibold'
                                : 'text-nex-text hover:bg-nex-hover'
                            }`}
                          >
                            <span className="flex min-w-0 items-center gap-2.5">
                              <span
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${meta.bgClass}`}
                              >
                                <OptionIcon className={`h-3.5 w-3.5 ${meta.textClass}`} />
                              </span>
                              <span className="truncate">
                                {t(`finance.categories.${categoryKey}`)}
                              </span>
                            </span>
                            {isSelected && <Check className="text-nex-primary h-4 w-4 shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  )}
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
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={handleCancel} className="nex-btn-secondary flex-1">
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
        {fixedCosts.length === 0 ? (
          <EmptyState
            icon={DollarSign}
            title={t('finance.fixedModal.empty')}
            description={t('finance.fixedModal.emptyDesc')}
          />
        ) : (
          fixedCosts.map((fc) => {
            const meta = getFinanceCategoryMeta(fc.category)
            const CategoryIcon = meta.icon
            const categoryTitle = t(`finance.categories.${meta.key}`, {
              defaultValue: fc.category,
            })

            return (
              <div
                key={fc.id}
                className="hover:bg-nex-hover flex items-center justify-between gap-3 px-5 py-3 transition-colors"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.bgClass}`}
                  >
                    <CategoryIcon className={`h-4 w-4 ${meta.textClass}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-nex-text truncate text-sm font-medium">
                      {fc.label || categoryTitle}
                    </p>
                    <p className="text-nex-muted truncate text-xs">
                      {fc.label ? `${categoryTitle} · ` : ''}
                      {formatLocalizedDate(fc.month + '-01', 'MMMM yyyy')}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-amber-600">
                      {formatCurrency(Number(fc.amount))}
                    </p>
                    {isManager && (
                      <button
                        type="button"
                        onClick={() => onDeleteFixedCost(fc.id)}
                        className="p-1 text-red-500 transition-colors hover:text-red-700"
                        title={t('common.delete')}
                        aria-label={t('common.delete')}
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
                          className="text-nex-primary hover:text-nex-primary-dark text-xs font-medium transition-colors"
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
            )
          })
        )}
      </div>
    </div>
  )
}
