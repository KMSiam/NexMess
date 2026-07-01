import { ChefHat } from 'lucide-react'
import type { CookSummary as CookSummaryData } from '../../../hooks/useDashboardData'

interface CookSummaryProps {
  data: CookSummaryData
}

export default function CookSummary({ data }: CookSummaryProps) {
  return (
    <div className="nex-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <ChefHat className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-nex-text">
          Cook's Summary (Entire Mess)
        </h4>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {/* Today's Summary */}
        <div className="bg-slate-50/50 dark:bg-slate-900/30 border border-nex-border rounded-xl p-4">
          <p className="text-[10px] font-bold text-nex-muted uppercase tracking-wider mb-3">
            Today
          </p>
          <div className="flex justify-between items-center px-2">
            <div className="text-center">
              <p className="text-xl font-extrabold text-nex-text">{data.todayL}</p>
              <p className="text-[9px] font-bold text-nex-muted uppercase tracking-wider mt-0.5">Lunch</p>
            </div>
            <div className="w-px h-8 bg-nex-border"></div>
            <div className="text-center">
              <p className="text-xl font-extrabold text-nex-text">{data.todayD}</p>
              <p className="text-[9px] font-bold text-nex-muted uppercase tracking-wider mt-0.5">Dinner</p>
            </div>
          </div>
        </div>

        {/* Tomorrow's Summary */}
        <div className="bg-slate-50/50 dark:bg-slate-900/30 border border-nex-border rounded-xl p-4">
          <p className="text-[10px] font-bold text-nex-muted uppercase tracking-wider mb-3">
            Tomorrow
          </p>
          <div className="flex justify-between items-center px-2">
            <div className="text-center">
              <p className="text-xl font-extrabold text-nex-text">{data.tomorrowL}</p>
              <p className="text-[9px] font-bold text-nex-muted uppercase tracking-wider mt-0.5">Lunch</p>
            </div>
            <div className="w-px h-8 bg-nex-border"></div>
            <div className="text-center">
              <p className="text-xl font-extrabold text-nex-text">{data.tomorrowD}</p>
              <p className="text-[9px] font-bold text-nex-muted uppercase tracking-wider mt-0.5">Dinner</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
