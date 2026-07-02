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
    <div className="nex-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        {/* User Avatar Circle */}
        <div className="w-14 h-14 rounded-full ring-2 ring-indigo-500/10 bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-inner">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            username?.[0]?.toUpperCase() || 'U'
          )}
        </div>

        <div>
          <h3 className="text-xl font-bold tracking-tight text-nex-text flex items-center gap-2">
            {getGreeting()}, {username || 'Roommate'} 👋
          </h3>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-xs text-nex-muted flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {format(new Date(), 'EEEE, MMMM d')}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800" />
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
              isManager
                ? 'bg-nex-primary-light text-nex-primary border-nex-primary/10 dark:bg-nex-primary/10 dark:text-nex-primary dark:border-nex-primary/20'
                : 'bg-nex-success-light text-nex-success border-nex-success/10 dark:bg-nex-success/10 dark:text-nex-success dark:border-nex-success/20'
            }`}>
              {isManager ? (
                <>
                  <Shield className="w-2.5 h-2.5" /> Manager
                </>
              ) : (
                <>
                  <UserCheck className="w-2.5 h-2.5" /> Member
                </>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
