import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default')
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(true)

  useEffect(() => {
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    const ios = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(ios)

    // Detect standalone mode (Added to Home Screen)
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    setIsStandalone(standalone)

    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setPermission('unsupported')
      return
    }

    setPermission(Notification.permission)
  }, [pushEnabled])

  // Determine the status text and color
  let statusText = t('settings.pushSection.disabled')
  let statusColor = 'text-nex-muted bg-nex-muted/10 border-nex-muted/20'

  if (permission === 'unsupported') {
    statusText = t('settings.pushSection.unsupported')
    statusColor = 'text-red-500 bg-red-500/10 border-red-500/20'
  } else if (permission === 'denied') {
    statusText = t('settings.pushSection.blocked')
    statusColor = 'text-red-500 bg-red-500/10 border-red-500/20'
  } else if (pushEnabled) {
    statusText = t('settings.pushSection.active')
    statusColor = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
  }

  return (
    <div className="nex-card border-nex-border/50 relative overflow-hidden border p-6">
      {/* Decorative gradient light */}
      <div className="pointer-events-none absolute top-0 right-0 h-64 w-64 rounded-full bg-blue-500/5 blur-3xl" />

      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <h3 className="text-nex-text text-lg font-semibold">{t('settings.pushSection.title')}</h3>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColor}`}
            >
              {statusText}
            </span>
          </div>
          <p className="text-nex-muted text-xs">
            {t('settings.pushSection.desc')}
          </p>
        </div>

        {permission !== 'unsupported' && (
          <button
            onClick={onToggle}
            disabled={pushLoading}
            className={`relative h-8 w-14 shrink-0 rounded-full shadow-inner transition-all duration-300 disabled:opacity-50 ${
              pushEnabled
                ? 'bg-blue-600 shadow-blue-700/50'
                : 'bg-nex-elevated border-nex-border border'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md transition-transform duration-300 ${
                pushEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            >
              {pushEnabled ? (
                <Bell className="h-3.5 w-3.5 text-blue-600" />
              ) : (
                <BellOff className="text-nex-muted h-3.5 w-3.5" />
              )}
            </span>
          </button>
        )}
      </div>

      {/* Main notification state section */}
      <div className="space-y-4">
        {/* iOS Specific Warning */}
        {isIOS && !isStandalone && (
          <div className="flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-500">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-xs font-semibold">{t('settings.pushSection.iosTitle')}</p>
              <p className="text-nex-muted mt-1 text-[11px] leading-relaxed">
                {t('settings.pushSection.iosDesc')}
              </p>
            </div>
          </div>
        )}

        {/* Troubleshooting Blocked State */}
        {permission === 'denied' && (
          <div className="flex gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-500">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-xs font-semibold">{t('settings.pushSection.blockedTitle')}</p>
              <p className="text-nex-muted mt-1 text-[11px] leading-relaxed">
                {t('settings.pushSection.blockedDesc')}
              </p>
            </div>
          </div>
        )}

        {/* Informative Status Footer */}
        <div className="text-nex-muted flex items-center gap-1.5 px-1 text-[10px]">
          <HelpCircle className="h-3.5 w-3.5" />
          <span>
            {t('settings.pushSection.deviceNote')}
          </span>
        </div>
      </div>
    </div>
  )
}
