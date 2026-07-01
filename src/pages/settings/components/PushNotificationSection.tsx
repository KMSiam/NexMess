import { Bell, BellOff } from 'lucide-react'

interface PushNotificationSectionProps {
  pushEnabled: boolean
  pushLoading: boolean
  onToggle: () => void
}

export default function PushNotificationSection({ pushEnabled, pushLoading, onToggle }: PushNotificationSectionProps) {
  return (
    <div className="nex-card p-6">
      <h3 className="text-lg font-semibold text-nex-text mb-4">Push Notifications</h3>
      <div className="flex items-center justify-between p-4 bg-nex-elevated rounded-xl">
        <div className="flex items-center gap-3">
          {pushEnabled
            ? <Bell className="w-5 h-5 text-nex-primary" />
            : <BellOff className="w-5 h-5 text-nex-muted" />}
          <div>
            <p className="text-sm font-medium text-nex-text">Device Notifications</p>
            <p className="text-xs text-nex-muted mt-0.5">
              {pushEnabled ? 'Receive notices and updates even when the app is closed.' : 'Enable to get alerts when the app is in the background.'}
            </p>
          </div>
        </div>
        <button
          onClick={onToggle}
          disabled={pushLoading}
          className={`relative w-12 h-7 rounded-full transition-colors duration-200 disabled:opacity-50 ${pushEnabled ? 'nex-toggle-on' : 'nex-toggle-off'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${pushEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>
    </div>
  )
}
