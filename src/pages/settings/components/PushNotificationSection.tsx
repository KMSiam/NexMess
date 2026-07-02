import { useEffect, useState } from 'react'
import { Bell, BellOff, AlertTriangle, HelpCircle, ShieldAlert } from 'lucide-react'

interface PushNotificationSectionProps {
  pushEnabled: boolean
  pushLoading: boolean
  onToggle: () => void
}

export default function PushNotificationSection({
  pushEnabled,
  pushLoading,
  onToggle,
}: PushNotificationSectionProps) {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default')
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(true)

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setPermission('unsupported')
      return
    }

    setPermission(Notification.permission)

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    const ios = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(ios)

    // Detect standalone mode (Added to Home Screen)
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    setIsStandalone(standalone)
  }, [pushEnabled])

  // Determine the status text and color
  let statusText = 'Disabled'
  let statusColor = 'text-nex-muted bg-nex-muted/10 border-nex-muted/20'

  if (permission === 'unsupported') {
    statusText = 'Unsupported Device'
    statusColor = 'text-red-500 bg-red-500/10 border-red-500/20'
  } else if (permission === 'denied') {
    statusText = 'Blocked by Browser'
    statusColor = 'text-red-500 bg-red-500/10 border-red-500/20'
  } else if (pushEnabled) {
    statusText = 'Active'
    statusColor = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
  }

  return (
    <div className="nex-card p-6 border border-nex-border/50 relative overflow-hidden">
      {/* Decorative gradient light */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <h3 className="text-lg font-semibold text-nex-text">Push Notifications</h3>
            <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${statusColor}`}>
              {statusText}
            </span>
          </div>
          <p className="text-xs text-nex-muted">
            Stay updated with real-time alerts for meals, bazaar duties, expenses, and mess notices.
          </p>
        </div>

        {permission !== 'unsupported' && (
          <button
            onClick={onToggle}
            disabled={pushLoading}
            className={`relative w-14 h-8 rounded-full transition-all duration-300 disabled:opacity-50 shadow-inner shrink-0 ${
              pushEnabled ? 'bg-blue-600 shadow-blue-700/50' : 'bg-nex-elevated border border-nex-border'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300 flex items-center justify-center ${
                pushEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            >
              {pushEnabled ? (
                <Bell className="w-3.5 h-3.5 text-blue-600" />
              ) : (
                <BellOff className="w-3.5 h-3.5 text-nex-muted" />
              )}
            </span>
          </button>
        )}
      </div>

      {/* Main notification state section */}
      <div className="space-y-4">
        {/* iOS Specific Warning */}
        {isIOS && !isStandalone && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-3 text-amber-500">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold">iOS Setup Required</p>
              <p className="text-[11px] text-nex-muted mt-1 leading-relaxed">
                Apple requires web apps to be installed as a PWA to use notifications. 
                Tap the <span className="font-semibold text-amber-500">Share</span> button in Safari, select 
                <span className="font-semibold text-amber-500">"Add to Home Screen"</span>, and open NexMess from your home screen to enable push alerts.
              </p>
            </div>
          </div>
        )}

        {/* Troubleshooting Blocked State */}
        {permission === 'denied' && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-3 text-red-500">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold">Permissions Blocked</p>
              <p className="text-[11px] text-nex-muted mt-1 leading-relaxed">
                Notifications have been blocked in your browser settings. To receive alerts, click the site settings icon (lock/sliders) in your browser address bar and change notifications to <span className="font-semibold text-red-500">Allow</span>.
              </p>
            </div>
          </div>
        )}


        {/* Informative Status Footer */}
        <div className="flex items-center gap-1.5 text-[10px] text-nex-muted px-1">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Web push is device-specific. You need to enable it on each device you want to receive alerts.</span>
        </div>
      </div>
    </div>
  )
}
