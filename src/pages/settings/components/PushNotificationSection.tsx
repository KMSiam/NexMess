import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, BellOff, AlertTriangle, HelpCircle, ShieldAlert, Loader2 } from 'lucide-react'

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
  let statusColor = 'text-nex-muted bg-nex-elevated border-nex-border'

  if (permission === 'unsupported') {
    statusText = t('settings.pushSection.unsupported')
    statusColor = 'text-nex-danger bg-nex-danger-light border-nex-danger/25'
  } else if (permission === 'denied') {
    statusText = t('settings.pushSection.blocked')
    statusColor = 'text-nex-danger bg-nex-danger-light border-nex-danger/25'
  } else if (pushEnabled) {
    statusText = t('settings.pushSection.active')
    statusColor = 'text-nex-primary-ink bg-nex-primary-light border-nex-primary/25'
  }

  return (
    <div className="nex-card border-nex-border/70 relative overflow-hidden border p-6">
      {/* Decorative gradient light matched to Sage/Emerald theme */}
      <div className="bg-nex-primary/10 pointer-events-none absolute -top-12 -right-12 h-56 w-56 rounded-full blur-3xl dark:bg-emerald-500/10" />

      <div className="relative mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="mb-1.5 flex items-center gap-2.5">
            <h3 className="text-nex-text text-lg font-semibold">
              {t('settings.pushSection.title')}
            </h3>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors duration-300 ${statusColor}`}
            >
              {statusText}
            </span>
          </div>
          <p className="text-nex-muted text-xs">{t('settings.pushSection.desc')}</p>
        </div>

        {permission !== 'unsupported' && (
          <button
            type="button"
            role="switch"
            aria-checked={pushEnabled}
            aria-label={t('settings.pushSection.title')}
            onClick={onToggle}
            disabled={pushLoading}
            className={`group focus-visible:ring-nex-primary/50 relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full p-1 transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 active:scale-[0.97] disabled:cursor-wait disabled:opacity-70 ${
              pushEnabled
                ? 'bg-gradient-to-r from-[#3a5643] to-[#4a6d56] shadow-inner shadow-black/15 dark:from-emerald-600 dark:to-emerald-500 dark:shadow-[0_0_14px_rgba(16,185,129,0.28)]'
                : 'border border-[#d8cfc4] bg-[#e6dfd5] hover:bg-[#ddd4c8] dark:border-[#34343d] dark:bg-[#27272d] dark:hover:bg-[#313138]'
            }`}
          >
            <span
              className={`pointer-events-none flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-black/5 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                pushEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            >
              {pushLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#4a6d56] dark:text-emerald-600" />
              ) : pushEnabled ? (
                <Bell className="h-3.5 w-3.5 text-[#3a5643] transition-transform duration-300 group-hover:scale-110 dark:text-emerald-600" />
              ) : (
                <BellOff className="text-nex-muted h-3.5 w-3.5 transition-transform duration-300" />
              )}
            </span>
          </button>
        )}
      </div>

      {/* Main notification state section */}
      <div className="space-y-4">
        {/* iOS Specific Warning */}
        {isIOS && !isStandalone && (
          <div className="border-nex-warning/25 bg-nex-warning-light/60 text-nex-warning flex gap-3 rounded-xl border p-4">
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
          <div className="border-nex-danger/25 bg-nex-danger-light/70 text-nex-danger flex gap-3 rounded-xl border p-4">
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
