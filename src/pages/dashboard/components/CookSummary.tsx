import { ChefHat } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatNumber } from '../../../lib/utils'
import type { CookSummary as CookSummaryData } from '../../../hooks/useDashboardData'

interface CookSummaryProps {
  data: CookSummaryData
}

export default function CookSummary({ data }: CookSummaryProps) {
  const { t } = useTranslation()

  return (
    <div className="nex-card flex h-full flex-col justify-between p-5">
      <div>
        <div className="mb-4 flex items-center gap-2">
          <ChefHat className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
          <h2 className="text-nex-text text-xs font-bold tracking-wider uppercase">
            {t('dashboard.cookSummary')}
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Today */}
          <div className="bg-nex-elevated/40 border-nex-border rounded-xl border p-4">
            <p className="text-nex-muted mb-2.5 text-[10px] font-bold tracking-wider uppercase">
              {t('common.today')}
            </p>
            <div className="flex items-center justify-between px-1">
              <div className="text-center">
                <p className="text-nex-text text-xl font-extrabold">{formatNumber(data.todayL)}</p>
                <p className="text-nex-muted mt-0.5 text-[9px] font-semibold tracking-wider uppercase">
                  {t('dashboard.lunch')}
                </p>
              </div>
              <div className="bg-nex-border h-6 w-px"></div>
              <div className="text-center">
                <p className="text-nex-text text-xl font-extrabold">{formatNumber(data.todayD)}</p>
                <p className="text-nex-muted mt-0.5 text-[9px] font-semibold tracking-wider uppercase">
                  {t('dashboard.dinner')}
                </p>
              </div>
            </div>
          </div>

          {/* Tomorrow */}
          <div className="bg-nex-elevated/40 border-nex-border rounded-xl border p-4">
            <p className="text-nex-muted mb-2.5 text-[10px] font-bold tracking-wider uppercase">
              {t('common.tomorrow')}
            </p>
            <div className="flex items-center justify-between px-1">
              <div className="text-center">
                <p className="text-nex-text text-xl font-extrabold">{formatNumber(data.tomorrowL)}</p>
                <p className="text-nex-muted mt-0.5 text-[9px] font-semibold tracking-wider uppercase">
                  {t('dashboard.lunch')}
                </p>
              </div>
              <div className="bg-nex-border h-6 w-px"></div>
              <div className="text-center">
                <p className="text-nex-text text-xl font-extrabold">{formatNumber(data.tomorrowD)}</p>
                <p className="text-nex-muted mt-0.5 text-[9px] font-semibold tracking-wider uppercase">
                  {t('dashboard.dinner')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
