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
          <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            {getGreeting()}, {username || 'Roommate'} 👋
          </h3>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {format(new Date(), 'EEEE, MMMM d')}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800" />
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              isManager
                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
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
