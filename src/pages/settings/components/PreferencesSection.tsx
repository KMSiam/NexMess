import { useTranslation } from 'react-i18next'
import { Languages, Sun, Moon, Type, Check } from 'lucide-react'
import LanguageSwitcher from '../../../components/LanguageSwitcher'
import { useThemeStore } from '../../../stores/themeStore'

export default function PreferencesSection() {
  const { t, i18n } = useTranslation()
  const isBangla = (i18n.language || 'en').startsWith('bn')
  const { isDark, setTheme } = useThemeStore()

  return (
    <div className="space-y-6">
      {/* Language Section */}
      <div className="nex-card border-nex-border rounded-2xl border p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3 border-b border-nex-border/60 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-nex-primary/10 text-nex-primary">
            <Languages className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-nex-text">
              {t('settings.language.title')}
            </h3>
            <p className="text-xs text-nex-muted mt-0.5">
              {t('settings.language.description')}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <LanguageSwitcher variant="select" />
        </div>

        {/* Font Preview Showcase */}
        <div className="mt-5 rounded-xl border border-nex-border/70 bg-nex-elevated/60 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-nex-muted uppercase tracking-wider mb-2">
            <Type className="h-4 w-4 text-nex-primary" />
            <span>{isBangla ? 'ফন্ট প্রিভিউ (হিন্দ শিলিগুড়ি)' : 'Font Preview (Hind Siliguri / Inter)'}</span>
          </div>
          <p className="text-sm font-medium text-nex-text leading-relaxed font-bangla">
            {isBangla
              ? '“মেসের সকল হিসাব-নিকাশ, বাজার খরচ এবং দৈনিক মিলের আধুনিক স্মার্ট সমাধান।”'
              : '“Complete transparency for daily meals, shared bazaar costs, and smart mess accounting.”'}
          </p>
          <p className="text-[11px] text-nex-muted mt-2 font-mono">
            Optimized for Retina displays, PWA offline caching, and cross-platform fidelity.
          </p>
        </div>
      </div>

      {/* Theme Section */}
      <div className="nex-card border-nex-border rounded-2xl border p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3 border-b border-nex-border/60 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
            {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-nex-text">
              {t('settings.theme.title')}
            </h3>
            <p className="text-xs text-nex-muted mt-0.5">
              {t('settings.theme.description')}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setTheme(false)}
            className={`flex items-center justify-between rounded-2xl border p-4 text-left transition-all ${
              !isDark
                ? 'border-nex-primary bg-nex-primary/5 dark:bg-nex-primary/10 shadow-sm ring-1 ring-nex-primary'
                : 'border-nex-border bg-nex-surface hover:border-nex-primary/40 hover:bg-nex-hover/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-600">
                <Sun className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-nex-text">{t('common.light')}</p>
                <p className="text-xs text-nex-muted">Warm Ivory theme</p>
              </div>
            </div>
            {!isDark && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-nex-primary text-white">
                <Check className="h-3 w-3 stroke-[3]" />
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setTheme(true)}
            className={`flex items-center justify-between rounded-2xl border p-4 text-left transition-all ${
              isDark
                ? 'border-nex-primary bg-nex-primary/5 dark:bg-nex-primary/10 shadow-sm ring-1 ring-nex-primary'
                : 'border-nex-border bg-nex-surface hover:border-nex-primary/40 hover:bg-nex-hover/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800 text-zinc-300">
                <Moon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-nex-text">{t('common.dark')}</p>
                <p className="text-xs text-nex-muted">Midnight Obsidian theme</p>
              </div>
            </div>
            {isDark && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-nex-primary text-white">
                <Check className="h-3 w-3 stroke-[3]" />
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
