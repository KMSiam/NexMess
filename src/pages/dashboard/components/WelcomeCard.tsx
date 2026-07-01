import { format } from 'date-fns'
import { Megaphone } from 'lucide-react'
import { getGreeting } from '../../../lib/utils'

interface WelcomeCardProps {
  username: string | null | undefined
  isManager: boolean
  onToggleNoticeForm: () => void
}

export default function WelcomeCard({ username, isManager, onToggleNoticeForm }: WelcomeCardProps) {
  return (
    <div className="nex-card p-5 flex items-center justify-between">
      <div>
        <h3 className="text-xl font-semibold text-nex-text">{getGreeting()}, {username} 👋</h3>
        <p className="mt-0.5 text-sm text-nex-muted">{format(new Date(), 'EEEE, MMMM d')}</p>
      </div>
      {isManager && (
        <button onClick={onToggleNoticeForm} className="p-2 rounded-btn text-nex-muted hover:bg-nex-hover transition-colors" title="Post a notice">
          <Megaphone className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}
