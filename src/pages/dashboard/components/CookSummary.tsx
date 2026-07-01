import { ChefHat } from 'lucide-react'
import type { CookSummary as CookSummaryData } from '../../../hooks/useDashboardData'

interface CookSummaryProps {
  data: CookSummaryData
}

export default function CookSummary({ data }: CookSummaryProps) {
  return (
    <div className="nex-card p-5 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <ChefHat className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-nex-text">
            Cook's Summary (Entire Mess)
          </h4>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Today */}
          <div className="bg-nex-elevated/40 border border-nex-border rounded-xl p-4">
            <p className="text-[10px] font-bold text-nex-muted uppercase tracking-wider mb-2.5">Today</p>
            <div className="flex justify-between items-center px-1">
              <div className="text-center">
                <p className="text-xl font-extrabold text-nex-text">{data.todayL}</p>
                <p className="text-[9px] font-semibold text-nex-muted uppercase tracking-wider mt-0.5">Lunch</p>
              </div>
              <div className="w-px h-6 bg-nex-border"></div>
              <div className="text-center">
                <p className="text-xl font-extrabold text-nex-text">{data.todayD}</p>
                <p className="text-[9px] font-semibold text-nex-muted uppercase tracking-wider mt-0.5">Dinner</p>
              </div>
            </div>
          </div>

          {/* Tomorrow */}
          <div className="bg-nex-elevated/40 border border-nex-border rounded-xl p-4">
            <p className="text-[10px] font-bold text-nex-muted uppercase tracking-wider mb-2.5">Tomorrow</p>
            <div className="flex justify-between items-center px-1">
              <div className="text-center">
                <p className="text-xl font-extrabold text-nex-text">{data.tomorrowL}</p>
                <p className="text-[9px] font-semibold text-nex-muted uppercase tracking-wider mt-0.5">Lunch</p>
              </div>
              <div className="w-px h-6 bg-nex-border"></div>
              <div className="text-center">
                <p className="text-xl font-extrabold text-nex-text">{data.tomorrowD}</p>
                <p className="text-[9px] font-semibold text-nex-muted uppercase tracking-wider mt-0.5">Dinner</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
