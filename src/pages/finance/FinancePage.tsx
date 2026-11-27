import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../stores/authStore'
import { useMessStore } from '../../stores/messStore'
import { supabase } from '../../lib/supabase'
import { Wallet, Receipt, PiggyBank, DollarSign, TrendingUp, Download, History } from 'lucide-react'
import { format, endOfMonth } from 'date-fns'
import { computeSettlements, type ReportMemberRow } from '../../lib/reportSettlements'
import toast from 'react-hot-toast'
import { CardSkeleton, ListSkeleton, Skeleton } from '../../components/Skeleton'
import ConfirmDialog from '../../components/ConfirmDialog'
import { sendPushToUser } from '../../lib/push'
import { expenseSchema, depositSchema, fixedCostSchema, validateForm } from '../../lib/validation/schemas'
import { prepareImageForUpload, generateSafeFileName } from '../../lib/fileValidator'
import { sanitizeAppError } from '../../lib/errorHandler'
import { isApprovedManager, isSafeHttpUrl } from '../../lib/utils'

import { useFinanceData } from '../../hooks/useFinanceData'
import { usePageTitle } from '../../hooks/usePageTitle'

import FinanceOverview from './components/FinanceOverview'
import ExpenseTab from './components/ExpenseTab'
import DepositTab from './components/DepositTab'
import FixedCostTab from './components/FixedCostTab'
import SummaryTab from './components/SummaryTab'
import SettleUpSheet from './components/SettleUpSheet'
import SpendingBreakdown from './components/SpendingBreakdown'
import HistoryTab from './components/HistoryTab'

type Tab = 'expenses' | 'deposits' | 'fixed' | 'summary' | 'history'

export default function FinancePage() {
  const { t } = useTranslation()
  usePageTitle(t('nav.finance'))

  const { user, profile } = useAuthStore()
  const { currentMess, members, fetchMembers } = useMessStore()
  const [activeTab, setActiveTab] = useState<Tab>('expenses')

  useEffect(() => {
    if (currentMess?.id) {
      fetchMembers(currentMess.id)
    }
  }, [currentMess?.id, fetchMembers])

  const {
    expenses,
    deposits,
    fixedCosts,
    balances,
    loading: loadingData,
    refetch,
    currentMonth,
  } = useFinanceData(currentMess?.id, members)

  const isManager = isApprovedManager(members, user?.id)
  const approvedMembers = members.filter((m) => m.status === 'approved')
  const financeMembers = members.filter((m) => {
    if (m.status === 'approved') return true
    if (m.status === 'left') {
      if (!m.left_at) return true
      return new Date(m.left_at) >= new Date(currentMonth + '-01')
    }
    return false
  })

  const [paidFixedCostId, setPaidFixedCostId] = useState<string | null>(null)
  const [deleteDepositId, setDeleteDepositId] = useState<string | null>(null)
  const [deleteFixedCostId, setDeleteFixedCostId] = useState<string | null>(null)
  const [exportingPdf, setExportingPdf] = useState(false)

  const totalExpenses = expenses
    .filter((e) => e.date.startsWith(currentMonth))
    .reduce((s, e) => s + Number(e.amount), 0)
  const totalDeposits = deposits
    .filter((d) => d.date.startsWith(currentMonth) && d.verified)
    .reduce((s, d) => s + Number(d.amount), 0)
  const totalFixed = fixedCosts.reduce((s, f) => s + Number(f.amount), 0)
  const paidFixed = fixedCosts.filter((f) => f.is_paid).reduce((s, f) => s + Number(f.amount), 0)
  const messBalance = totalDeposits - totalExpenses - paidFixed

  const reportMembers: ReportMemberRow[] = financeMembers.map((m) => {
    const p = m.profiles as { username?: string } | null
    const b = balances[m.user_id] || {}
    return {
      user_id: m.user_id,
      username: p?.username || 'Member',
      status: m.status,
      meals: Number(b.personal_meals || 0),
      mealCost: Number(b.individual_cost || 0),
      deposited: Number(b.total_deposits || 0),
    }
  })

  // Calculations for settlement transfers (Centralized Clearing via Mess Treasury)
  const settlements = (() => {
    const perPersonFixed = financeMembers.length > 0 ? totalFixed / financeMembers.length : 0
    return computeSettlements(reportMembers, perPersonFixed)
  })()

  const handleAddExpense = async (
    rawAmount: number,
    rawCategory: string,
    rawDesc: string,
    file: File | null
  ) => {
    if (!currentMess?.id || !user?.id) return

    // 1. Strict Schema Validation
    const validation = validateForm(expenseSchema, {
      amount: Number(rawAmount),
      category: rawCategory,
      description: rawDesc ? rawDesc.trim() : null,
    })

    if (!validation.success) {
      toast.error(validation.error)
      return
    }

    let receiptUrl = null
    if (file) {
      const prepared = await prepareImageForUpload(file, 'receipt')

      if (!prepared.valid) {
        toast.error(prepared.error)
        return
      }

      const safeName = generateSafeFileName('receipt', prepared.ext)
      const fileName = `${currentMess.id}/${safeName}`

      try {
        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, prepared.file, { contentType: prepared.file.type })
        if (uploadError) {
          toast.error(sanitizeAppError(uploadError, 'Failed to upload receipt'))
          return
        }
        const publicUrl = supabase.storage.from('receipts').getPublicUrl(fileName).data.publicUrl
        if (!isSafeHttpUrl(publicUrl)) {
          toast.error('Invalid receipt URL generated')
          return
        }
        receiptUrl = publicUrl
      } catch (uploadErr) {
        toast.error(sanitizeAppError(uploadErr, 'Failed to upload receipt'))
        return
      }
    }

    try {
      const { error } = await supabase.from('expenses').insert({
        mess_id: currentMess.id,
        amount: validation.data.amount,
        description: validation.data.description || null,
        category: validation.data.category,
        expense_type: validation.data.category === 'bazaar' ? 'bazaar' : 'other',
        created_by: user.id,
        date: format(new Date(), 'yyyy-MM-dd'),
        receipt_url: receiptUrl,
      })

      if (error) {
        toast.error(sanitizeAppError(error, 'Failed to add expense'))
      } else {
        toast.success('Expense added!')
        refetch()
      }
    } catch (err: unknown) {
      toast.error(sanitizeAppError(err, 'Failed to add expense'))
    }
  }

  const handleUpdateExpense = async (
    id: string,
    rawAmount: number,
    rawCategory: string,
    rawDesc: string
  ) => {
    // 1. Strict Schema Validation
    const validation = validateForm(expenseSchema, {
      amount: Number(rawAmount),
      category: rawCategory,
      description: rawDesc ? rawDesc.trim() : null,
    })

    if (!validation.success) {
      toast.error(validation.error)
      return
    }

    try {
      const { error } = await supabase
        .from('expenses')
        .update({
          amount: validation.data.amount,
          category: validation.data.category,
          description: validation.data.description || null,
          expense_type: validation.data.category === 'bazaar' ? 'bazaar' : 'other',
        })
        .eq('id', id)

      if (error) {
        toast.error(sanitizeAppError(error, 'Failed to update expense'))
      } else {
        toast.success('Expense updated!')
        refetch()
      }
    } catch (err: unknown) {
      toast.error(sanitizeAppError(err, 'Failed to update expense'))
    }
  }

  const handleDeleteExpense = async (id: string) => {
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id)
      if (error) {
        toast.error(sanitizeAppError(error, 'Failed to delete expense'))
      } else {
        toast.success('Expense deleted!')
        refetch()
      }
    } catch (err: unknown) {
      toast.error(sanitizeAppError(err, 'Failed to delete expense'))
    }
  }

  const handleAddDeposit = async (userId: string, rawAmount: number, rawNote: string) => {
    if (!currentMess?.id) return

    // 1. Strict Schema Validation
    const validation = validateForm(depositSchema, {
      amount: Number(rawAmount),
      description: rawNote ? rawNote.trim() : null,
    })

    if (!validation.success) {
      toast.error(validation.error)
      return
    }

    try {
      const { error } = await supabase.from('deposits').insert({
        mess_id: currentMess.id,
        user_id: userId,
        amount: validation.data.amount,
        note: validation.data.description || null,
        date: format(new Date(), 'yyyy-MM-dd'),
        verified: false,
        verified_by: null,
      })

      if (error) {
        toast.error(sanitizeAppError(error, 'Failed to add deposit'))
      } else {
        toast.success('Deposit recorded!')
        refetch()
        await supabase.from('notifications').insert({
          user_id: userId,
          mess_id: currentMess.id,
          type: 'deposit_recorded',
          title: '💰 Deposit Recorded',
          body: `Your manager recorded a pending deposit of ৳${validation.data.amount}${validation.data.description ? ` (${validation.data.description})` : ''}.`,
        })
        try {
          const bodyText = `Your manager recorded a pending deposit of ৳${validation.data.amount}${validation.data.description ? ` (${validation.data.description})` : ''}.`
          sendPushToUser(userId, `💰 Deposit Recorded`, bodyText, '/finance')
        } catch (err) {
          console.error('Failed to send deposit push:', err)
        }
      }
    } catch (err: unknown) {
      toast.error(sanitizeAppError(err, 'Failed to add deposit'))
    }
  }

  const handleConfirmDeposit = async (id: string) => {
    if (!user?.id) return
    const { data: dep } = await supabase
      .from('deposits')
      .select('user_id, amount')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('deposits')
      .update({ verified: true, verified_by: user.id })
      .eq('id', id)

    if (error) toast.error(sanitizeAppError(error, 'Failed to verify deposit'))
    else {
      toast.success('Deposit verified!')
      refetch()
      if (dep && currentMess?.id) {
        try {
          const isOwnDeposit = dep.user_id === user.id
          if (isOwnDeposit && currentMess?.manager_id) {
            await supabase.from('notifications').insert({
              user_id: currentMess.manager_id,
              mess_id: currentMess.id,
              type: 'deposit_verified',
              title: '✅ Deposit Confirmed',
              body: `${profile?.username || 'A member'} confirmed the deposit of ৳${dep.amount}.`,
            })
            sendPushToUser(
              currentMess.manager_id,
              `✅ Deposit Confirmed by Member`,
              `${profile?.username || 'A member'} confirmed the deposit of ৳${dep.amount}.`,
              '/finance'
            )
          } else if (!isOwnDeposit) {
            await supabase.from('notifications').insert({
              user_id: dep.user_id,
              mess_id: currentMess.id,
              type: 'deposit_verified',
              title: '✅ Deposit Verified',
              body: `Your deposit of ৳${dep.amount} has been verified by the manager.`,
            })
            sendPushToUser(
              dep.user_id,
              `✅ Deposit Verified`,
              `Your deposit of ৳${dep.amount} has been verified by the manager.`,
              '/finance'
            )
          }
        } catch (err) {
          console.error('Failed to send deposit verification push:', err)
        }
      }
    }
  }

  const handleConfirmDeleteDeposit = async () => {
    if (!deleteDepositId) return
    const { error } = await supabase.from('deposits').delete().eq('id', deleteDepositId)
    setDeleteDepositId(null)
    if (error) toast.error(sanitizeAppError(error, 'Failed to delete deposit'))
    else {
      toast.success('Deposit deleted!')
      refetch()
    }
  }

  const handleConfirmDeleteFixedCost = async () => {
    if (!deleteFixedCostId) return
    const { error } = await supabase.from('fixed_costs').delete().eq('id', deleteFixedCostId)
    setDeleteFixedCostId(null)
    if (error) toast.error(sanitizeAppError(error, 'Failed to delete fixed cost'))
    else {
      toast.success('Fixed cost deleted!')
      refetch()
    }
  }

  const handleAddFixedCost = async (
    category: string,
    amount: number,
    label: string,
    editId: string | null
  ) => {
    if (!currentMess?.id || !user?.id) return

    const validation = validateForm(fixedCostSchema, {
      category,
      amount: Number(amount),
      label: label ? label.trim() : null,
    })

    if (!validation.success) {
      toast.error(validation.error)
      return
    }

    let error
    if (editId) {
      const res = await supabase
        .from('fixed_costs')
        .update({
          category: validation.data.category,
          amount: validation.data.amount,
          label: validation.data.label || null,
        })
        .eq('id', editId)
      error = res.error
    } else {
      const res = await supabase.from('fixed_costs').insert({
        mess_id: currentMess.id,
        category: validation.data.category,
        amount: validation.data.amount,
        label: validation.data.label || null,
        month: currentMonth,
        created_by: user.id,
      })
      error = res.error
    }

    if (error) toast.error(sanitizeAppError(error, 'Failed to save fixed cost'))
    else {
      toast.success('Fixed cost saved!')
      refetch()
    }
  }

  const handleConfirmMarkPaid = async () => {
    if (!paidFixedCostId) return
    const { error } = await supabase
      .from('fixed_costs')
      .update({ is_paid: true })
      .eq('id', paidFixedCostId)
    if (error) {
      toast.error(sanitizeAppError(error, 'Failed to mark as paid'))
    } else {
      toast.success('Marked as paid!')
      refetch()
    }
    setPaidFixedCostId(null)
  }

  const handleDownloadPDF = async () => {
    if (!currentMess || exportingPdf) return
    setExportingPdf(true)

    try {
      const totalMessMeals = reportMembers.reduce((sum, m) => sum + m.meals, 0)
      const rateFromBalance = Object.values(balances).find((b) => Number(b?.meal_rate || 0) > 0)
      const mealRate =
        Number(rateFromBalance?.meal_rate || 0) ||
        (totalMessMeals > 0 ? totalExpenses / totalMessMeals : 0)

      const [yy, mm] = currentMonth.split('-').map(Number)
      const monthDate = new Date(yy, (mm || 1) - 1, 1)
      const monthStartStr = format(monthDate, 'yyyy-MM-dd')
      const monthEndStr = format(endOfMonth(monthDate), 'yyyy-MM-dd')

      const [{ data: rawMeals, error: mealsError }, { buildReportPdf }] = await Promise.all([
        supabase
          .from('meals')
          .select('date, user_id, lunch, dinner, guest_lunch, guest_dinner, profiles(username)')
          .eq('mess_id', currentMess.id)
          .gte('date', monthStartStr)
          .lte('date', monthEndStr),
        import('../../lib/reportPdf'),
      ])

      if (mealsError) throw mealsError

      const dailyMeals = (rawMeals || []).map((m) => ({
        date: m.date,
        username: (m.profiles as { username?: string } | null)?.username || 'Member',
        user_id: m.user_id,
        lunch: m.lunch,
        dinner: m.dinner,
        guest_lunch: m.guest_lunch || 0,
        guest_dinner: m.guest_dinner || 0,
      }))

      const dailyExpenses = expenses
        .filter((e) => e.date.startsWith(currentMonth))
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((e) => ({
          date: e.date,
          category: e.category || '',
          description: e.description || '',
          amount: Number(e.amount),
          logged_by:
            (e as { profiles?: { username?: string } | null }).profiles?.username || 'Unknown',
        }))

      const dailyDeposits = deposits
        .filter((d) => d.date.startsWith(currentMonth) && d.verified)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((d) => ({
          date: d.date,
          username:
            (d as { profiles?: { username?: string } | null }).profiles?.username || 'Member',
          amount: Number(d.amount),
          note: d.note || '',
        }))

      buildReportPdf({
        messName: currentMess.name,
        messLocation: currentMess.location,
        month: currentMonth,
        generatedBy: profile?.username || 'Manager',
        totalExpenses: Number(totalExpenses || 0),
        totalDeposits: Number(totalDeposits || 0),
        totalFixed,
        mealRate,
        totalMeals: totalMessMeals,
        financeMembersCount: financeMembers.length,
        members: reportMembers,
        fixedCosts: fixedCosts.map((fc) => ({
          description: fc.category + (fc.label ? ` (${fc.label})` : ''),
          amount: fc.amount,
        })),
        settlements,
        dailyExpenses,
        dailyMeals,
        dailyDeposits,
      })
      toast.success(t('finance.history.downloadedToast'))
    } catch (err) {
      toast.error(sanitizeAppError(err, 'Failed to generate PDF report'))
    } finally {
      setExportingPdf(false)
    }
  }

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'expenses', label: t('finance.tabs.expenses'), icon: Receipt },
    { key: 'deposits', label: t('finance.tabs.deposits'), icon: PiggyBank },
    { key: 'fixed', label: t('finance.tabs.fixed'), icon: DollarSign },
    { key: 'summary', label: t('finance.tabs.summary'), icon: TrendingUp },
    { key: 'history', label: t('finance.tabs.history'), icon: History },
  ]

  if (!currentMess) return null

  if (loadingData) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="nex-card flex gap-1 p-2">
          <Skeleton className="h-10 w-1/4 rounded-lg" />
          <Skeleton className="h-10 w-1/4 rounded-lg" />
          <Skeleton className="h-10 w-1/4 rounded-lg" />
          <Skeleton className="h-10 w-1/4 rounded-lg" />
        </div>
        <div className="nex-card space-y-4 p-5">
          <Skeleton className="h-10 w-32 rounded-lg" />
          <ListSkeleton count={5} />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Wallet className="text-nex-primary h-6 w-6" />
          <h1 className="text-nex-text text-2xl font-bold">{t('nav.finance')}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {(activeTab === 'summary' || activeTab === 'history') && isManager && (
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={exportingPdf}
              className="nex-btn-primary flex items-center gap-1.5 px-3 py-2 text-xs disabled:opacity-60"
            >
              <Download className={`h-4 w-4 ${exportingPdf ? 'animate-pulse' : ''}`} />{' '}
              {exportingPdf ? t('finance.actions.downloadingPdf') : t('finance.actions.downloadPdf')}
            </button>
          )}
        </div>
      </div>

      <FinanceOverview
        totalExpenses={totalExpenses}
        totalDeposits={totalDeposits}
        totalFixed={totalFixed}
        messBalance={messBalance}
      />

      <div className="bg-nex-elevated rounded-btn scrollbar-none flex w-full max-w-full gap-1 overflow-x-auto p-1 sm:justify-between">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex shrink-0 items-center justify-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-medium whitespace-nowrap transition-colors sm:flex-1 sm:px-3 ${
              activeTab === key ? 'bg-nex-surface text-nex-text shadow-sm' : 'text-nex-muted hover:text-nex-text'
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" /> {label}
          </button>
        ))}
      </div>

      {activeTab === 'expenses' && (
        <ExpenseTab
          expenses={expenses}
          isManager={isManager}
          onAddExpense={handleAddExpense}
          onUpdateExpense={handleUpdateExpense}
          onDeleteExpense={handleDeleteExpense}
        />
      )}

      {activeTab === 'deposits' && (
        <DepositTab
          deposits={deposits}
          approvedMembers={approvedMembers}
          isManager={isManager}
          currentUserId={user?.id || ''}
          onAddDeposit={handleAddDeposit}
          onConfirmDeposit={handleConfirmDeposit}
          onDeleteDeposit={(id) => {
            setDeleteDepositId(id)
            return Promise.resolve()
          }}
        />
      )}

      {activeTab === 'fixed' && (
        <FixedCostTab
          fixedCosts={fixedCosts}
          isManager={isManager}
          onAddFixedCost={handleAddFixedCost}
          onMarkPaid={(id) => {
            setPaidFixedCostId(id)
            return Promise.resolve()
          }}
          onDeleteFixedCost={(id) => {
            setDeleteFixedCostId(id)
            return Promise.resolve()
          }}
        />
      )}

      {activeTab === 'summary' && (
        <div className="space-y-4">
          <SpendingBreakdown
            expenses={expenses.filter((e) => e.date.startsWith(currentMonth))}
            fixedCosts={fixedCosts}
            totalDeposits={totalDeposits}
          />
          <SummaryTab financeMembers={financeMembers} balances={balances} totalFixed={totalFixed} />
          <SettleUpSheet settlements={settlements} />
        </div>
      )}

      {activeTab === 'history' && <HistoryTab />}

      <ConfirmDialog
        open={paidFixedCostId !== null}
        title={t('finance.fixedModal.markPaidTitle')}
        message={t('finance.fixedModal.markPaidConfirm')}
        confirmText={t('finance.fixedModal.markPaid')}
        cancelText={t('common.cancel')}
        variant="warning"
        onConfirm={handleConfirmMarkPaid}
        onCancel={() => setPaidFixedCostId(null)}
      />

      <ConfirmDialog
        open={deleteDepositId !== null}
        title={t('common.delete')}
        message={t('finance.depositModal.deleteConfirm')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        variant="danger"
        onConfirm={handleConfirmDeleteDeposit}
        onCancel={() => setDeleteDepositId(null)}
      />

      <ConfirmDialog
        open={deleteFixedCostId !== null}
        title={t('common.delete')}
        message={t('finance.fixedModal.deleteConfirm')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        variant="danger"
        onConfirm={handleConfirmDeleteFixedCost}
        onCancel={() => setDeleteFixedCostId(null)}
      />
    </div>
  )
}
