import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sun, Moon, Zap, Globe } from 'lucide-react'
import logoIcon from '../../../assets/logo-icon.svg'
import LanguageSwitcher from '../../../components/LanguageSwitcher'
import SupportModal from '../../../components/SupportModal'
import { useThemeStore } from '../../../stores/themeStore'
import { APP_VERSION } from '../../../lib/version'
import { formatNumber } from '../../../lib/utils'

interface AuthLayoutProps {
  heroBadge: string
  heroBadgeTag?: string
  heroTitleLine1: string
  heroTitleLine2: string
  heroUnderlineSecondLine?: boolean
  heroDesc: string
  heroFeatures: string[]
  title: string
  subtitle: string
  googleLabel: string
  googlePending: boolean
  googleDisabled?: boolean
  googleButtonId: string
  onGoogleClick: () => void
  orDividerLabel: string
  alertBanner?: ReactNode
  footerPrompt?: ReactNode
  children: ReactNode
}

const LEFT_PARTICLES = [
  'top-[18%] left-[12%] h-2 w-2 opacity-75',
  'top-[10%] left-[57%] h-1.5 w-1.5 opacity-60',
  'top-[28%] right-[13%] h-2.5 w-2.5 opacity-55',
  'top-[45%] left-[8%] h-1.5 w-1.5 opacity-50',
  'bottom-[33%] right-[17%] h-2 w-2 opacity-45',
  'bottom-[25%] left-[37%] h-2 w-2 opacity-55',
  'bottom-[22%] left-[19%] h-2.5 w-2.5 opacity-40',
  'bottom-[14%] right-[27%] h-1.5 w-1.5 opacity-70',
]

const RIGHT_PARTICLES = [
  'top-[10%] left-[8%] h-2 w-2 bg-emerald-400/55 dark:bg-emerald-400/25',
  'top-[22%] right-[6%] h-2 w-2 bg-stone-400/35 dark:bg-white/10',
  'top-[44%] left-[4%] hidden h-1.5 w-1.5 bg-emerald-400/55 sm:block dark:bg-emerald-400/25',
  'bottom-[32%] right-[4%] hidden h-1.5 w-1.5 bg-stone-400/35 sm:block dark:bg-white/10',
  'bottom-[11%] left-[9%] h-2.5 w-2.5 bg-emerald-400/35 dark:bg-emerald-400/20',
  'bottom-[9%] right-[14%] h-1.5 w-1.5 bg-emerald-400/50 dark:bg-emerald-400/25',
]

function GoogleLogo() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

/**
 * Shared split-screen layout shell for NexMess Login and Registration pages.
 */
export default function AuthLayout({
  heroBadge,
  heroBadgeTag,
  heroTitleLine1,
  heroTitleLine2,
  heroUnderlineSecondLine = false,
  heroDesc,
  heroFeatures,
  title,
  subtitle,
  googleLabel,
  googlePending,
  googleDisabled = false,
  googleButtonId,
  onGoogleClick,
  orDividerLabel,
  alertBanner,
  footerPrompt,
  children,
}: AuthLayoutProps) {
  const { t, i18n } = useTranslation()
  const isBangla = (i18n.language || 'en').startsWith('bn')
  const { isDark, toggleTheme } = useThemeStore()
  const [isSupportOpen, setIsSupportOpen] = useState(false)

  const brandName = isBangla ? t('common.appName') : 'NexMess'
  const currentYear = formatNumber(new Date().getFullYear())
  const displayVersion = formatNumber(APP_VERSION)

  return (
    <div className={`bg-nex-bg flex min-h-screen ${isBangla ? 'font-bangla' : 'font-sans'}`}>
      {/* Left Brand / Hero Panel */}
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-[#355340] via-[#2F4B39] to-[#22392B] p-10 text-white lg:flex xl:p-12 dark:border-r dark:border-white/5">
        {/* Ambient radial mist & glowing particles */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 48% 48%, rgba(52, 211, 153, 0.14) 0%, rgba(74, 109, 86, 0.08) 42%, transparent 72%)',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 h-24 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.04] blur-[1px]"
        />
        {LEFT_PARTICLES.map((posClass, idx) => (
          <span
            key={idx}
            aria-hidden="true"
            className={`pointer-events-none absolute rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.75)] ${posClass}`}
          />
        ))}

        {/* Top Branding & Audience Badge */}
        <div className="relative z-10 flex items-center justify-between gap-4">
          <Link to="/" className="group flex items-center gap-3 transition-opacity hover:opacity-90">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white/10 p-1.5 shadow-sm backdrop-blur-md transition-transform group-hover:scale-105">
              <img src={logoIcon} alt={brandName} className="h-full w-full rounded-lg" />
            </div>
            <div>
              <span className="block text-xl leading-tight font-bold tracking-tight text-white">
                {brandName}
              </span>
              <span className="block text-[10px] font-semibold tracking-[0.16em] text-emerald-200/75 uppercase">
                {t('auth.shell.brandTagline')}
              </span>
            </div>
          </Link>

          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3.5 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm">
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.85)]" />
            <span>{t('auth.shell.audienceBadge')}</span>
          </div>
        </div>

        {/* Center Hero Copy */}
        <div className="relative z-10 mx-auto my-auto flex max-w-lg flex-col items-center py-8 text-center">
          <div className="font-bangla mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-[#183827]/75 px-4 py-1.5 text-xs font-medium text-emerald-100/95 shadow-sm backdrop-blur-sm">
            {heroBadgeTag ? (
              <span className="rounded border border-emerald-400/30 bg-emerald-400/15 px-1.5 py-0.5 font-sans text-[10px] font-bold tracking-wider text-emerald-300">
                {heroBadgeTag}
              </span>
            ) : (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
            )}
            <span>{heroBadge}</span>
          </div>

          <p className="text-4xl leading-[1.14] font-extrabold tracking-tight text-white xl:text-[2.75rem]">
            {heroTitleLine1}
            <br />
            {heroUnderlineSecondLine ? (
              <span className="relative inline-block pb-1.5">
                {heroTitleLine2}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 220 14"
                  fill="none"
                  preserveAspectRatio="none"
                  className="pointer-events-none absolute right-0 -bottom-0.5 left-0 h-2.5 w-full text-emerald-400/90"
                >
                  <path
                    d="M3 8.5C58 3.2 152 2.8 217 9"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            ) : (
              heroTitleLine2
            )}
          </p>

          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-[#D8E5DC]">{heroDesc}</p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
            {heroFeatures.map((feature) => (
              <div
                key={feature}
                className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.08] px-3.5 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Left Panel Footer */}
        <div className="relative z-10 flex items-center justify-between gap-4 border-t border-white/10 pt-5 text-xs text-white/55">
          <span>{t('auth.shell.copyright', { year: currentYear })}</span>
          <span>{t('auth.shell.versionLocation', { version: displayVersion })}</span>
        </div>
      </aside>

      {/* Right Interactive Auth Panel */}
      <main className="relative flex flex-1 flex-col justify-between overflow-hidden px-5 py-5 sm:px-8 sm:py-7 lg:px-10">
        {RIGHT_PARTICLES.map((posClass, idx) => (
          <span
            key={idx}
            aria-hidden="true"
            className={`pointer-events-none absolute rounded-full ${posClass}`}
          />
        ))}

        {/* Top Utility Controls */}
        <header className="relative z-20 flex items-center justify-between gap-2 lg:justify-end">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-85 lg:hidden"
          >
            <div className="h-9 w-9 overflow-hidden rounded-xl shadow-xs">
              <img src={logoIcon} alt={brandName} className="h-full w-full" />
            </div>
            <span className="text-nex-text text-xl font-bold whitespace-nowrap">{brandName}</span>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={toggleTheme}
              className="border-nex-border/80 bg-nex-surface/85 hover:bg-nex-hover text-nex-muted hover:text-nex-text relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border shadow-xs transition-colors active:scale-95"
              title={isDark ? t('common.light') : t('common.dark')}
              aria-label={t('settings.theme.toggle')}
            >
              <Sun
                className={`h-4 w-4 text-amber-400 transition-all duration-300 ${
                  isDark ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-90 opacity-0'
                }`}
              />
              <Moon
                className={`absolute h-4 w-4 transition-all duration-300 ${
                  isDark ? 'scale-0 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'
                }`}
              />
            </button>
          </div>
        </header>

        {/* Centered Form Area */}
        <div className="relative z-10 mx-auto my-auto w-full max-w-[420px] py-6">
          <div className="mb-7 text-center">
            <h1 className="text-nex-text text-2xl font-extrabold tracking-tight sm:text-[1.75rem]">
              {title}
            </h1>
            <p className="text-nex-muted mt-1.5 text-sm">{subtitle}</p>
          </div>

          {alertBanner}

          <button
            type="button"
            onClick={onGoogleClick}
            disabled={googlePending || googleDisabled}
            className="border-nex-border bg-nex-surface text-nex-text hover:bg-nex-hover mb-6 flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold shadow-xs transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            id={googleButtonId}
          >
            {googlePending ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <GoogleLogo />
            )}
            <span>{googleLabel}</span>
          </button>

          <div className="mb-6 flex items-center gap-3">
            <div className="bg-nex-border h-px flex-1" />
            <span
              className={`text-nex-muted text-[11px] font-semibold ${
                !isBangla ? 'tracking-wider uppercase' : ''
              }`}
            >
              {orDividerLabel}
            </span>
            <div className="bg-nex-border h-px flex-1" />
          </div>

          {children}

          {footerPrompt && (
            <p className="text-nex-muted mt-6 text-center text-sm">{footerPrompt}</p>
          )}
        </div>

        {/* Right Panel Footer */}
        <footer className="border-nex-border relative z-10 mx-auto flex w-full max-w-xl flex-col items-center justify-between gap-2.5 border-t pt-4 text-xs text-nex-muted sm:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
            <span className="inline-flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 shrink-0" />
              <span>{t('auth.shell.pwaReady')}</span>
            </span>
            <Link
              to="/faq"
              className="hover:text-nex-text inline-flex items-center gap-1.5 transition-colors"
            >
              <Globe className="h-3.5 w-3.5 shrink-0" />
              <span>{t('auth.shell.faqHelp')}</span>
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1">
            <Link to="/privacy-policy" className="hover:text-nex-text transition-colors">
              {t('auth.shell.privacy')}
            </Link>
            <span aria-hidden="true">•</span>
            <Link to="/terms-of-service" className="hover:text-nex-text transition-colors">
              {t('auth.shell.terms')}
            </Link>
            <span aria-hidden="true">•</span>
            <button
              type="button"
              onClick={() => setIsSupportOpen(true)}
              className="hover:text-nex-text cursor-pointer transition-colors"
            >
              {t('auth.shell.support')}
            </button>
          </div>
        </footer>
      </main>

      <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
    </div>
  )
}
