import { useEffect, useState } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { useMessStore } from '../../stores/messStore'
import { supabase } from '../../lib/supabase'
import { Expense, Deposit, FixedCost } from '../../types/database'
import {
  Wallet, Plus, TrendingUp, Receipt, PiggyBank,
  DollarSign, CheckCircle2, X, Filter, Download, Image as ImageIcon,
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, isThisMonth } from 'date-fns'
import { formatCurrency, getInitials } from '../../lib/utils'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { CardSkeleton, ListSkeleton, Skeleton } from '../../components/Skeleton'

type Tab = 'expenses' | 'deposits' | 'fixed' | 'summary'

export default function FinancePage() {
  const { user, profile } = useAuthStore()
  const { currentMess, members } = useMessStore()
  const [activeTab, setActiveTab] = useState<Tab>('expenses')
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([])
  const [balances, setBalances] = useState<Record<string, any>>({})
  const [loadingData, setLoadingData] = useState(true)

  // Expense form
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [expAmount, setExpAmount] = useState('')
  const [expDesc, setExpDesc] = useState('')
  const [expCategory, setExpCategory] = useState('bazaar')
  const [expFile, setExpFile] = useState<File | null>(null)

  // Deposit form
  const [showAddDeposit, setShowAddDeposit] = useState(false)
  const [depUserId, setDepUserId] = useState('')
  const [depAmount, setDepAmount] = useState('')
  const [depNote, setDepNote] = useState('')

  // Fixed cost form
  const [showAddFixed, setShowAddFixed] = useState(false)
  const [editFixedCostId, setEditFixedCostId] = useState<string | null>(null)
  const [fixCategory, setFixCategory] = useState('rent')
  const [fixAmount, setFixAmount] = useState('')
  const [fixLabel, setFixLabel] = useState('')

  const [loading, setLoading] = useState(false)
  const isManager = members.some(m => m.user_id === user?.id && m.role === 'manager')
  const approvedMembers = members.filter(m => m.status === 'approved')
  const financeMembers = members.filter(m => m.status === 'approved' || m.status === 'left')
  const currentMonth = format(new Date(), 'yyyy-MM')

  useEffect(() => {
    if (!currentMess?.id) return
    setLoadingData(true)
    fetchAllData().finally(() => setLoadingData(false))

    // Real-time subscription for financial records
    const channel = supabase
      .channel('finance-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `mess_id=eq.${currentMess.id}` },
        () => fetchAllData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deposits', filter: `mess_id=eq.${currentMess.id}` },
        () => fetchAllData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fixed_costs', filter: `mess_id=eq.${currentMess.id}` },
        () => fetchAllData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meals', filter: `mess_id=eq.${currentMess.id}` },
        () => fetchBalances() // Refresh balances when meals change
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentMess?.id, members.length, currentMonth])

  const fetchAllData = async () => {
    if (!currentMess?.id) return
    await Promise.all([fetchExpenses(), fetchDeposits(), fetchFixedCosts(), fetchBalances()])
  }

  const fetchExpenses = async () => {
    const { data } = await supabase.from('expenses').select('*, profiles(username)')
      .eq('mess_id', currentMess!.id).order('date', { ascending: false }).limit(100)
    if (data) setExpenses(data as Expense[])
  }

  const fetchDeposits = async () => {
    const { data } = await supabase.from('deposits').select('*, profiles!deposits_user_id_fkey(username)')
      .eq('mess_id', currentMess!.id).order('date', { ascending: false }).limit(100)
    if (data) setDeposits(data as Deposit[])
  }

  const fetchFixedCosts = async () => {
    const { data } = await supabase.from('fixed_costs').select('*')
      .eq('mess_id', currentMess!.id).eq('month', currentMonth)
    if (data) setFixedCosts(data as FixedCost[])
  }

  const fetchBalances = async () => {
    if (!currentMess?.id) return
    const messId = currentMess.id
    const month = currentMonth
    const settled = await Promise.all(
      financeMembers.map(async (member) => {
        const { data } = await supabase.rpc('calculate_member_balance', {
          p_user_id: member.user_id,
          p_mess_id: messId,
          p_month: month,
        })
        const row = Array.isArray(data) ? data[0] : data
        return [member.user_id, row] as const
      })
    )
    const results: Record<string, any> = {}
    for (const [uid, row] of settled) {
      if (row) results[uid] = row
    }
    setBalances(results)
  }

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

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentMess?.id || !user?.id) return

    const amount = parseFloat(expAmount)
    if (!isFinite(amount) || amount <= 0) {
      toast.error('Enter a valid amount greater than 0')
      return
    }
    setLoading(true)

    let receiptUrl = null
    if (expFile) {
      if (!expFile.type.startsWith('image/')) {
        toast.error('Receipt must be an image')
        setLoading(false)
        return
      }
      if (expFile.size > 5 * 1024 * 1024) {
        toast.error('Receipt must be under 5MB')
        setLoading(false)
        return
      }
      const ext = expFile.name.split('.').pop()
      const fileName = `${currentMess.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('receipts').upload(fileName, expFile)
      if (uploadError) {
        toast.error('Failed to upload receipt')
        setLoading(false)
        return
      }
      receiptUrl = supabase.storage.from('receipts').getPublicUrl(fileName).data.publicUrl
    }

    const { error } = await supabase.from('expenses').insert({
      mess_id: currentMess.id, amount, description: expDesc.trim().slice(0, 500),
      category: expCategory, expense_type: expCategory === 'bazaar' ? 'bazaar' : 'other',
      created_by: user.id, date: format(new Date(), 'yyyy-MM-dd'), receipt_url: receiptUrl,
    })
    if (error) toast.error('Failed to add expense')
    else { toast.success('Expense added!'); setShowAddExpense(false); setExpAmount(''); setExpDesc(''); setExpFile(null); fetchAllData() }
    setLoading(false)
  }

  const handleAddDeposit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentMess?.id || !user?.id) return
    const amount = parseFloat(depAmount)
    if (!isFinite(amount) || amount <= 0) {
      toast.error('Enter a valid amount greater than 0')
      return
    }
    if (!depUserId) {
      toast.error('Choose a member')
      return
    }
    setLoading(true)
    const { error } = await supabase.from('deposits').insert({
      mess_id: currentMess.id, user_id: depUserId, amount,
      note: depNote.trim().slice(0, 500), date: format(new Date(), 'yyyy-MM-dd'), verified: true, verified_by: user.id,
    })
    if (error) toast.error('Failed to add deposit')
    else { toast.success('Deposit recorded!'); setShowAddDeposit(false); setDepAmount(''); setDepNote(''); setDepUserId(''); fetchAllData() }
    setLoading(false)
  }

  const handleAddFixedCost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentMess?.id || !user?.id) return
    setLoading(true)
    
    let error;
    if (editFixedCostId) {
      const res = await supabase.from('fixed_costs').update({
        category: fixCategory, amount: parseFloat(fixAmount), label: fixLabel.trim() || null
      }).eq('id', editFixedCostId)
      error = res.error
    } else {
      const res = await supabase.from('fixed_costs').insert({
        mess_id: currentMess.id, category: fixCategory, amount: parseFloat(fixAmount),
        label: fixLabel.trim() || null, month: currentMonth, created_by: user.id,
      })
      error = res.error
    }

    if (error) toast.error('Failed to save')
    else { 
      toast.success('Fixed cost saved!')
      setShowAddFixed(false)
      setFixAmount('')
      setFixLabel('')
      setFixCategory('rent')
      setEditFixedCostId(null)
      fetchAllData() 
    }
    setLoading(false)
  }

  const startEditFixedCost = (fc: FixedCost) => {
    setFixCategory(fc.category)
    setFixAmount(fc.amount.toString())
    setFixLabel(fc.label || '')
    setEditFixedCostId(fc.id)
    setShowAddFixed(true)
  }

  const markFixedCostPaid = async (id: string) => {
    if (!window.confirm("Are you sure you want to mark this as paid? You won't be able to edit it afterward.")) return
    
    const { error } = await supabase.from('fixed_costs').update({ is_paid: true }).eq('id', id)
    if (error) toast.error('Failed to mark as paid')
    else {
      toast.success('Marked as paid!')
      fetchAllData()
    }
  }

  const handleDownloadPDF = () => {
    if (!currentMess) return
    const doc = new jsPDF()
    
    // Header
    const now = new Date()
    const startDate = startOfMonth(now)
    const endDate = isThisMonth(now) ? now : endOfMonth(now)
    const durationStr = `${format(startDate, 'dd MMM yyyy')} to ${format(endDate, 'dd MMM yyyy')}`

    doc.setFontSize(20)
    doc.text(`${currentMess.name} - Finance Report`, 14, 22)
    doc.setFontSize(11)
    doc.setTextColor(100)
    doc.text(`Duration: ${durationStr} | Generated by: ${profile?.username || 'Manager'}`, 14, 30)
    
    // Global Summary
    const anyB = Object.values(balances)[0]
    const mealRate = Number(anyB?.meal_rate || 0)
    const totalMessMeals = Object.values(balances).reduce((sum, b) => sum + Number(b?.personal_meals || 0), 0)
    
    doc.setTextColor(0)
    doc.setFontSize(12)
    doc.text(`Total Meals Served: ${totalMessMeals}`, 14, 42)
    doc.text(`Meal Rate: Tk ${mealRate.toFixed(2)}`, 14, 48)
    doc.text(`Total Bazaar Expenses: Tk ${Number(totalExpenses || 0).toFixed(2)}`, 110, 42)
    doc.text(`Total Deposits Collected: Tk ${Number(totalDeposits || 0).toFixed(2)}`, 110, 48)

    // Fixed Costs
    let startY = 60
    if (fixedCosts.length > 0) {
      autoTable(doc, {
        startY,
        head: [['Fixed Cost Description', 'Amount']],
        body: fixedCosts.map(fc => [fc.category + (fc.label ? ` (${fc.label})` : ''), `Tk ${fc.amount.toFixed(2)}`]),
        foot: [['Total Fixed Costs', `Tk ${totalFixed.toFixed(2)}`]],
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] }
      })
      startY = (doc as any).lastAutoTable.finalY + 15
    }

    // Member Breakdowns
    const perPersonFixedCost = financeMembers.length > 0 ? totalFixed / financeMembers.length : 0

    autoTable(doc, {
      startY,
      head: [['Member', 'Meals', 'Meal Cost', 'Fixed Cost', 'Total Exp', 'Deposited', 'Balance']],
      body: financeMembers.map(member => {
        const p = member.profiles as any
        const b = balances[member.user_id] || {}
        const mealCost = Number(b.individual_cost || 0)
        const deposited = Number(b.total_deposits || 0)
        const totalExp = mealCost + perPersonFixedCost
        const realBalance = deposited - totalExp
        
        return [
          (p?.username || 'Unknown') + (member.status === 'left' ? ' (Left)' : ''),
          Number(b.personal_meals || 0).toString(),
          `Tk ${mealCost.toFixed(2)}`,
          `Tk ${perPersonFixedCost.toFixed(2)}`,
          `Tk ${totalExp.toFixed(2)}`,
          `Tk ${deposited.toFixed(2)}`,
          `Tk ${realBalance.toFixed(2)}`
        ]
      }),
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] },
      columnStyles: { 6: { fontStyle: 'bold' } }
    })

    doc.save(`NexMess_${currentMess.name.replace(/\s+/g, '_')}_Report_${currentMonth}.pdf`)
    toast.success('PDF Report Downloaded!')
  }

  const totalExpenses = expenses.filter(e => e.date.startsWith(currentMonth)).reduce((s, e) => s + Number(e.amount), 0)
  const totalDeposits = deposits.filter(d => d.date.startsWith(currentMonth) && d.verified).reduce((s, d) => s + Number(d.amount), 0)
  const totalFixed = fixedCosts.reduce((s, f) => s + Number(f.amount), 0)

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'expenses', label: 'Expenses', icon: Receipt },
    { key: 'deposits', label: 'Deposits', icon: PiggyBank },
    { key: 'fixed', label: 'Fixed Costs', icon: DollarSign },
    { key: 'summary', label: 'Summary', icon: TrendingUp },
  ]

  if (!currentMess) return null

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Wallet className="w-6 h-6 text-nex-primary" />
        <h1 className="text-2xl font-bold text-nex-text">Finance</h1>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="nex-card p-5">
          <p className="text-xs font-medium text-nex-muted uppercase tracking-wider">Total Bazaar</p>
          <p className="mt-2 text-2xl font-bold text-nex-text">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="nex-card p-5">
          <p className="text-xs font-medium text-nex-muted uppercase tracking-wider">Total Deposits</p>
          <p className="mt-2 text-2xl font-bold text-nex-success">{formatCurrency(totalDeposits)}</p>
        </div>
        <div className="nex-card p-5">
          <p className="text-xs font-medium text-nex-muted uppercase tracking-wider">Fixed Costs</p>
          <p className="mt-2 text-2xl font-bold text-amber-600">{formatCurrency(totalFixed)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-nex-elevated p-1 rounded-btn overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === key ? 'bg-nex-surface text-nex-text shadow-sm' : 'text-nex-muted'
            }`}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* ── Expenses Tab ──────────────────── */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <button onClick={() => setShowAddExpense(!showAddExpense)} className="nex-btn-primary text-sm">
            <Plus className="w-4 h-4" /> Add Expense
          </button>
          {showAddExpense && (
            <div className="nex-card p-5 animate-slide-up">
              <form onSubmit={handleAddExpense} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-nex-text mb-1">Amount (৳)</label>
                    <input type="number" value={expAmount} onChange={e => setExpAmount(e.target.value)}
                      className="nex-input" placeholder="0.00" required step="0.01" min="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-nex-text mb-1">Category</label>
                    <select value={expCategory} onChange={e => setExpCategory(e.target.value)} className="nex-input">
                      <option value="bazaar">🛒 Bazaar</option><option value="utilities">💡 Utilities</option>
                      <option value="rent">🏠 Rent</option><option value="other">📋 Other</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-nex-text mb-1">Description</label>
                  <input type="text" value={expDesc} onChange={e => setExpDesc(e.target.value)} className="nex-input" placeholder="e.g., Fish, vegetables" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-nex-text mb-1">Receipt (optional)</label>
                  <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-nex-border rounded-lg cursor-pointer hover:bg-nex-hover transition-colors">
                    <ImageIcon className="w-4 h-4 text-nex-muted" />
                    <span className="text-sm text-nex-muted">{expFile ? expFile.name : 'Upload receipt photo'}</span>
                    <input type="file" accept="image/*" onChange={e => setExpFile(e.target.files?.[0] || null)} className="hidden" />
                  </label>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" disabled={loading} className="nex-btn-primary disabled:opacity-50">Save</button>
                  <button type="button" onClick={() => setShowAddExpense(false)} className="nex-btn-secondary">Cancel</button>
                </div>
              </form>
            </div>
          )}
          <div className="nex-card divide-y divide-nex-border">
            {expenses.length === 0 ? (
              <p className="p-8 text-center text-nex-muted text-sm">No expenses recorded yet.</p>
            ) : expenses.map(exp => (
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
                        <a href={exp.receipt_url} target="_blank" rel="noreferrer" title="View Receipt"
                          className="text-nex-primary hover:text-blue-700 transition-colors">
                          <Receipt className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </p>
                    <p className="text-xs text-nex-muted">{format(new Date(exp.date), 'MMM d')} · {(exp as any).profiles?.username}</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-nex-text">{formatCurrency(Number(exp.amount))}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Deposits Tab ──────────────────── */}
      {activeTab === 'deposits' && (
        <div className="space-y-4">
          {isManager && (
            <button onClick={() => setShowAddDeposit(!showAddDeposit)} className="nex-btn-primary text-sm">
              <Plus className="w-4 h-4" /> Record Deposit
            </button>
          )}
          {showAddDeposit && (
            <div className="nex-card p-5 animate-slide-up">
              <form onSubmit={handleAddDeposit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-nex-text mb-1">Member</label>
                    <select value={depUserId} onChange={e => setDepUserId(e.target.value)} className="nex-input" required>
                      <option value="">Select member</option>
                      {approvedMembers.map(m => {
                        const p = m.profiles as any
                        return <option key={m.user_id} value={m.user_id}>{p?.username || 'Member'}</option>
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-nex-text mb-1">Amount (৳)</label>
                    <input type="number" value={depAmount} onChange={e => setDepAmount(e.target.value)}
                      className="nex-input" placeholder="0.00" required step="0.01" min="0" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-nex-text mb-1">Note</label>
                  <input type="text" value={depNote} onChange={e => setDepNote(e.target.value)} className="nex-input" placeholder="e.g., May deposit" />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={loading} className="nex-btn-primary disabled:opacity-50">Save</button>
                  <button type="button" onClick={() => setShowAddDeposit(false)} className="nex-btn-secondary">Cancel</button>
                </div>
              </form>
            </div>
          )}
          <div className="nex-card divide-y divide-nex-border">
            {deposits.length === 0 ? (
              <p className="p-8 text-center text-nex-muted text-sm">No deposits recorded yet.</p>
            ) : deposits.map(dep => (
              <div key={dep.id} className="flex items-center justify-between px-5 py-3 hover:bg-nex-hover transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <PiggyBank className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-nex-text">{(dep as any).profiles?.username}</p>
                    <p className="text-xs text-nex-muted">{format(new Date(dep.date), 'MMM d')} {dep.note && `· ${dep.note}`}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-nex-success">{formatCurrency(Number(dep.amount))}</p>
                  {dep.verified && <span className="text-[10px] text-nex-success flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" />Verified</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Fixed Costs Tab ───────────────── */}
      {activeTab === 'fixed' && (
        <div className="space-y-4">
          {isManager && (
            <button onClick={() => setShowAddFixed(!showAddFixed)} className="nex-btn-primary text-sm">
              <Plus className="w-4 h-4" /> Add Fixed Cost
            </button>
          )}
          {showAddFixed && (
            <div className="nex-card p-5 animate-slide-up">
              <form onSubmit={handleAddFixedCost} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-nex-text mb-1">Category</label>
                    <select value={fixCategory} onChange={e => setFixCategory(e.target.value)} className="nex-input">
                      <option value="rent">🏠 Rent</option><option value="utilities">💡 Utilities</option>
                      <option value="maid">🧹 Maid</option><option value="internet">🌐 Internet</option>
                      <option value="gas">🔥 Gas</option><option value="other">📋 Other</option>
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
                  <button type="button" onClick={() => { setShowAddFixed(false); setEditFixedCostId(null); setFixCategory('rent'); setFixAmount(''); setFixLabel('') }} className="nex-btn-secondary">Cancel</button>
                </div>
              </form>
            </div>
          )}
          <div className="nex-card divide-y divide-nex-border">
            {fixedCosts.length === 0 ? (
              <p className="p-8 text-center text-nex-muted text-sm">No fixed costs for {format(new Date(), 'MMMM yyyy')}.</p>
            ) : fixedCosts.map(fc => {
              const icons: Record<string, string> = { rent: '🏠', utilities: '💡', maid: '🧹', internet: '🌐', gas: '🔥', other: '📋' }
              return (
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
                      <span className="text-[10px] text-nex-success flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" />Paid</span>
                    ) : isManager && (
                      <div className="flex gap-2 mt-1">
                        <button onClick={() => startEditFixedCost(fc)} className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors">Edit</button>
                        <button onClick={() => markFixedCostPaid(fc.id)} className="text-xs font-medium text-emerald-600 hover:text-emerald-800 transition-colors flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" /> Mark Paid</button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Summary Tab ───────────────────── */}
      {activeTab === 'summary' && (
        <div className="space-y-4">
          {isManager && (
            <div className="flex justify-end">
              <button onClick={handleDownloadPDF} className="nex-btn-primary py-2 px-4 text-sm flex items-center gap-2">
                <Download className="w-4 h-4" /> Download PDF Report
              </button>
            </div>
          )}
          <div className="nex-card divide-y divide-nex-border">
            {/* Desktop Table Header */}
            <div className="hidden sm:block px-5 py-3 bg-nex-elevated">
            <div className="grid grid-cols-6 gap-2 text-[10px] font-semibold text-nex-muted uppercase tracking-wider">
              <span className="col-span-2">Member</span>
              <span className="text-right">Meals</span>
              <span className="text-right">Cost</span>
              <span className="text-right">Deposited</span>
              <span className="text-right">Balance</span>
            </div>
            </div>
          {financeMembers.map(member => {
            const p = member.profiles as any
            const b = balances[member.user_id] || {}
            const mealCost = Number(b.individual_cost || 0)
            const perPersonFixedCost = financeMembers.length > 0 ? totalFixed / financeMembers.length : 0
            const totalExp = mealCost + perPersonFixedCost
            const deposited = Number(b.total_deposits || 0)
            const realBalance = deposited - totalExp

            return (
              <div key={member.user_id} className="px-4 sm:px-5 py-3 hover:bg-nex-hover transition-colors">
                {/* Desktop Row */}
                <div className="hidden sm:grid grid-cols-6 gap-2 items-center">
                  <div className="col-span-2 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                      {getInitials(p?.username || '?')}
                    </div>
                    <span className="text-sm font-medium text-nex-text truncate">
                      {p?.username || 'Member'}
                      {member.status === 'left' && <span className="ml-2 text-[10px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Left</span>}
                    </span>
                  </div>
                  <p className="text-sm text-nex-text text-right">{b.personal_meals || 0}</p>
                  <p className="text-sm text-nex-text text-right">{formatCurrency(totalExp)}</p>
                  <p className="text-sm text-nex-success text-right">{formatCurrency(deposited)}</p>
                  <p className={`text-sm font-semibold text-right ${realBalance >= 0 ? 'text-nex-success' : 'text-nex-danger'}`}>
                    {formatCurrency(realBalance)}
                  </p>
                </div>
                {/* Mobile Card */}
                <div className="sm:hidden">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                      {getInitials(p?.username || '?')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-nex-text truncate flex items-center gap-2">
                        {p?.username || 'Member'}
                        {member.status === 'left' && <span className="text-[10px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Left</span>}
                      </p>
                      <p className="text-[10px] text-nex-muted">{b.personal_meals || 0} meals</p>
                    </div>
                    <p className={`text-sm font-bold ${realBalance >= 0 ? 'text-nex-success' : 'text-nex-danger'}`}>
                      {formatCurrency(realBalance)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 ml-12">
                    <div className="text-[10px] text-nex-muted">Cost: <span className="font-medium text-nex-text">{formatCurrency(totalExp)}</span></div>
                    <div className="text-[10px] text-nex-muted">Deposited: <span className="font-medium text-nex-success">{formatCurrency(deposited)}</span></div>
                  </div>
                </div>
              </div>
            )
          })}
          </div>
        </div>
      )}
    </div>
  )
}
