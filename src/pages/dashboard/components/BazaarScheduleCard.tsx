import { CalendarDays } from 'lucide-react'
import { format, isToday, isTomorrow } from 'date-fns'
import EmptyState from '../../../components/EmptyState'

interface BazaarScheduleCardProps {
  schedule: { date: string; username: string }[]
}

export default function BazaarScheduleCard({ schedule }: BazaarScheduleCardProps) {
  return (
    <div className="nex-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <CalendarDays className="w-4 h-4 text-nex-primary" />
        <h4 className="text-sm font-semibold text-nex-text uppercase tracking-wider">Upcoming Bazaar</h4>
      </div>
      <div className="space-y-3 divide-y divide-nex-border">
        {schedule.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No schedule set" description="Market schedule will appear here." />
        ) : schedule.map((ub, idx) => (
          <div key={idx} className="flex items-center justify-between pt-3 first:pt-0">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isToday(new Date(ub.date)) ? 'bg-nex-success-light text-nex-success' : 'bg-nex-elevated text-nex-muted'}`}>
                {isToday(new Date(ub.date)) ? 'Tdy' : isTomorrow(new Date(ub.date)) ? 'Tmr' : format(new Date(ub.date), 'dd')}
              </div>
              <p className="text-sm font-medium text-nex-text">{ub.username}</p>
            </div>
            <p className="text-xs text-nex-muted">{format(new Date(ub.date), 'MMM d')}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
