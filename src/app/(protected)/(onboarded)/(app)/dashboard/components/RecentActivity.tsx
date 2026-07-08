'use client'

import { Activity } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import EmptyState from '@/components/EmptyState'

interface DashboardActivity {
  id: string
  text: string
  type: string
  time: string
}

interface RecentActivityProps {
  activities: DashboardActivity[]
}

export default function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <div className="nex-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="text-nex-primary h-4 w-4" />
          <h4 className="text-nex-text text-sm font-semibold tracking-wider uppercase">
            Recent Activity
          </h4>
        </div>
        {activities.length > 0 && (
          <Link href="/activity" className="text-nex-primary text-xs font-semibold hover:underline">
            View All
          </Link>
        )}
      </div>
      <div className="space-y-3">
        {activities.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No recent activity"
            description="Expenses and deposits will appear here."
          />
        ) : (
          activities.map((act) => (
            <div key={act.id} className="flex items-start gap-3">
              <div
                className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                  act.type === 'deposit' ? 'bg-nex-success' : 'bg-amber-500'
                }`}
              />
              <div>
                <p className="text-nex-text text-sm">{act.text}</p>
                <p className="text-nex-muted text-[10px]">
                  {format(new Date(act.time), 'MMM d, h:mm a')}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
