import { useEffect, useState } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { useMessStore } from '../../stores/messStore'
import { supabase } from '../../lib/supabase'
import { Expense, Deposit, FixedCost } from '../../types/database'
import {
  Wallet, Plus, TrendingUp, Receipt, PiggyBank,
  DollarSign, CheckCircle2, X, Filter, Download, Image as ImageIcon,
} from 'lucide-react'
import { format } from 'date-fns'
import { formatCurrency, getInitials } from '../../lib/utils'
import toast from 'react-hot-toast'

type Tab = 'expenses' | 'deposits' | 'fixed' | 'summary'

export default function FinancePage() {
  const { user } = useAuthStore()
  const { currentMess, members } = useMessStore()
  const [activeTab, setActiveTab] = useState<Tab>('expenses')
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([])
  const [balances, setBalances] = useState<Record<string, any>>({})

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
  const [fixCategory, setFixCategory] = useState('rent')
  const [fixAmount, setFixAmount] = useState('')
  const [fixLabel, setFixLabel] = useState('')

  const [loading, setLoading] = useState(false)
  const isManager = members.some(m => m.user_id === user?.id && m.role === 'manager')
  const approvedMembers = members.filter(m => m.status === 'approved')
  const currentMonth = format(new Date(), 'yyyy-MM')

  useEffect(() => {
    if (!currentMess?.id) return
    fetchAllData()
  }, [currentMess?.id])

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
    const { data } = await supabase.from('deposits').select('*, profiles(username)')
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
    const results: Record<string, any> = {}
    for (const member of approvedMembers) {
      const { data } = await supabase.rpc('calculate_member_balance', {
        p_user_id: member.user_id,
        p_mess_id: currentMess.id,
        p_month: currentMonth,
      })
      if (data) results[member.user_id] = data
    }
    setBalances(results)
  }

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentMess?.id || !user?.id) return
    setLoading(true)

    let receiptUrl = null
    if (expFile) {
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
      mess_id: currentMess.id, amount: parseFloat(expAmount), description: expDesc.trim(),
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
    setLoading(true)
    const { error } = await supabase.from('deposits').insert({
      mess_id: currentMess.id, user_id: depUserId, amount: parseFloat(depAmount),
      note: depNote.trim(), date: format(new Date(), 'yyyy-MM-dd'), verified: true, verified_by: user.id,
    })
    if (error) toast.error('Failed to add deposit')
    else { toast.success('Deposit recorded!'); setShowAddDeposit(false); setDepAmount(''); setDepNote(''); setDepUserId(''); fetchAllData() }
    setLoading(false)
  }

  const handleAddFixedCost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentMess?.id || !user?.id) return
    setLoading(true)
    const { error } = await supabase.from('fixed_costs').upsert({
      mess_id: currentMess.id, category: fixCategory, amount: parseFloat(fixAmount),
      label: fixLabel.trim() || null, month: currentMonth, created_by: user.id,
    }, { onConflict: 'mess_id,category,month' })
    if (error) toast.error('Failed to save')
    else { toast.success('Fixed cost saved!'); setShowAddFixed(false); setFixAmount(''); setFixLabel(''); fetchAllData() }
    setLoading(false)
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
      <div className="flex gap-1 bg-slate-100 p-1 rounded-btn overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === key ? 'bg-white text-nex-text shadow-sm' : 'text-nex-muted'
            }`}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* ── Expenses Tab ──────────────────── */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          {isManager && (
            <button onClick={() => setShowAddExpense(!showAddExpense)} className="nex-btn-primary text-sm">
              <Plus className="w-4 h-4" /> Add Expense
            </button>
          )}
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
                  <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-nex-border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
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
              <div key={exp.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg ${
                    exp.category === 'bazaar' ? 'bg-emerald-50' : exp.category === 'rent' ? 'bg-blue-50' : 'bg-amber-50'
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
              <div key={dep.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
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
                  <button type="submit" disabled={loading} className="nex-btn-primary disabled:opacity-50">Save</button>
                  <button type="button" onClick={() => setShowAddFixed(false)} className="nex-btn-secondary">Cancel</button>
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
                <div key={fc.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{icons[fc.category] || '📋'}</span>
                    <div>
                      <p className="text-sm font-medium text-nex-text capitalize">{fc.label || fc.category}</p>
                      <p className="text-xs text-nex-muted">{fc.month}</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-amber-600">{formatCurrency(Number(fc.amount))}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Summary Tab ───────────────────── */}
      {activeTab === 'summary' && (
        <div className="nex-card divide-y divide-nex-border">
          <div className="px-5 py-3 bg-slate-50">
            <div className="grid grid-cols-6 gap-2 text-[10px] font-semibold text-nex-muted uppercase tracking-wider">
              <span className="col-span-2">Member</span>
              <span className="text-right">Meals</span>
              <span className="text-right">Cost</span>
              <span className="text-right">Deposited</span>
              <span className="text-right">Balance</span>
            </div>
          </div>
          {approvedMembers.map(member => {
            const p = member.profiles as any
            const b = balances[member.user_id]
            return (
              <div key={member.user_id} className="px-5 py-3 hover:bg-slate-50/50 transition-colors">
                <div className="grid grid-cols-6 gap-2 items-center">
                  <div className="col-span-2 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                      {getInitials(p?.username || '?')}
                    </div>
                    <span className="text-sm font-medium text-nex-text truncate">{p?.username || 'Member'}</span>
                  </div>
                  <p className="text-sm text-nex-text text-right">{b?.personal_meals || 0}</p>
                  <p className="text-sm text-nex-text text-right">{formatCurrency(b?.individual_cost || 0)}</p>
                  <p className="text-sm text-nex-success text-right">{formatCurrency(b?.total_deposits || 0)}</p>
                  <p className={`text-sm font-semibold text-right ${(b?.balance || 0) >= 0 ? 'text-nex-success' : 'text-nex-danger'}`}>
                    {formatCurrency(b?.balance || 0)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
