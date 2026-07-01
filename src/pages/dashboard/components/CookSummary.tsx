import { ChefHat } from 'lucide-react'
import type { CookSummary as CookSummaryData } from '../../../hooks/useDashboardData'

interface CookSummaryProps {
  data: CookSummaryData
}

export default function CookSummary({ data }: CookSummaryProps) {
  const totalMeals = data.todayL + data.todayD + data.tomorrowL + data.tomorrowD

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 dark:border-emerald-500/10 bg-emerald-50/30 dark:bg-emerald-950/10 p-5 shadow-sm transition-all duration-200">
      {/* Decorative glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
        {/* Left Side: Branding and Info */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <ChefHat className="w-6 h-6 animate-pulse-soft" />
          </div>
          <div>
            <h4 className="text-base font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
              Cook's Summary
              {totalMeals > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                  {totalMeals} Active Orders
                </span>
              )}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Groceries and preparation requirements for the mess cook.
            </p>
          </div>
        </div>

        {/* Right Side: Meal grids */}
        <div className="grid grid-cols-2 gap-4 shrink-0 w-full md:w-auto">
          {/* Today */}
          <div className="bg-white dark:bg-slate-900 border border-emerald-500/15 dark:border-emerald-500/5 rounded-xl p-3.5 min-w-[140px] shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider bg-emerald-500/10 dark:bg-emerald-500/20 px-1.5 py-0.5 rounded-md">
                Today
              </span>
              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                Total: {data.todayL + data.todayD}
              </span>
            </div>
            <div className="flex items-center justify-between text-center mt-2.5">
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{data.todayL}</p>
                <p className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider mt-0.5">Lunch</p>
              </div>
              <div className="w-px h-6 bg-slate-200 dark:bg-slate-800" />
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{data.todayD}</p>
                <p className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider mt-0.5">Dinner</p>
              </div>
            </div>
          </div>

          {/* Tomorrow */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 min-w-[140px] shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                Tomorrow
              </span>
              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                Total: {data.tomorrowL + data.tomorrowD}
              </span>
            </div>
            <div className="flex items-center justify-between text-center mt-2.5">
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{data.tomorrowL}</p>
                <p className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider mt-0.5">Lunch</p>
              </div>
              <div className="w-px h-6 bg-slate-200 dark:bg-slate-800" />
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{data.tomorrowD}</p>
                <p className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider mt-0.5">Dinner</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
