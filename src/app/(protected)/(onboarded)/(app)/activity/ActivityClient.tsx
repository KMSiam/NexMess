'use client'

import { useEffect, useState, useCallback } from 'react'
import { useMessStore } from '@/stores/appStore'
import { getActivityLogs } from '@/actions/dashboard'
import { format } from 'date-fns'
import { Activity, ArrowLeft, Receipt, PiggyBank, Megaphone, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { usePusherRealtime } from '@/hooks/usePusherRealtime'

interface LogItem {
  id: string
  type: 'expense' | 'deposit' | 'notice' | 'member'
  title: string
  description: string
  created_at: string
  amount?: number
  user?: string
}

export default function ActivityClient() {
  const { currentMess } = useMessStore()
  const [logs, setLogs] = useState<LogItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    if (!currentMess?.id) return
    setLoading(true)

    try {
      const data = await getActivityLogs(currentMess.id)
      const compiledLogs: LogItem[] = []

      // Expenses
      data.expenses.forEach((e: any) => {
        compiledLogs.push({
          id: `exp-${e.id}`,
          type: 'expense',
          title: 'Expense Logged',
          description: `${e.username || 'Member'} added ${e.category} expense: "${e.description || e.category}"`,
          amount: Number(e.amount),
          created_at: e.created_at,
          user: e.username,
        })
      })

      // Deposits
      data.deposits.forEach((d: any) => {
        compiledLogs.push({
          id: `dep-${d.id}`,
          type: 'deposit',
          title: 'Deposit Recorded',
          description: `${d.username || 'Member'} deposited funds: "${d.note || 'Regular Deposit'}"`,
          amount: Number(d.amount),
          created_at: d.created_at,
          user: d.username,
        })
      })

      // Notices
      data.notices.forEach((n: any) => {
        compiledLogs.push({
          id: `not-${n.id}`,
          type: 'notice',
          title: 'Notice Board Update',
          description: `${n.username || 'Manager'} posted a notice: "${n.message}"`,
          created_at: n.created_at,
          user: n.username,
        })
      })

      // Members
      data.members.forEach((m: any) => {
        if (m.status === 'approved') {
          compiledLogs.push({
            id: `mem-${m.joined_at}`,
            type: 'member',
            title: 'Member Approved',
            description: `${m.username || 'User'} joined the mess as ${m.role}.`,
            created_at: m.joined_at,
            user: m.username,
          })
        }
      })

      compiledLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setLogs(compiledLogs.slice(0, 50)) // Display top 50 logs
    } catch (err) {
      console.error('Failed to load activity logs:', err)
    } finally {
      setLoading(false)
    }
  }, [currentMess?.id])

  useEffect(() => {
    if (currentMess?.id) {
      fetchLogs()
    }
  }, [currentMess?.id, fetchLogs])

  // Pusher realtime subscription
  usePusherRealtime(currentMess?.id, ['expenses', 'deposits', 'notices', 'mess_members'], fetchLogs)

  const icons = {
    expense: { element: <Receipt className="h-4 w-4 text-amber-600" />, bg: 'bg-amber-500/10' },
    deposit: {
      element: <PiggyBank className="h-4 w-4 text-emerald-600" />,
      bg: 'bg-emerald-500/10',
    },
    notice: { element: <Megaphone className="h-4 w-4 text-blue-600" />, bg: 'bg-blue-500/10' },
    member: { element: <UserPlus className="h-4 w-4 text-purple-600" />, bg: 'bg-purple-500/10' },
  }

  if (!currentMess) return null

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="rounded-btn hover:bg-nex-hover text-nex-muted p-2 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2">
          <Activity className="text-nex-primary h-6 w-6" />
          <h1 className="text-nex-text text-2xl font-bold">Full Activity Log</h1>
        </div>
      </div>

      <div className="nex-card p-6">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="bg-nex-elevated h-8 w-8 shrink-0 animate-pulse rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="bg-nex-elevated h-3 w-1/4 animate-pulse rounded" />
                  <div className="bg-nex-elevated h-3 w-3/4 animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <p className="text-nex-muted py-8 text-center text-sm">No activity recorded yet.</p>
        ) : (
          <div className="before:bg-nex-border relative space-y-6 before:absolute before:top-2 before:bottom-2 before:left-[17px] before:w-0.5">
            {logs.map((log) => {
              const iconMeta = icons[log.type]
              return (
                <div key={log.id} className="relative flex gap-4">
                  <div
                    className={`h-9 w-9 rounded-full ${iconMeta.bg} border-nex-bg z-10 flex shrink-0 items-center justify-center border`}
                  >
                    {iconMeta.element}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-nex-text text-sm font-semibold">{log.title}</p>
                      <p className="text-nex-muted text-[10px] whitespace-nowrap">
                        {format(new Date(log.created_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <p className="text-nex-muted mt-1 text-xs leading-relaxed">{log.description}</p>
                    {log.amount && (
                      <p className="text-nex-text mt-1 text-xs font-semibold">
                        Amount:{' '}
                        <span
                          className={log.type === 'deposit' ? 'text-nex-success' : 'text-nex-text'}
                        >
                          {formatCurrency(log.amount)}
                        </span>
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
