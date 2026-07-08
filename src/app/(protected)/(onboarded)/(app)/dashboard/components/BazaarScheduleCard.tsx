'use client'

import { CalendarDays } from 'lucide-react'
import { format, isToday, isTomorrow } from 'date-fns'
import EmptyState from '@/components/EmptyState'

interface BazaarScheduleCardProps {
  schedule: { date: string; username: string }[]
}

export default function BazaarScheduleCard({ schedule }: BazaarScheduleCardProps) {
  return (
    <div className="nex-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <CalendarDays className="text-nex-primary h-4 w-4" />
        <h4 className="text-nex-text text-sm font-semibold tracking-wider uppercase">
          Upcoming Bazaar
        </h4>
      </div>
      <div className="divide-nex-border space-y-3 divide-y">
        {schedule.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No schedule set"
            description="Market schedule will appear here."
          />
        ) : (
          schedule.map((ub, idx) => {
            let dateObj: Date | null = null
            try {
              if (ub.date) {
                // Parse YYYY-MM-DD safely
                const parts = ub.date.split('T')[0].split('-').map(Number)
                if (parts.length === 3) {
                  dateObj = new Date(parts[0], parts[1] - 1, parts[2])
                } else {
                  dateObj = new Date(ub.date)
                }
                if (isNaN(dateObj.getTime())) dateObj = null
              }
            } catch {
              dateObj = null
            }

            const isTdy = dateObj ? isToday(dateObj) : false
            const isTmr = dateObj ? isTomorrow(dateObj) : false

            return (
              <div key={idx} className="flex items-center justify-between pt-3 first:pt-0">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                      isTdy
                        ? 'bg-nex-success-light text-nex-success'
                        : 'bg-nex-elevated text-nex-muted'
                    }`}
                  >
                    {isTdy
                      ? 'Tdy'
                      : isTmr
                        ? 'Tmr'
                        : dateObj
                          ? format(dateObj, 'dd')
                          : ''}
                  </div>
                  <p className="text-nex-text text-sm font-medium">{ub.username}</p>
                </div>
                <p className="text-nex-muted text-xs">
                  {dateObj ? format(dateObj, 'MMM d') : ''}
                </p>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
