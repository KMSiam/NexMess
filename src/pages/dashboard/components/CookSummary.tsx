import { ChefHat } from 'lucide-react'
import type { CookSummary as CookSummaryData } from '../../../hooks/useDashboardData'

interface CookSummaryProps {
  data: CookSummaryData
}

export default function CookSummary({ data }: CookSummaryProps) {
  return (
    <div className="bg-gradient-to-br from-blue-600 to-blue-700 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-5 shadow-lg border border-blue-500/20 dark:border-slate-700">
      <div className="flex items-center gap-2 mb-4">
        <ChefHat className="w-5 h-5 text-blue-100 dark:text-emerald-400" />
        <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Cook's Summary (Entire Mess)</h4>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/10 dark:bg-white/5 rounded-xl p-3 border border-white/10 dark:border-white/5">
          <p className="text-xs text-blue-100 dark:text-slate-400 mb-2 font-medium">Today</p>
          <div className="flex justify-between items-center">
            <div className="text-center"><p className="text-lg font-bold text-white dark:text-amber-400">{data.todayL}</p><p className="text-xs text-blue-100 dark:text-slate-400 uppercase">Lunch</p></div>
            <div className="w-px h-8 bg-white/20 dark:bg-white/10"></div>
            <div className="text-center"><p className="text-lg font-bold text-white dark:text-indigo-400">{data.todayD}</p><p className="text-xs text-blue-100 dark:text-slate-400 uppercase">Dinner</p></div>
          </div>
        </div>
        <div className="bg-white/10 dark:bg-white/5 rounded-xl p-3 border border-white/10 dark:border-white/5">
          <p className="text-xs text-blue-100 dark:text-slate-400 mb-2 font-medium">Tomorrow</p>
          <div className="flex justify-between items-center">
            <div className="text-center"><p className="text-lg font-bold text-white dark:text-amber-400">{data.tomorrowL}</p><p className="text-xs text-blue-100 dark:text-slate-400 uppercase">Lunch</p></div>
            <div className="w-px h-8 bg-white/20 dark:bg-white/10"></div>
            <div className="text-center"><p className="text-lg font-bold text-white dark:text-indigo-400">{data.tomorrowD}</p><p className="text-xs text-blue-100 dark:text-slate-400 uppercase">Dinner</p></div>
          </div>
        </div>
      </div>
    </div>
  )
}
