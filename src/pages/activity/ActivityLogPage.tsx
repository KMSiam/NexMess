import { useEffect, useState, useCallback } from 'react'
import { useMessStore } from '../../stores/messStore'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import { Activity, ArrowLeft, Receipt, PiggyBank, Megaphone, UserPlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatCurrency } from '../../lib/utils'

// Hooks
import { usePageTitle } from '../../hooks/usePageTitle'

interface LogItem {
  id: string
  type: 'expense' | 'deposit' | 'notice' | 'member'
  title: string
  description: string
  created_at: string
  amount?: number
  user?: string
}

export default function ActivityLogPage() {
  usePageTitle('Activity Log')
  const { currentMess } = useMessStore()
  const [logs, setLogs] = useState<LogItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchActivityLogs = useCallback(async () => {
    if (!currentMess?.id) return
    setLoading(true)

    const [expRes, depRes, noticeRes, memberRes] = await Promise.all([
      supabase.from('expenses').select('id, amount, description, category, created_at, profiles(username)').eq('mess_id', currentMess.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('deposits').select('id, amount, note, created_at, profiles!deposits_user_id_fkey(username)').eq('mess_id', currentMess.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('notices').select('id, message, created_at, created_by, profiles(username)').eq('mess_id', currentMess.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('mess_members').select('joined_at, role, status, profiles(username)').eq('mess_id', currentMess.id).order('joined_at', { ascending: false }).limit(20),
    ])

    const compiledLogs: LogItem[] = []

    // Expenses
    expRes.data?.forEach((e: any) => {
      compiledLogs.push({
        id: `exp-${e.id}`,
        type: 'expense',
        title: 'Expense Logged',
        description: `${e.profiles?.username || 'Member'} added ${e.category} expense: "${e.description || e.category}"`,
        amount: Number(e.amount),
        created_at: e.created_at,
        user: e.profiles?.username,
      })
    })

    // Deposits
    depRes.data?.forEach((d: any) => {
      compiledLogs.push({
        id: `dep-${d.id}`,
        type: 'deposit',
        title: 'Deposit Recorded',
        description: `${d.profiles?.username || 'Member'} deposited funds: "${d.note || 'Regular Deposit'}"`,
        amount: Number(d.amount),
        created_at: d.created_at,
        user: d.profiles?.username,
      })
    })

    // Notices
    noticeRes.data?.forEach((n: any) => {
      compiledLogs.push({
        id: `not-${n.id}`,
        type: 'notice',
        title: 'Notice Board Update',
        description: `${n.profiles?.username || 'Manager'} posted a notice: "${n.message}"`,
        created_at: n.created_at,
        user: n.profiles?.username,
      })
    })

    // Members
    memberRes.data?.forEach((m: any) => {
      if (m.status === 'approved') {
        compiledLogs.push({
          id: `mem-${m.joined_at}`,
          type: 'member',
          title: 'Member Approved',
          description: `${m.profiles?.username || 'User'} joined the mess as ${m.role}.`,
          created_at: m.joined_at,
          user: m.profiles?.username,
        })
      }
    })

    compiledLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    setLogs(compiledLogs.slice(0, 50)) // Display top 50 logs
    setLoading(false)
  }, [currentMess?.id])

  useEffect(() => {
    fetchActivityLogs()
  }, [fetchActivityLogs])

  const icons = {
    expense: { element: <Receipt className="w-4 h-4 text-amber-600" />, bg: 'bg-amber-500/10' },
    deposit: { element: <PiggyBank className="w-4 h-4 text-emerald-600" />, bg: 'bg-emerald-500/10' },
    notice: { element: <Megaphone className="w-4 h-4 text-blue-600" />, bg: 'bg-blue-500/10' },
    member: { element: <UserPlus className="w-4 h-4 text-purple-600" />, bg: 'bg-purple-500/10' },
  }

  if (!currentMess) return null

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/dashboard" className="p-2 rounded-btn hover:bg-nex-hover text-nex-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <Activity className="w-6 h-6 text-nex-primary" />
          <h1 className="text-2xl font-bold text-nex-text">Full Activity Log</h1>
        </div>
      </div>

      <div className="nex-card p-6">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-4 items-center">
                <div className="w-8 h-8 rounded-full bg-nex-elevated shrink-0 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/4 bg-nex-elevated rounded animate-pulse" />
                  <div className="h-3 w-3/4 bg-nex-elevated rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <p className="text-center text-nex-muted py-8 text-sm">No activity recorded yet.</p>
        ) : (
          <div className="space-y-6 relative before:absolute before:top-2 before:bottom-2 before:left-[17px] before:w-0.5 before:bg-nex-border">
            {logs.map(log => {
              const iconMeta = icons[log.type]
              return (
                <div key={log.id} className="flex gap-4 relative">
                  <div className={`w-9 h-9 rounded-full ${iconMeta.bg} flex items-center justify-center shrink-0 z-10 border border-nex-bg`}>
                    {iconMeta.element}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-semibold text-nex-text">{log.title}</p>
                      <p className="text-[10px] text-nex-muted whitespace-nowrap">
                        {format(new Date(log.created_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <p className="text-xs text-nex-muted mt-1 leading-relaxed">{log.description}</p>
                    {log.amount && (
                      <p className="text-xs font-semibold text-nex-text mt-1">
                        Amount: <span className={log.type === 'deposit' ? 'text-nex-success' : 'text-nex-text'}>{formatCurrency(log.amount)}</span>
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
