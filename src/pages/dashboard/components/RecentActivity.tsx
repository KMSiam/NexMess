import { Activity } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import EmptyState from '../../../components/EmptyState'
import { formatCurrency, formatLocalizedDate } from '../../../lib/utils'
import type { DashboardActivity } from '../../../hooks/useDashboardData'

interface RecentActivityProps {
  activities: DashboardActivity[]
}

export default function RecentActivity({ activities }: RecentActivityProps) {
  const { t } = useTranslation()

  const getActivityText = (act: DashboardActivity) => {
    if (act.type === 'expense' && act.username !== undefined && act.amount !== undefined) {
      const catLabel = t(`finance.categories.${act.category || 'other'}`, {
        defaultValue: act.category || 'other',
      })
      return t('activity.addedExpense', {
        user: act.username,
        category: catLabel,
        amount: formatCurrency(act.amount),
      })
    }
    if (act.type === 'deposit' && act.username !== undefined && act.amount !== undefined) {
      return t('activity.depositedAmount', {
        user: act.username,
        amount: formatCurrency(act.amount),
      })
    }
    return act.text
  }

  return (
    <div className="nex-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="text-nex-primary h-4 w-4" />
          <h4 className="text-nex-text text-sm font-semibold tracking-wider uppercase">
            {t('dashboard.recentActivity')}
          </h4>
        </div>
        {activities.length > 0 && (
          <Link to="/activity" className="text-nex-primary text-xs font-semibold hover:underline">
            {t('common.viewAll')}
          </Link>
        )}
      </div>
      <div className="space-y-3">
        {activities.length === 0 ? (
          <EmptyState
            icon={Activity}
            title={t('dashboard.noActivity')}
            description={t('dashboard.noActivityDesc')}
          />
        ) : (
          activities.map((act) => (
            <div key={act.id} className="flex items-start gap-3">
              <div
                className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${act.type === 'deposit' ? 'bg-nex-success' : 'bg-amber-500'}`}
              />
              <div>
                <p className="text-nex-text text-sm">{getActivityText(act)}</p>
                <p className="text-nex-muted text-[10px]">
                  {formatLocalizedDate(act.time, 'MMM d, h:mm a')}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
