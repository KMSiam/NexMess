import { format } from 'date-fns'
import { Megaphone, Calendar } from 'lucide-react'
import { getGreeting } from '../../../lib/utils'

interface WelcomeCardProps {
  username: string | null | undefined
  isManager: boolean
  onToggleNoticeForm: () => void
}

export default function WelcomeCard({ username, isManager, onToggleNoticeForm }: WelcomeCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 p-6 text-white shadow-lg border border-blue-400/20">
      {/* Decorative background shapes */}
      <div className="absolute right-0 top-0 -mt-6 -mr-6 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />
      <div className="absolute left-1/3 bottom-0 -mb-10 w-24 h-24 rounded-full bg-indigo-400/20 blur-lg pointer-events-none" />

      <div className="relative z-10 flex items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-[10px] font-bold uppercase tracking-wider text-blue-100 mb-2">
            Workspace Active
          </span>
          <h3 className="text-2xl font-extrabold tracking-tight">
            {getGreeting()}, {username || 'Roommate'}! 👋
          </h3>
          <p className="mt-1 text-sm text-blue-100 flex items-center gap-1.5 font-medium">
            <Calendar className="w-4 h-4 text-blue-200" />
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        
        {isManager && (
          <button
            onClick={onToggleNoticeForm}
            className="p-3 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all duration-200 shadow-sm shrink-0 border border-white/10"
            title="Post a notice"
          >
            <Megaphone className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}
