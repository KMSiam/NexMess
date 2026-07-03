import { format } from 'date-fns'
import { Calendar, UserCheck, Shield } from 'lucide-react'
import { getGreeting } from '../../../lib/utils'
import { useAuthStore } from '../../../stores/authStore'

interface WelcomeCardProps {
  username: string | null | undefined
  isManager: boolean
}

export default function WelcomeCard({ username, isManager }: WelcomeCardProps) {
  const { profile } = useAuthStore()

  return (
    <div className="nex-card flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center">
      <div className="flex items-center gap-4">
        {/* User Avatar Circle */}
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-lg font-bold text-white shadow-inner ring-2 ring-indigo-500/10">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            username?.[0]?.toUpperCase() || 'U'
          )}
        </div>

        <div>
          <h3 className="text-nex-text flex items-center gap-2 text-xl font-bold tracking-tight">
            {getGreeting()}, {username || 'Roommate'} 👋
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-nex-muted flex items-center gap-1 text-xs">
              <Calendar className="h-3.5 w-3.5" />
              {format(new Date(), 'EEEE, MMMM d')}
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-slate-200 dark:bg-slate-800" />
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
                isManager
                  ? 'bg-nex-primary-light text-nex-primary border-nex-primary/10 dark:bg-nex-primary/10 dark:text-nex-primary dark:border-nex-primary/20'
                  : 'bg-nex-success-light text-nex-success border-nex-success/10 dark:bg-nex-success/10 dark:text-nex-success dark:border-nex-success/20'
              }`}
            >
              {isManager ? (
                <>
                  <Shield className="h-2.5 w-2.5" /> Manager
                </>
              ) : (
                <>
                  <UserCheck className="h-2.5 w-2.5" /> Member
                </>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
