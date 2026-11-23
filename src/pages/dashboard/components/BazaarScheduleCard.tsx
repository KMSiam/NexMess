import { CalendarDays } from 'lucide-react'
import { format, isToday, isTomorrow } from 'date-fns'
import { useTranslation } from 'react-i18next'
import EmptyState from '../../../components/EmptyState'

interface BazaarScheduleCardProps {
  schedule: { date: string; username: string }[]
}

export default function BazaarScheduleCard({ schedule }: BazaarScheduleCardProps) {
  const { t } = useTranslation()

  return (
    <div className="nex-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <CalendarDays className="text-nex-primary h-4 w-4" />
        <h4 className="text-nex-text text-sm font-semibold tracking-wider uppercase">
          {t('dashboard.bazaarSchedule')}
        </h4>
      </div>
      <div className="divide-nex-border space-y-3 divide-y">
        {schedule.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title={t('dashboard.noShopperToday')}
            description={t('dashboard.noShopperDesc')}
          />
        ) : (
          schedule.map((ub, idx) => (
            <div key={idx} className="flex items-center justify-between pt-3 first:pt-0">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${isToday(new Date(ub.date)) ? 'bg-nex-success-light text-nex-success' : 'bg-nex-elevated text-nex-muted'}`}
                >
                  {isToday(new Date(ub.date))
                    ? t('common.today')
                    : isTomorrow(new Date(ub.date))
                      ? t('common.tomorrow')
                      : format(new Date(ub.date), 'dd')}
                </div>
                <p className="text-nex-text text-sm font-medium">{ub.username}</p>
              </div>
              <p className="text-nex-muted text-xs">{format(new Date(ub.date), 'MMM d')}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
