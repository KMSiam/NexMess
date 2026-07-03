import { useState } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { useMessStore } from '../../stores/messStore'
import { supabase } from '../../lib/supabase'
import {
  Wallet, Receipt, PiggyBank,
  DollarSign, TrendingUp, Download, FileSpreadsheet
} from 'lucide-react'
import { format } from 'date-fns'
import { buildReportPdf } from '../../lib/reportPdf'
import toast from 'react-hot-toast'
import { CardSkeleton, ListSkeleton, Skeleton } from '../../components/Skeleton'
import ConfirmDialog from '../../components/ConfirmDialog'

// Custom Hooks
import { useFinanceData } from '../../hooks/useFinanceData'
import { usePageTitle } from '../../hooks/usePageTitle'

// Decomposed Sub-components
import FinanceOverview from './components/FinanceOverview'
import ExpenseTab from './components/ExpenseTab'
import DepositTab from './components/DepositTab'
import FixedCostTab from './components/FixedCostTab'
import SummaryTab from './components/SummaryTab'
import SettleUpSheet from './components/SettleUpSheet'

type Tab = 'expenses' | 'deposits' | 'fixed' | 'summary'

export default function FinancePage() {
  usePageTitle('Finance')

  const { user, profile } = useAuthStore()
  const { currentMess, members } = useMessStore()
  const [activeTab, setActiveTab] = useState<Tab>('expenses')

  const isManager = members.some(m => m.user_id === user?.id && m.role === 'manager')
  const approvedMembers = members.filter(m => m.status === 'approved')
  const financeMembers = members.filter(m => m.status === 'approved' || m.status === 'left')

  // Fetch all finance lists & calculations through custom Hook
  const {
    expenses,
    deposits,
    fixedCosts,
    balances,
    loading: loadingData,
    refetch,
    currentMonth,
  } = useFinanceData(currentMess?.id, members)

  // Paid Confirmation Dialog State
  const [paidFixedCostId, setPaidFixedCostId] = useState<string | null>(null)

  const totalExpenses = expenses.filter(e => e.date.startsWith(currentMonth)).reduce((s, e) => s + Number(e.amount), 0)
  const totalDeposits = deposits.filter(d => d.date.startsWith(currentMonth) && d.verified).reduce((s, d) => s + Number(d.amount), 0)
  const totalFixed = fixedCosts.reduce((s, f) => s + Number(f.amount), 0)
  const paidFixed = fixedCosts.filter(f => f.is_paid).reduce((s, f) => s + Number(f.amount), 0)
  const messBalance = totalDeposits - totalExpenses - paidFixed

  // Calculations for settlement transfers (greedy algorithm)
  const settlements = (() => {
    const perPersonFixed = financeMembers.length > 0 ? totalFixed / financeMembers.length : 0
    const creditors: { name: string; amount: number }[] = []
    const debtors: { name: string; amount: number }[] = []
    
    financeMembers.forEach(m => {
      const p = m.profiles as { username?: string } | null
      const b = balances[m.user_id] || {}
      const mealCost = Number(b.individual_cost || 0)
      const deposited = Number(b.total_deposits || 0)
      const realBalance = deposited - (mealCost + perPersonFixed)
      const name = p?.username || 'Member'
      if (realBalance > 0.5) creditors.push({ name, amount: realBalance })
      else if (realBalance < -0.5) debtors.push({ name, amount: -realBalance })
    })

    creditors.sort((a, b) => b.amount - a.amount)
    debtors.sort((a, b) => b.amount - a.amount)
    const transfers: { from: string; to: string; amount: number }[] = []
    let i = 0, j = 0
    while (i < debtors.length && j < creditors.length) {
      const amt = Math.min(debtors[i].amount, creditors[j].amount)
      transfers.push({ from: debtors[i].name, to: creditors[j].name, amount: Math.round(amt) })
      debtors[i].amount -= amt
      creditors[j].amount -= amt
      if (debtors[i].amount < 0.5) i++
      if (creditors[j].amount < 0.5) j++
    }
    return transfers
  })()

  // Actions
  const handleAddExpense = async (amount: number, category: string, desc: string, file: File | null) => {
    if (!currentMess?.id || !user?.id) return

    let receiptUrl = null
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Receipt must be an image')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Receipt must be under 5MB')
        return
      }
      const ext = file.name.split('.').pop()
      const fileName = `${currentMess.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('receipts').upload(fileName, file)
      if (uploadError) {
        toast.error('Failed to upload receipt')
        return
      }
      receiptUrl = supabase.storage.from('receipts').getPublicUrl(fileName).data.publicUrl
    }

    const { error } = await supabase.from('expenses').insert({
      mess_id: currentMess.id, amount, description: desc.trim().slice(0, 500),
      category, expense_type: category === 'bazaar' ? 'bazaar' : 'other',
      created_by: user.id, date: format(new Date(), 'yyyy-MM-dd'), receipt_url: receiptUrl,
    })

    if (error) toast.error('Failed to add expense')
    else {
      toast.success('Expense added!')
      refetch()
    }
  }

  const handleUpdateExpense = async (id: string, amount: number, category: string, desc: string) => {
    const { error } = await supabase.from('expenses').update({
      amount,
      category,
      description: desc.trim().slice(0, 500),
      expense_type: category === 'bazaar' ? 'bazaar' : 'other',
    }).eq('id', id)

    if (error) toast.error('Failed to update expense')
    else {
      toast.success('Expense updated!')
      refetch()
    }
  }

  const handleDeleteExpense = async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) toast.error('Failed to delete expense')
    else {
      toast.success('Expense deleted!')
      refetch()
    }
  }

  const handleAddDeposit = async (userId: string, amount: number, note: string) => {
    if (!currentMess?.id || !user?.id) return
    const { error } = await supabase.from('deposits').insert({
      mess_id: currentMess.id, user_id: userId, amount,
      note: note.trim().slice(0, 500), date: format(new Date(), 'yyyy-MM-dd'), verified: false, verified_by: null,
    })

    if (error) toast.error('Failed to add deposit')
    else {
      toast.success('Deposit recorded!')
      refetch()
    }
  }

  const handleConfirmDeposit = async (id: string) => {
    if (!user?.id) return
    const { error } = await supabase.from('deposits').update({ verified: true, verified_by: user.id }).eq('id', id)
    if (error) toast.error('Failed to verify deposit')
    else {
      toast.success('Deposit verified!')
      refetch()
    }
  }

  const handleDeleteDeposit = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this deposit?')) return
    const { error } = await supabase.from('deposits').delete().eq('id', id)
    if (error) toast.error('Failed to delete deposit')
    else {
      toast.success('Deposit deleted!')
      refetch()
    }
  }

  const handleDeleteFixedCost = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this fixed cost?')) return
    const { error } = await supabase.from('fixed_costs').delete().eq('id', id)
    if (error) toast.error('Failed to delete fixed cost')
    else {
      toast.success('Fixed cost deleted!')
      refetch()
    }
  }

  const handleAddFixedCost = async (category: string, amount: number, label: string, editId: string | null) => {
    if (!currentMess?.id || !user?.id) return

    let error;
    if (editId) {
      const res = await supabase.from('fixed_costs').update({
        category, amount, label: label.trim() || null
      }).eq('id', editId)
      error = res.error
    } else {
      const res = await supabase.from('fixed_costs').insert({
        mess_id: currentMess.id, category, amount,
        label: label.trim() || null, month: currentMonth, created_by: user.id,
      })
      error = res.error
    }

    if (error) toast.error('Failed to save')
    else { 
      toast.success('Fixed cost saved!')
      refetch()
    }
  }

  const handleConfirmMarkPaid = async () => {
    if (!paidFixedCostId) return
    const { error } = await supabase.from('fixed_costs').update({ is_paid: true }).eq('id', paidFixedCostId)
    if (error) {
      toast.error('Failed to mark as paid')
    } else {
      toast.success('Marked as paid!')
      refetch()
    }
    setPaidFixedCostId(null)
  }

  const handleDownloadPDF = () => {
    if (!currentMess) return

    const reportMembers = financeMembers.map((m) => {
      const p = m.profiles as { username?: string } | null
      const b = balances[m.user_id] || {}
      return {
        username: p?.username || 'Unknown',
        status: m.status,
        meals: Number(b.personal_meals || 0),
        mealCost: Number(b.individual_cost || 0),
        deposited: Number(b.total_deposits || 0),
      }
    })

    const anyB = Object.values(balances)[0]
    const mealRate = Number(anyB?.meal_rate || 0)
    const totalMessMeals = Object.values(balances).reduce(
      (sum, b) => sum + Number(b?.personal_meals || 0),
      0,
    )

    buildReportPdf({
      messName: currentMess.name,
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
    })
    toast.success('PDF Report Downloaded!')
  }

  // Export Expenses to CSV format
  const handleExportCSV = () => {
    if (expenses.length === 0) {
      toast.error('No expenses to export')
      return
    }

    const headers = ['Date', 'Category', 'Description', 'Amount (BDT)', 'Logged By']
    const rows = expenses.map(e => [
      e.date,
      e.category || '',
      e.description || '',
      e.amount.toString(),
      (e as any).profiles?.username || 'Unknown'
    ])

    const csvContent = 
      'data:text/csv;charset=utf-8,' + 
      [headers.join(','), ...rows.map(r => r.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n')
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `NexMess_Expenses_${currentMonth}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('CSV Report Exported!')
  }

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'expenses', label: 'Expenses', icon: Receipt },
    { key: 'deposits', label: 'Deposits', icon: PiggyBank },
    { key: 'fixed', label: 'Fixed Costs', icon: DollarSign },
    { key: 'summary', label: 'Summary', icon: TrendingUp },
  ]

  if (!currentMess) return null

  if (loadingData) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="nex-card p-2 flex gap-1">
          <Skeleton className="h-10 w-1/4 rounded-lg" />
          <Skeleton className="h-10 w-1/4 rounded-lg" />
          <Skeleton className="h-10 w-1/4 rounded-lg" />
          <Skeleton className="h-10 w-1/4 rounded-lg" />
        </div>
        <div className="nex-card p-5 space-y-4">
          <Skeleton className="h-10 w-32 rounded-lg" />
          <ListSkeleton count={5} />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Wallet className="w-6 h-6 text-nex-primary" />
          <h1 className="text-2xl font-bold text-nex-text">Finance</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeTab === 'expenses' && expenses.length > 0 && (
            <button onClick={handleExportCSV} className="nex-btn-secondary py-2 px-3 text-xs flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4" /> Export CSV
            </button>
          )}
          {activeTab === 'summary' && isManager && (
            <button onClick={handleDownloadPDF} className="nex-btn-primary py-2 px-3 text-xs flex items-center gap-1.5">
              <Download className="w-4 h-4" /> Download PDF Report
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
      <div className="flex w-full max-w-full gap-1 bg-nex-elevated p-1 rounded-btn overflow-x-auto scrollbar-none">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === key ? 'bg-nex-surface text-nex-text shadow-sm' : 'text-nex-muted'
            }`}>
            <Icon className="w-3.5 h-3.5" /> {label}
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
          currentUserId={user?.id || ''}
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
          onMarkPaid={(id) => { setPaidFixedCostId(id); return Promise.resolve(); }}
          onDeleteFixedCost={handleDeleteFixedCost}
        />
      )}

      {activeTab === 'summary' && (
        <div className="space-y-4">
          <SummaryTab
            financeMembers={financeMembers}
            balances={balances}
            totalFixed={totalFixed}
          />
          <SettleUpSheet settlements={settlements} />
        </div>
      )}

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
