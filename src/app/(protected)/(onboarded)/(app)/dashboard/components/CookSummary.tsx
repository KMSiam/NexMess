'use client'

import { ChefHat } from 'lucide-react'

interface CookSummaryData {
  todayL: number
  todayD: number
  tomorrowL: number
  tomorrowD: number
}

interface CookSummaryProps {
  data: CookSummaryData
}

export default function CookSummary({ data }: CookSummaryProps) {
  return (
    <div className="nex-card flex h-full flex-col justify-between p-5">
      <div>
        <div className="mb-4 flex items-center gap-2">
          <ChefHat className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
          <h4 className="text-nex-text text-xs font-bold tracking-wider uppercase">
            Cook's Summary (Entire Mess)
          </h4>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Today */}
          <div className="bg-nex-elevated/40 border-nex-border rounded-xl border p-4">
            <p className="text-nex-muted mb-2.5 text-[10px] font-bold tracking-wider uppercase">
              Today
            </p>
            <div className="flex items-center justify-between px-1">
              <div className="text-center">
                <p className="text-nex-text text-xl font-extrabold">{data.todayL}</p>
                <p className="text-nex-muted mt-0.5 text-[9px] font-semibold tracking-wider uppercase">
                  Lunch
                </p>
              </div>
              <div className="bg-nex-border h-6 w-px"></div>
              <div className="text-center">
                <p className="text-nex-text text-xl font-extrabold">{data.todayD}</p>
                <p className="text-nex-muted mt-0.5 text-[9px] font-semibold tracking-wider uppercase">
                  Dinner
                </p>
              </div>
            </div>
          </div>

          {/* Tomorrow */}
          <div className="bg-nex-elevated/40 border-nex-border rounded-xl border p-4">
            <p className="text-nex-muted mb-2.5 text-[10px] font-bold tracking-wider uppercase">
              Tomorrow
            </p>
            <div className="flex items-center justify-between px-1">
              <div className="text-center">
                <p className="text-nex-text text-xl font-extrabold">{data.tomorrowL}</p>
                <p className="text-nex-muted mt-0.5 text-[9px] font-semibold tracking-wider uppercase">
                  Lunch
                </p>
              </div>
              <div className="bg-nex-border h-6 w-px"></div>
              <div className="text-center">
                <p className="text-nex-text text-xl font-extrabold">{data.tomorrowD}</p>
                <p className="text-nex-muted mt-0.5 text-[9px] font-semibold tracking-wider uppercase">
                  Dinner
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
