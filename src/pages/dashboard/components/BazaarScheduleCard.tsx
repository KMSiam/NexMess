import { CalendarDays } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatLocalizedDate, dhakaToday, dhakaTomorrow } from '../../../lib/utils'
import EmptyState from '../../../components/EmptyState'

interface BazaarScheduleCardProps {
  schedule: { date: string; username: string }[]
}

export default function BazaarScheduleCard({ schedule }: BazaarScheduleCardProps) {
  const { t } = useTranslation()
  const todayStr = dhakaToday()
  const tomorrowStr = dhakaTomorrow()

  return (
    <div className="nex-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <CalendarDays className="text-nex-primary h-4 w-4" />
        <h2 className="text-nex-text text-sm font-semibold tracking-wider uppercase">
          {t('dashboard.bazaarSchedule')}
        </h2>
      </div>
      <div className="divide-nex-border space-y-3 divide-y">
        {schedule.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title={t('dashboard.noShopperToday')}
            description={t('dashboard.noShopperDesc')}
          />
        ) : (
          schedule.map((ub, idx) => {
            const isTodayDuty = ub.date === todayStr
            const isTomorrowDuty = ub.date === tomorrowStr

            return (
              <div key={idx} className="flex items-center justify-between gap-3 pt-3 first:pt-0">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                      isTodayDuty
                        ? 'bg-nex-success-light text-nex-success'
                        : isTomorrowDuty
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                          : 'bg-nex-elevated text-nex-muted'
                    }`}
                  >
                    {formatLocalizedDate(ub.date, 'dd')}
                  </div>
                  <p className="text-nex-text truncate text-sm font-medium">{ub.username}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {(isTodayDuty || isTomorrowDuty) && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${
                        isTodayDuty
                          ? 'bg-nex-success-light text-nex-success'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {isTodayDuty ? t('common.today') : t('common.tomorrow')}
                    </span>
                  )}
                  <p className="text-nex-muted text-xs whitespace-nowrap">
                    {formatLocalizedDate(ub.date, 'MMM d')}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
