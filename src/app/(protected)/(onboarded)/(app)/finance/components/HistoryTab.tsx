'use client'

import { useEffect, useState, useCallback } from 'react'
import { useMessStore, useProfileStore } from '@/stores/appStore'
import { getMonthlyReports, generateMonthlyReport } from '@/actions/finance'
import { usePusherRealtime } from '@/hooks/usePusherRealtime'
import { History, Plus, Download, RefreshCw, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import { buildReportPdf, computeSettlements, ReportData } from '@/lib/reportPdf'
import toast from 'react-hot-toast'
import { CardSkeleton, ListSkeleton } from '@/components/Skeleton'

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
  const { currentMess } = useMessStore()
  const { profile } = useProfileStore()
  const [reports, setReports] = useState<MonthlyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const [genMonth, setGenMonth] = useState(() => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - 1)
    return format(d, 'yyyy-MM')
  })

  const fetchReports = useCallback(async () => {
    if (!currentMess?.id) return
    try {
      const data = await getMonthlyReports(currentMess.id)
      setReports(data)
    } catch (err: any) {
      toast.error('Failed to load reports')
    }
  }, [currentMess?.id])

  useEffect(() => {
    if (!currentMess?.id) return
    setLoading(true)
    fetchReports().finally(() => setLoading(false))
  }, [currentMess?.id, fetchReports])

  // Realtime update via Pusher
  usePusherRealtime(currentMess?.id, ['monthly_reports'], fetchReports)

  if (!currentMess) return null

  // Compile the archived summary JSON into the ReportData shape for the PDF.
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
      dailyExpenses: s.dailyExpenses || [],
      dailyMeals: s.dailyMeals || [],
      dailyDeposits: s.dailyDeposits || [],
    }
  }

  const handleGenerate = async () => {
    if (!currentMess?.id || !genMonth) return
    setBusy(true)
    try {
      await generateMonthlyReport(currentMess.id, genMonth)
      toast.success(`Report for ${format(new Date(genMonth + '-01'), 'MMMM yyyy')} is ready`)
      fetchReports()
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate report')
    } finally {
      setBusy(false)
    }
  }

  const handleRegenerate = async (month: string) => {
    if (!currentMess?.id) return
    setBusy(true)
    try {
      await generateMonthlyReport(currentMess.id, month)
      toast.success('Report refreshed with the latest data')
      fetchReports()
    } catch (err: any) {
      toast.error(err.message || 'Failed to regenerate report')
    } finally {
      setBusy(false)
    }
  }

  const handleDownload = (report: MonthlyReport) => {
    buildReportPdf(buildData(report))
    toast.success('PDF downloaded')
  }

  const monthLabel = (m: string) => format(new Date(m + '-01'), 'MMMM yyyy')

  return (
    <div className="space-y-5">
      {/* Generate for month */}
      <div className="nex-card flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="text-nex-text mb-1 block text-sm font-medium">
            Generate report for a month
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
          className="nex-btn-primary flex items-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> {busy ? 'Generating...' : 'Generate'}
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
          <History className="text-nex-muted mx-auto mb-2 h-8 w-8" />
          <p className="text-nex-muted text-sm">
            No archived reports yet. Pick a month above and click <b>Generate</b>.
          </p>
          <p className="text-nex-muted mt-1 text-xs">
            Reports are also compiled automatically at the start of each month.
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
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                    <Calendar className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-nex-text text-sm font-medium">{monthLabel(r.month)}</p>
                    <p className="text-nex-muted truncate text-xs">
                      {s.totalMeals} meals · {s.financeMembersCount} members ·{' '}
                      {formatCurrency(Number(s.totalExpenses))} expenses
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => handleRegenerate(r.month)}
                    disabled={busy}
                    title="Recompile this month with the latest data"
                    className="nex-btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Refresh
                  </button>
                  <button
                    onClick={() => handleDownload(r)}
                    className="nex-btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" /> PDF
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
