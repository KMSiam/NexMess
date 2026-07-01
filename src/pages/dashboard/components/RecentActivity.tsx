import { Activity } from 'lucide-react'
import { format } from 'date-fns'
import EmptyState from '../../../components/EmptyState'
import type { DashboardActivity } from '../../../hooks/useDashboardData'

interface RecentActivityProps {
  activities: DashboardActivity[]
}

export default function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <div className="nex-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-nex-primary" />
        <h4 className="text-sm font-semibold text-nex-text uppercase tracking-wider">Recent Activity</h4>
      </div>
      <div className="space-y-3">
        {activities.length === 0 ? (
          <EmptyState icon={Activity} title="No recent activity" description="Expenses and deposits will appear here." />
        ) : activities.map(act => (
          <div key={act.id} className="flex items-start gap-3">
            <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${act.type === 'deposit' ? 'bg-nex-success' : 'bg-amber-500'}`} />
            <div>
              <p className="text-sm text-nex-text">{act.text}</p>
              <p className="text-[10px] text-nex-muted">{format(new Date(act.time), 'MMM d, h:mm a')}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
