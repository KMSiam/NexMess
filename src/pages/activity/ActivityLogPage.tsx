import { useEffect, useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useMessStore } from '../../stores/messStore'
import { supabase } from '../../lib/supabase'
import { Activity, ArrowLeft, Receipt, PiggyBank, Megaphone, UserPlus, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatCurrency, formatLocalizedDate, formatNumber } from '../../lib/utils'

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

const PAGE_STEP = 15

export default function ActivityLogPage() {
  const { t } = useTranslation()
  usePageTitle(t('activity.title'))
  const { currentMess } = useMessStore()
  const [logs, setLogs] = useState<LogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<'all' | LogItem['type']>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_STEP)

  const fetchActivityLogs = useCallback(async () => {
    if (!currentMess?.id) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [expRes, depRes, noticeRes, memberRes] = await Promise.all([
        supabase
          .from('expenses')
          .select('id, amount, description, category, created_at, profiles(username)')
          .eq('mess_id', currentMess.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('deposits')
          .select('id, amount, note, created_at, profiles!deposits_user_id_fkey(username)')
          .eq('mess_id', currentMess.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('notices')
          .select('id, message, created_at, created_by, profiles(username)')
          .eq('mess_id', currentMess.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('mess_members')
          .select('joined_at, role, status, profiles(username)')
          .eq('mess_id', currentMess.id)
          .order('joined_at', { ascending: false })
          .limit(20),
      ])

      const compiledLogs: LogItem[] = []

      // Expenses
      expRes.data?.forEach((e: any) => {
        const catLabel = t(`finance.categories.${e.category || 'other'}`, {
          defaultValue: e.category || 'other',
        })
        compiledLogs.push({
          id: `exp-${e.id}`,
          type: 'expense',
          title: t('activity.expense'),
          description: t('activity.addedExpenseDetail', {
            user: e.profiles?.username || t('common.member'),
            category: catLabel,
            desc: e.description || catLabel,
          }),
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
          title: t('activity.deposit'),
          description: t('activity.depositedFundsDetail', {
            user: d.profiles?.username || t('common.member'),
            note: d.note || t('activity.regularDeposit'),
          }),
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
          title: t('activity.notice'),
          description: t('activity.postedNotice', {
            user: n.profiles?.username || t('common.manager'),
            msg: n.message,
          }),
          created_at: n.created_at,
          user: n.profiles?.username,
        })
      })

      // Members
      memberRes.data?.forEach((m: any) => {
        if (m.status === 'approved') {
          const roleLabel = t(`common.${m.role || 'member'}`, { defaultValue: m.role })
          compiledLogs.push({
            id: `mem-${m.joined_at}`,
            type: 'member',
            title: t('activity.member'),
            description: t('activity.joinedMess', {
              user: m.profiles?.username || t('common.member'),
              role: roleLabel,
            }),
            created_at: m.joined_at,
            user: m.profiles?.username,
          })
        }
      })

      compiledLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setLogs(compiledLogs.slice(0, 50)) // Display top 50 logs
    } finally {
      setLoading(false)
    }
  }, [currentMess?.id, t])

  useEffect(() => {
    fetchActivityLogs()
  }, [fetchActivityLogs])

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return logs.filter((log) => {
      if (filterType !== 'all' && log.type !== filterType) return false
      if (!q) return true
      return (
        log.title.toLowerCase().includes(q) ||
        log.description.toLowerCase().includes(q) ||
        (log.user?.toLowerCase().includes(q) ?? false) ||
        (log.amount !== undefined && String(log.amount).includes(q))
      )
    })
  }, [logs, filterType, searchQuery])

  const visibleLogs = filteredLogs.slice(0, visibleCount)

  const filterChips: { key: 'all' | LogItem['type']; label: string }[] = [
    { key: 'all', label: t('activity.filterAll') },
    { key: 'expense', label: t('activity.expense') },
    { key: 'deposit', label: t('activity.deposit') },
    { key: 'notice', label: t('activity.notice') },
    { key: 'member', label: t('activity.member') },
  ]

  const icons = {
    expense: { element: <Receipt className="text-nex-warning h-4 w-4" />, bg: 'bg-nex-warning-light' },
    deposit: {
      element: <PiggyBank className="text-nex-success h-4 w-4" />,
      bg: 'bg-nex-success-light',
    },
    notice: { element: <Megaphone className="text-nex-secondary h-4 w-4" />, bg: 'bg-nex-secondary-light' },
    member: { element: <UserPlus className="text-nex-primary-ink h-4 w-4" />, bg: 'bg-nex-primary-light' },
  }

  if (!currentMess) return null

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Link
          to="/dashboard"
          className="rounded-btn hover:bg-nex-hover text-nex-muted p-2 transition-colors"
          aria-label="Back to Dashboard"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2">
          <Activity className="text-nex-primary h-6 w-6" />
          <h1 className="text-nex-text text-2xl font-bold">{t('activity.title')}</h1>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="nex-card space-y-3 p-4">
        <div className="relative">
          <Search className="text-nex-muted pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setVisibleCount(PAGE_STEP)
            }}
            placeholder={t('activity.searchPlaceholder')}
            className="nex-input py-2 pl-10 text-sm"
          />
        </div>
        <div className="scrollbar-none flex gap-1.5 overflow-x-auto pb-0.5">
          {filterChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => {
                setFilterType(chip.key)
                setVisibleCount(PAGE_STEP)
              }}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                filterType === chip.key
                  ? 'bg-nex-primary text-white shadow-sm'
                  : 'bg-nex-elevated text-nex-muted hover:text-nex-text hover:bg-nex-hover'
              }`}
            >
              {chip.label}
            </button>
          ))}
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
        ) : filteredLogs.length === 0 ? (
          <p className="text-nex-muted py-8 text-center text-sm">{t('dashboard.noActivity')}</p>
        ) : (
          <>
            <div className="before:bg-nex-border relative space-y-6 before:absolute before:top-2 before:bottom-2 before:left-[17px] before:w-0.5">
              {visibleLogs.map((log) => {
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
                          {formatLocalizedDate(log.created_at, 'MMM d, h:mm a')}
                        </p>
                      </div>
                      <p className="text-nex-muted mt-1 text-xs leading-relaxed">{log.description}</p>
                      {log.amount && (
                        <p className="text-nex-text mt-1 text-xs font-semibold">
                          {t('common.amount')}:{' '}
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

            {filteredLogs.length > visibleCount && (
              <div className="border-nex-border mt-6 border-t pt-4 text-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => prev + PAGE_STEP)}
                  className="nex-btn-secondary px-5 py-2 text-xs"
                >
                  {t('activity.showMore')} ({formatNumber(filteredLogs.length - visibleCount)})
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
