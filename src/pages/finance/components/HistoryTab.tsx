import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useMessStore } from '../../../stores/messStore'
import { useAuthStore } from '../../../stores/authStore'
import { supabase } from '../../../lib/supabase'
import { History, Plus, Download, RefreshCw, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { formatCurrency, formatNumber, formatLocalizedDate } from '../../../lib/utils'
import { computeSettlements, type ReportData } from '../../../lib/reportSettlements'
import { sanitizeAppError } from '../../../lib/errorHandler'
import toast from 'react-hot-toast'
import { CardSkeleton, ListSkeleton } from '../../../components/Skeleton'
import { createRealtimeChannelName } from '../../../hooks/useRealtimeTable'

// Shape of a monthly_reports row (RLS-scoped: managers only see their mess's rows)
interface MonthlyReport {
  id: string
  mess_id: string
  month: string // 'YYYY-MM'
  generated_at: string
  generated_by: string | null
  summary: ReportSummary
}

interface BalanceEntry {
  user_id: string
  username: string
  status: string
  personal_meals: number
  individual_cost: number
  total_deposits: number
}

interface FixedEntry {
  description: string
  amount: number
}

interface ExpenseEntry {
  date: string
  category: string
  description: string
  amount: number
  logged_by: string
}

interface MealEntry {
  date: string
  username: string
  user_id: string
  lunch: boolean
  dinner: boolean
  guest_lunch: number
  guest_dinner: number
}

interface DepositEntry {
  date: string
  username: string
  amount: number
  note: string
}

// Mirrors the JSONB compiled by archive_monthly_report()
interface ReportSummary {
  month: string
  totalExpenses: number
  totalDeposits: number
  totalFixed: number
  totalMeals: number
  mealRate: number
  financeMembersCount: number
  balances: BalanceEntry[]
  fixedCosts: FixedEntry[]
  dailyExpenses?: ExpenseEntry[]
  dailyMeals?: MealEntry[]
  dailyDeposits?: DepositEntry[]
}

export default function HistoryTab() {
  const { t } = useTranslation()
  const { currentMess, members } = useMessStore()
  const { user, profile } = useAuthStore()
  const isManager = members.some((m) => m.user_id === user?.id && m.role === 'manager' && m.status === 'approved')
  const [reports, setReports] = useState<MonthlyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [downloadingMonth, setDownloadingMonth] = useState<string | null>(null)
  // Default month picker to last month — the most likely report a manager wants.
  const [genMonth, setGenMonth] = useState(() => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - 1)
    return format(d, 'yyyy-MM')
  })

  const fetchReports = useCallback(async () => {
    if (!currentMess?.id) return
    const { data, error } = await supabase
      .from('monthly_reports')
      .select('*')
      .eq('mess_id', currentMess.id)
      .order('month', { ascending: false })
    if (error) {
      toast.error('Failed to load reports')
      return
    }
    setReports((data as MonthlyReport[]) || [])
  }, [currentMess?.id])

  useEffect(() => {
    if (!currentMess?.id) return
    setLoading(true)
    fetchReports().finally(() => setLoading(false))

    // Realtime: auto-generated (cron) reports appear without a manual refresh.
    const channel = supabase
      .channel(createRealtimeChannelName(`history-realtime-${currentMess.id}`))
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'monthly_reports',
          filter: `mess_id=eq.${currentMess.id}`,
        },
        () => fetchReports()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentMess?.id, fetchReports])

  if (!currentMess) return null

  const buildData = (report: MonthlyReport): ReportData => {
    const s = report.summary
    const members = (s.balances || []).map((b) => ({
      user_id: b.user_id,
      username: b.username,
      status: b.status as 'approved' | 'left',
      meals: Number(b.personal_meals || 0),
      mealCost: Number(b.individual_cost || 0),
      deposited: Number(b.total_deposits || 0),
    }))
    const perPersonFixed = s.financeMembersCount > 0 ? s.totalFixed / s.financeMembersCount : 0
    return {
      messName: currentMess.name,
      messLocation: currentMess.location,
      month: report.month,
      generatedBy: report.generated_by ? profile?.username || 'Manager' : 'Auto',
      isArchived: true,
      totalExpenses: Number(s.totalExpenses || 0),
      totalDeposits: Number(s.totalDeposits || 0),
      totalFixed: Number(s.totalFixed || 0),
      mealRate: Number(s.mealRate || 0),
      totalMeals: Number(s.totalMeals || 0),
      financeMembersCount: s.financeMembersCount,
      members,
      fixedCosts: s.fixedCosts || [],
      settlements: computeSettlements(members, perPersonFixed),
      dailyExpenses: [...(s.dailyExpenses || [])].sort((a, b) => a.date.localeCompare(b.date)),
      dailyMeals: s.dailyMeals || [],
      dailyDeposits: [...(s.dailyDeposits || [])].sort((a, b) => a.date.localeCompare(b.date)),
    }
  }

  const handleGenerate = async () => {
    if (!currentMess?.id || !genMonth) return
    setBusy(true)
    const { error } = await supabase.rpc('generate_monthly_report', {
      p_mess_id: currentMess.id,
      p_month: genMonth,
    })
    setGenMonth('')
    setBusy(false)
    if (error) {
      toast.error(sanitizeAppError(error, 'Failed to generate report'))
    } else {
      toast.success(
        `${formatLocalizedDate(genMonth + '-01', 'MMMM yyyy')} - ${t('finance.history.refreshedToast')}`
      )
      fetchReports()
    }
  }

  const handleRegenerate = async (month: string) => {
    if (!currentMess?.id) return
    setBusy(true)
    const { error } = await supabase.rpc('generate_monthly_report', {
      p_mess_id: currentMess.id,
      p_month: month,
    })
    setBusy(false)
    if (error) toast.error(sanitizeAppError(error, 'Failed to regenerate report'))
    else {
      toast.success(t('finance.history.refreshedToast'))
      fetchReports()
    }
  }

  const handleDownload = async (report: MonthlyReport) => {
    if (downloadingMonth) return
    setDownloadingMonth(report.month)
    try {
      const { buildReportPdf } = await import('../../../lib/reportPdf')
      buildReportPdf(buildData(report))
      toast.success(t('finance.history.downloadedToast'))
    } catch (err) {
      toast.error(sanitizeAppError(err, 'Failed to generate PDF report'))
    } finally {
      setDownloadingMonth(null)
    }
  }

  const monthLabel = (m: string) => formatLocalizedDate(m + '-01', 'MMMM yyyy')

  return (
    <div className="space-y-5">
      {isManager && (
        <div className="nex-card flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="text-nex-text mb-1 block text-sm font-medium">
              {t('finance.history.monthSelect')}
            </label>
            <div className="relative">
              <Calendar className="text-nex-muted pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <input
                type="month"
                value={genMonth}
                max={format(new Date(), 'yyyy-MM')}
                onChange={(e) => setGenMonth(e.target.value)}
                className="nex-input pl-9"
              />
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={busy || !genMonth}
            className="nex-btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> {busy ? t('common.loading') : t('common.add')}
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <CardSkeleton />
          <div className="nex-card p-5">
            <ListSkeleton count={3} />
          </div>
        </div>
      ) : reports.length === 0 ? (
        <div className="nex-card p-8 text-center">
          <History className="text-nex-muted mx-auto mb-2 h-8 w-8" />
          <p className="text-nex-muted text-sm">
            {t('finance.history.empty')}
          </p>
          <p className="text-nex-muted mt-1 text-xs">
            {t('finance.history.emptyDesc')}
          </p>
        </div>
      ) : (
        <div className="nex-card divide-nex-border divide-y">
          {reports.map((r) => {
            const s = r.summary
            return (
              <div
                key={r.id}
                className="hover:bg-nex-hover flex flex-col justify-between gap-3 px-5 py-4 transition-colors sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="bg-nex-secondary-light flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                    <Calendar className="text-nex-secondary h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-nex-text text-sm font-medium">{monthLabel(r.month)}</p>
                    <p className="text-nex-muted truncate text-xs">
                      {t('finance.history.summaryLine', {
                        meals: formatNumber(s.totalMeals),
                        members: formatNumber(s.financeMembersCount),
                        expenses: formatCurrency(Number(s.totalExpenses)),
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {isManager && (
                    <button
                      onClick={() => handleRegenerate(r.month)}
                      disabled={busy}
                      title={t('finance.history.refreshTooltip')}
                      className="nex-btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs disabled:opacity-50"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> {t('finance.history.refresh')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDownload(r)}
                    disabled={downloadingMonth !== null}
                    className="nex-btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs disabled:opacity-60"
                  >
                    <Download
                      className={`h-3.5 w-3.5 ${downloadingMonth === r.month ? 'animate-pulse' : ''}`}
                    />{' '}
                    {downloadingMonth === r.month
                      ? t('finance.actions.downloadingPdf')
                      : t('finance.history.pdf')}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
