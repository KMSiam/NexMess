import { Link } from 'react-router-dom'
import { ArrowLeft, Sun, Moon, LayoutDashboard } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import logoIcon from '../../assets/logo-icon.svg'
import LanguageSwitcher from '../LanguageSwitcher'
import { useThemeStore } from '../../stores/themeStore'
import { useAuthStore } from '../../stores/authStore'

export default function PublicHeader() {
  const { t, i18n } = useTranslation()
  const isBangla = (i18n.language || 'en').startsWith('bn')
  const { isDark, toggleTheme } = useThemeStore()
  const user = useAuthStore((s) => s.user)

  return (
    <header className="nex-glass border-nex-border/50 sticky top-0 z-40 flex w-full items-center justify-between gap-2 border-b px-4 py-3 md:px-6">
      <Link to={user ? '/dashboard' : '/'} className="flex shrink-0 items-center gap-2">
        <img src={logoIcon} alt="NexMess" className="h-8 w-8 rounded-lg" />
        <span className="text-nex-text text-base font-bold tracking-tight whitespace-nowrap sm:text-lg">
          {isBangla ? t('common.appName') : 'NexMess'}
        </span>
      </Link>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <LanguageSwitcher />

        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-btn hover:bg-nex-hover text-nex-muted hover:text-nex-text relative flex h-9 w-9 items-center justify-center transition-colors active:scale-95"
          title={isDark ? t('common.light') : t('common.dark')}
          aria-label={t('settings.theme.toggle')}
        >
          <Sun
            className={`h-5 w-5 text-amber-400 transition-all duration-300 ${
              isDark ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-90 opacity-0'
            }`}
          />
          <Moon
            className={`absolute h-5 w-5 transition-all duration-300 ${
              isDark ? 'scale-0 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'
            }`}
          />
        </button>

        <Link
          to={user ? '/dashboard' : '/'}
          className="nex-btn-secondary flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs font-semibold whitespace-nowrap sm:px-4 sm:py-2"
        >
          {user ? <LayoutDashboard className="h-3.5 w-3.5" /> : <ArrowLeft className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">
            {user
              ? isBangla
                ? 'ড্যাশবোর্ড'
                : 'Back to Dashboard'
              : isBangla
                ? 'হোমে ফিরে যান'
                : 'Back to Home'}
          </span>
          <span className="sm:hidden">
            {user ? (isBangla ? 'ড্যাশবোর্ড' : 'Dashboard') : isBangla ? 'হোম' : 'Home'}
          </span>
        </Link>
      </div>
    </header>
  )
}
