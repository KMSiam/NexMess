import { useState, useEffect } from 'react'
import { Plus, PiggyBank, CheckCircle2, Trash2, Clock, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatCurrency, formatLocalizedDate } from '../../../lib/utils'
import EmptyState from '../../../components/EmptyState'
import type { Deposit, MessMember } from '../../../types/database'

interface DepositTabProps {
  deposits: Deposit[]
  approvedMembers: MessMember[]
  isManager: boolean
  currentUserId: string
  onAddDeposit: (userId: string, amount: number, note: string) => Promise<void>
  onConfirmDeposit: (id: string) => Promise<void>
  onDeleteDeposit: (id: string) => Promise<void>
}

export default function DepositTab({
  deposits,
  approvedMembers,
  isManager,
  currentUserId,
  onAddDeposit,
  onConfirmDeposit,
  onDeleteDeposit,
}: DepositTabProps) {
  const { t } = useTranslation()
  const [showAddDeposit, setShowAddDeposit] = useState(false)
  const [depUserId, setDepUserId] = useState('')
  const [depAmount, setDepAmount] = useState('')
  const [depNote, setDepNote] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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

  const handleClose = () => {
    setShowAddDeposit(false)
    setDepAmount('')
    setDepNote('')
    setDepUserId('')
  }

  useEffect(() => {
    if (!showAddDeposit) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showAddDeposit])

  return (
    <div className="space-y-4">
      {isManager && (
        <button
          onClick={() => setShowAddDeposit(true)}
          className="nex-btn-primary text-sm"
        >
          <Plus className="h-4 w-4" /> {t('finance.depositModal.recordTitle')}
        </button>
      )}

      {showAddDeposit && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={handleClose}
        >
          <div
            className="nex-card animate-slide-up w-full max-w-md rounded-b-none p-5 sm:rounded-b-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-nex-text text-lg font-semibold">
                {t('finance.depositModal.recordTitle')}
              </h3>
              <button
                type="button"
                onClick={handleClose}
                className="text-nex-muted hover:text-nex-text rounded-lg p-1"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-nex-text mb-1 block text-sm font-medium">
                    {t('finance.depositModal.memberLabel')}
                  </label>
                  <select
                    value={depUserId}
                    onChange={(e) => setDepUserId(e.target.value)}
                    className="nex-input"
                    required
                  >
                    <option value="">{t('finance.depositModal.selectMember')}</option>
                    {approvedMembers.map((m) => {
                      const p = m.profiles as any
                      return (
                        <option key={m.user_id} value={m.user_id}>
                          {p?.username || t('common.member')}
                        </option>
                      )
                    })}
                  </select>
                </div>
                <div>
                  <label className="text-nex-text mb-1 block text-sm font-medium">
                    {t('finance.depositModal.amountLabel')}
                  </label>
                  <input
                    type="number"
                    value={depAmount}
                    onChange={(e) => setDepAmount(e.target.value)}
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
                  {t('finance.depositModal.noteLabel')}
                </label>
                <input
                  type="text"
                  value={depNote}
                  onChange={(e) => setDepNote(e.target.value)}
                  className="nex-input"
                  placeholder={t('finance.depositModal.notePlaceholder')}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
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
        {deposits.length === 0 ? (
          <EmptyState
            icon={PiggyBank}
            title={t('finance.depositModal.empty')}
            description={t('finance.depositModal.emptyDesc')}
          />
        ) : (
          deposits.map((dep) => (
            <div
              key={dep.id}
              className="hover:bg-nex-hover flex items-center justify-between px-5 py-3 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                  <PiggyBank className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-nex-text text-sm font-medium">
                    {(dep as any).profiles?.username}
                  </p>
                  <p className="text-nex-muted text-xs">
                    {formatLocalizedDate(dep.date, 'MMM d')} {dep.note && `· ${dep.note}`}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2">
                  <p className="text-nex-success text-sm font-semibold">
                    {formatCurrency(Number(dep.amount))}
                  </p>
                  {isManager && (
                    <button
                      onClick={() => onDeleteDeposit(dep.id)}
                      className="p-1 text-red-500 transition-colors hover:text-red-700"
                      title={t('common.delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {dep.verified ? (
                  <span className="text-nex-success flex items-center gap-0.5 text-xs">
                    <CheckCircle2 className="h-3 w-3" />
                    {t('finance.depositModal.verified')}
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-0.5 text-xs text-amber-500">
                      <Clock className="h-3 w-3" />
                      {t('finance.depositModal.pending')}
                    </span>
                    {dep.user_id === currentUserId && (
                      <button
                        onClick={() => onConfirmDeposit(dep.id)}
                        className="bg-nex-primary rounded px-2 py-0.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                      >
                        {t('finance.depositModal.confirmDeposit')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
