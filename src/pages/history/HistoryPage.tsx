import { useEffect, useState, useCallback } from 'react'
import { useMessStore } from '../../stores/messStore'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { History, Plus, Download, RefreshCw, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { formatCurrency } from '../../lib/utils'
import { buildReportPdf, computeSettlements, ReportData } from '../../lib/reportPdf'
import toast from 'react-hot-toast'
import { CardSkeleton, ListSkeleton } from '../../components/Skeleton'

// Shape of a monthly_reports row (RLS-scoped: managers only see their mess's rows)
interface MonthlyReport {
  id: string
  mess_id: string
  month: string                 // 'YYYY-MM'
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
}

export default function HistoryPage() {
  const { currentMess } = useMessStore()
  const { profile } = useAuthStore()
  const [reports, setReports] = useState<MonthlyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
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
      .channel('history-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'monthly_reports', filter: `mess_id=eq.${currentMess.id}` },
        () => fetchReports(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentMess?.id, fetchReports])

  if (!currentMess) return null

  // Compile the archived summary JSON into the ReportData shape for the PDF.
  const buildData = (report: MonthlyReport): ReportData => {
    const s = report.summary
    const members = (s.balances || []).map((b) => ({
      username: b.username,
      status: b.status as 'approved' | 'left',
      meals: Number(b.personal_meals || 0),
      mealCost: Number(b.individual_cost || 0),
      deposited: Number(b.total_deposits || 0),
    }))
    const perPersonFixed = s.financeMembersCount > 0 ? s.totalFixed / s.financeMembersCount : 0
    return {
      messName: currentMess.name,
      month: report.month,
      generatedBy: report.generated_by ? (profile?.username || 'Manager') : 'Auto',
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
    }
  }

  const handleGenerate = async () => {
    if (!currentMess?.id || !genMonth) return
    setBusy(true)
    const { error } = await supabase.rpc('generate_monthly_report', {
      p_mess_id: currentMess.id,
      p_month: genMonth,
    })
    setBusy(false)
    if (error) {
      toast.error(error.message || 'Failed to generate report')
    } else {
      toast.success(`Report for ${format(new Date(genMonth + '-01'), 'MMMM yyyy')} is ready`)
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
    if (error) toast.error(error.message || 'Failed to regenerate report')
    else {
      toast.success('Report refreshed with the latest data')
      fetchReports()
    }
  }

  const handleDownload = (report: MonthlyReport) => {
    buildReportPdf(buildData(report))
    toast.success('PDF downloaded')
  }

  const monthLabel = (m: string) => format(new Date(m + '-01'), 'MMMM yyyy')

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <History className="w-6 h-6 text-nex-primary" />
        <h1 className="text-2xl font-bold text-nex-text">History</h1>
        <span className="text-xs text-nex-muted hidden sm:inline">
          — archived monthly reports (manager only)
        </span>
      </div>

      {/* Generate for month */}
      <div className="nex-card p-4 flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-nex-text mb-1">
            Generate report for a month
          </label>
          <div className="relative">
            <Calendar className="w-4 h-4 text-nex-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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
          <Plus className="w-4 h-4" /> {busy ? 'Generating...' : 'Generate'}
        </button>
      </div>

      {/* Archived reports list */}
      {loading ? (
        <div className="space-y-4">
          <CardSkeleton />
          <div className="nex-card p-5">
            <ListSkeleton count={3} />
          </div>
        </div>
      ) : reports.length === 0 ? (
        <div className="nex-card p-8 text-center">
          <History className="w-8 h-8 text-nex-muted mx-auto mb-2" />
          <p className="text-sm text-nex-muted">
            No archived reports yet. Pick a month above and click <b>Generate</b>.
          </p>
          <p className="text-xs text-nex-muted mt-1">
            Reports are also compiled automatically at the start of each month.
          </p>
        </div>
      ) : (
        <div className="nex-card divide-y divide-nex-border">
          {reports.map((r) => {
            const s = r.summary
            return (
              <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 hover:bg-nex-hover transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-nex-text">{monthLabel(r.month)}</p>
                    <p className="text-xs text-nex-muted truncate">
                      {s.totalMeals} meals · {s.financeMembersCount} members ·{' '}
                      {formatCurrency(Number(s.totalExpenses))} expenses
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleRegenerate(r.month)}
                    disabled={busy}
                    title="Recompile this month with the latest data"
                    className="nex-btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh
                  </button>
                  <button
                    onClick={() => handleDownload(r)}
                    className="nex-btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> PDF
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
