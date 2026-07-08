'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useProfileStore, useMessStore } from '@/stores/appStore'
import {
  getExpenses,
  addExpense,
  updateExpense,
  deleteExpense,
  getDeposits,
  addDeposit,
  verifyDeposit,
  deleteDeposit,
  getFixedCosts,
  addFixedCost,
  updateFixedCost,
  deleteFixedCost,
  markFixedCostPaid,
  getMemberBalances,
  getDailyMealsForMonth,
} from '@/actions/finance'
import { getPresignedUploadUrl } from '@/actions/storage'
import { usePusherRealtime } from '@/hooks/usePusherRealtime'
import { format, endOfMonth } from 'date-fns'
import toast from 'react-hot-toast'
import { Wallet, Receipt, PiggyBank, DollarSign, TrendingUp, Download, History } from 'lucide-react'
import { buildReportPdf, computeSettlements } from '@/lib/reportPdf'

// Sub-components
import FinanceOverview from './components/FinanceOverview'
import ExpenseTab from './components/ExpenseTab'
import DepositTab from './components/DepositTab'
import FixedCostTab from './components/FixedCostTab'
import SummaryTab from './components/SummaryTab'
import SettleUpSheet from './components/SettleUpSheet'
import HistoryTab from './components/HistoryTab'
import ConfirmDialog from '@/components/ConfirmDialog'
import { CardSkeleton, ListSkeleton, Skeleton } from '@/components/Skeleton'

type Tab = 'expenses' | 'deposits' | 'fixed' | 'summary' | 'history'

export default function FinanceClient() {
  const { profile } = useProfileStore()
  const { currentMess, members } = useMessStore()
  const [activeTab, setActiveTab] = useState<Tab>('expenses')

  const [expenses, setExpenses] = useState<any[]>([])
  const [deposits, setDeposits] = useState<any[]>([])
  const [fixedCosts, setFixedCosts] = useState<any[]>([])
  const [balances, setBalances] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)

  const currentMonth = format(new Date(), 'yyyy-MM')

  const isManager = members.some((m) => m.user_id === profile?.id && m.role === 'manager')
  const approvedMembers = members.filter((m) => m.status === 'approved')
  const financeMembers = members.filter((m) => m.status === 'approved' || m.status === 'left')

  // Paid Confirmation Dialog State
  const [paidFixedCostId, setPaidFixedCostId] = useState<string | null>(null)

  const fetchFinanceData = useCallback(async () => {
    if (!currentMess?.id) return
    try {
      const [expData, depData, fixData, balData] = await Promise.all([
        getExpenses(currentMess.id, currentMonth),
        getDeposits(currentMess.id, currentMonth),
        getFixedCosts(currentMess.id, currentMonth),
        getMemberBalances(currentMess.id, currentMonth),
      ])
      setExpenses(expData)
      setDeposits(depData)
      setFixedCosts(fixData)

      // Map balances array into a lookup Record
      const balLookup: Record<string, any> = {}
      balData.forEach((row) => {
        balLookup[row.user_id] = row
      })
      setBalances(balLookup)
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to load financial data')
    } finally {
      setLoading(false)
    }
  }, [currentMess?.id, currentMonth])

  useEffect(() => {
    if (currentMess?.id) {
      fetchFinanceData()
    } else {
      setLoading(false)
    }
  }, [currentMess?.id, fetchFinanceData])

  // Pusher Realtime Subscription
  usePusherRealtime(
    currentMess?.id,
    ['expenses', 'deposits', 'fixed_costs', 'meals', 'monthly_reports'],
    fetchFinanceData
  )

  const totalExpenses = useMemo(() => {
    return expenses
      .filter((e) => e.date.startsWith(currentMonth))
      .reduce((s, e) => s + Number(e.amount), 0)
  }, [expenses, currentMonth])

  const totalDeposits = useMemo(() => {
    return deposits
      .filter((d) => d.date.startsWith(currentMonth) && d.verified)
      .reduce((s, d) => s + Number(d.amount), 0)
  }, [deposits, currentMonth])

  const totalFixed = useMemo(() => {
    return fixedCosts.reduce((s, f) => s + Number(f.amount), 0)
  }, [fixedCosts])

  const paidFixed = useMemo(() => {
    return fixedCosts.filter((f) => f.is_paid).reduce((s, f) => s + Number(f.amount), 0)
  }, [fixedCosts])

  const messBalance = totalDeposits - totalExpenses - paidFixed

  // Settlements Transfers Clearing
  const settlements = useMemo(() => {
    const perPersonFixed = financeMembers.length > 0 ? totalFixed / financeMembers.length : 0
    const creditors: { name: string; amount: number }[] = []
    const debtors: { name: string; amount: number }[] = []

    financeMembers.forEach((m) => {
      const p = m.profiles as { username?: string } | null
      const b = balances[m.user_id] || {}
      const mealCost = Number(b.individual_cost || 0)
      const deposited = Number(b.total_deposits || 0)
      const realBalance = deposited - (mealCost + perPersonFixed)
      const name = p?.username || 'Member'
      if (realBalance > 0.5) creditors.push({ name, amount: realBalance })
      else if (realBalance < -0.5) debtors.push({ name, amount: -realBalance })
    })

    const transfers: { from: string; to: string; amount: number }[] = []

    debtors.forEach((d) => {
      transfers.push({
        from: d.name,
        to: 'Mess Treasury/Manager',
        amount: Math.round(d.amount),
      })
    })

    creditors.forEach((c) => {
      transfers.push({
        from: 'Mess Treasury/Manager',
        to: c.name,
        amount: Math.round(c.amount),
      })
    })

    return transfers
  }, [financeMembers, balances, totalFixed])

  // Actions
  const handleAddExpense = async (
    amount: number,
    category: string,
    desc: string,
    file: File | null
  ) => {
    if (!currentMess?.id) return

    let receiptUrl = undefined
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Receipt must be an image')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Receipt must be under 5MB')
        return
      }
      try {
        const { uploadUrl, publicUrl } = await getPresignedUploadUrl(
          'receipt',
          file.name,
          file.type,
          currentMess.id
        )
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        })
        if (!uploadRes.ok) throw new Error('Failed to upload receipt')
        receiptUrl = publicUrl
      } catch (err: any) {
        toast.error(err.message || 'Failed to upload receipt')
        return
      }
    }

    try {
      await addExpense(currentMess.id, {
        amount,
        category,
        description: desc.trim().slice(0, 500),
        expense_type: category === 'bazaar' ? 'bazaar' : 'other',
        date: format(new Date(), 'yyyy-MM-dd'),
        receipt_url: receiptUrl,
      })
      toast.success('Expense added!')
      fetchFinanceData()
    } catch (err: any) {
      toast.error('Failed to add expense')
    }
  }

  const handleUpdateExpense = async (
    id: string,
    amount: number,
    category: string,
    desc: string
  ) => {
    if (!currentMess?.id) return
    try {
      await updateExpense(currentMess.id, id, {
        amount,
        category,
        description: desc.trim().slice(0, 500),
        expense_type: category === 'bazaar' ? 'bazaar' : 'other',
      })
      toast.success('Expense updated!')
      fetchFinanceData()
    } catch (err: any) {
      toast.error('Failed to update expense')
    }
  }

  const handleDeleteExpense = async (id: string) => {
    if (!currentMess?.id) return
    try {
      await deleteExpense(currentMess.id, id)
      toast.success('Expense deleted!')
      fetchFinanceData()
    } catch (err: any) {
      toast.error('Failed to delete expense')
    }
  }

  const handleAddDeposit = async (userId: string, amount: number, note: string) => {
    if (!currentMess?.id) return
    try {
      await addDeposit(currentMess.id, {
        userId,
        amount,
        note: note.trim().slice(0, 500),
        date: format(new Date(), 'yyyy-MM-dd'),
      })
      toast.success('Deposit recorded!')
      fetchFinanceData()
    } catch (err: any) {
      toast.error('Failed to record deposit')
    }
  }

  const handleConfirmDeposit = async (id: string) => {
    if (!currentMess?.id) return
    try {
      await verifyDeposit(currentMess.id, id)
      toast.success('Deposit verified!')
      fetchFinanceData()
    } catch (err: any) {
      toast.error('Failed to verify deposit')
    }
  }

  const handleDeleteDeposit = async (id: string) => {
    if (!currentMess?.id) return
    try {
      await deleteDeposit(currentMess.id, id)
      toast.success('Deposit deleted!')
      fetchFinanceData()
    } catch (err: any) {
      toast.error('Failed to delete deposit')
    }
  }

  const handleAddFixedCost = async (
    category: any,
    amount: number,
    label: string,
    editId: string | null
  ) => {
    if (!currentMess?.id) return
    try {
      if (editId) {
        await updateFixedCost(currentMess.id, editId, {
          category,
          amount,
          label: label.trim() || undefined,
        })
      } else {
        await addFixedCost(currentMess.id, {
          category,
          amount,
          label: label.trim() || undefined,
          month: currentMonth,
        })
      }
      toast.success('Fixed cost saved!')
      fetchFinanceData()
    } catch (err: any) {
      toast.error('Failed to save fixed cost')
    }
  }

  const handleConfirmMarkPaid = async () => {
    if (!paidFixedCostId || !currentMess?.id) return
    try {
      await markFixedCostPaid(currentMess.id, paidFixedCostId)
      toast.success('Marked as paid!')
      fetchFinanceData()
    } catch (err: any) {
      toast.error('Failed to mark as paid')
    }
    setPaidFixedCostId(null)
  }

  const handleDeleteFixedCost = async (id: string) => {
    if (!currentMess?.id) return
    try {
      await deleteFixedCost(currentMess.id, id)
      toast.success('Fixed cost deleted!')
      fetchFinanceData()
    } catch (err: any) {
      toast.error('Failed to delete fixed cost')
    }
  }

  const handleDownloadPDF = async () => {
    if (!currentMess) return

    try {
      toast.loading('Compiling report data...', { id: 'pdf-gen' })

      const reportMembers = financeMembers.map((m) => {
        const p = m.profiles as { username?: string } | null
        const b = balances[m.user_id] || {}
        return {
          user_id: m.user_id,
          username: p?.username || 'Unknown',
          status: m.status as any,
          meals: Number(b.personal_meals || 0),
          mealCost: Number(b.individual_cost || 0),
          deposited: Number(b.total_deposits || 0),
        }
      })

      const anyB = Object.values(balances)[0]
      const mealRate = Number(anyB?.meal_rate || 0)
      const totalMessMeals = Object.values(balances).reduce(
        (sum, b) => sum + Number(b?.personal_meals || 0),
        0
      )

      const rawMeals = await getDailyMealsForMonth(currentMess.id, currentMonth)

      const dailyMeals = rawMeals.map((m) => ({
        date: m.date,
        username: m.username || 'Member',
        user_id: m.user_id,
        lunch: !!m.lunch,
        dinner: !!m.dinner,
        guest_lunch: m.guest_lunch || 0,
        guest_dinner: m.guest_dinner || 0,
      }))

      const dailyExpenses = expenses
        .filter((e) => e.date.startsWith(currentMonth))
        .map((e) => ({
          date: e.date,
          category: e.category || '',
          description: e.description || '',
          amount: Number(e.amount),
          logged_by: e.profiles?.username || 'Unknown',
        }))

      const dailyDeposits = deposits
        .filter((d) => d.date.startsWith(currentMonth) && d.verified)
        .map((d) => ({
          date: d.date,
          username: d.profiles?.username || 'Member',
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

      toast.success('PDF Report Downloaded!', { id: 'pdf-gen' })
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to download PDF report', { id: 'pdf-gen' })
    }
  }

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'expenses', label: 'Expenses', icon: Receipt },
    { key: 'deposits', label: 'Deposits', icon: PiggyBank },
    { key: 'fixed', label: 'Fixed Costs', icon: DollarSign },
    { key: 'summary', label: 'Summary', icon: TrendingUp },
    ...(isManager ? [{ key: 'history' as const, label: 'History', icon: History }] : []),
  ]

  if (!currentMess) return null

  if (loading) {
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
    <div className="mx-auto max-w-5xl space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Wallet className="text-nex-primary h-6 w-6" />
          <h1 className="text-nex-text text-2xl font-bold">Finance</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeTab === 'summary' && isManager && (
            <button
              onClick={handleDownloadPDF}
              className="nex-btn-primary flex items-center gap-1.5 px-3 py-2 text-xs cursor-pointer"
            >
              <Download className="h-4 w-4" /> Download PDF Report
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

      {/* Tab Switcher */}
      <div className="bg-nex-elevated rounded-btn scrollbar-none flex w-full max-w-full gap-1 overflow-x-auto p-1">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === key ? 'bg-nex-surface text-nex-text shadow-sm' : 'text-nex-muted'
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* Tabs panels */}
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
          currentUserId={profile?.id || ''}
          onAddDeposit={handleAddDeposit}
          onConfirmDeposit={handleConfirmDeposit}
          onDeleteDeposit={handleDeleteDeposit}
        />
      )}

      {activeTab === 'fixed' && (
        <FixedCostTab
          fixedCosts={fixedCosts}
          isManager={isManager}
          onAddFixedCost={handleAddFixedCost}
          onMarkPaid={async (id) => setPaidFixedCostId(id)}
          onDeleteFixedCost={handleDeleteFixedCost}
        />
      )}

      {activeTab === 'summary' && (
        <div className="space-y-4">
          <SummaryTab financeMembers={financeMembers} balances={balances} totalFixed={totalFixed} />
          <SettleUpSheet settlements={settlements} />
        </div>
      )}

      {activeTab === 'history' && isManager && <HistoryTab />}

      {/* Confirmation Dialog for marking fixed costs as paid */}
      <ConfirmDialog
        open={paidFixedCostId !== null}
        title="Mark Fixed Cost as Paid"
        message="Are you sure you want to mark this fixed cost as paid? You won't be able to edit it afterward."
        confirmText="Mark Paid"
        variant="warning"
        onConfirm={handleConfirmMarkPaid}
        onCancel={() => setPaidFixedCostId(null)}
      />
    </div>
  )
}
