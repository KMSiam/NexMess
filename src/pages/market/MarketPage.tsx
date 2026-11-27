import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePageTitle } from '../../hooks/usePageTitle'
import { ShoppingBag, CalendarClock, Sparkles } from 'lucide-react'
import BazaarSchedule from './components/BazaarSchedule'
import MealRoutine from './components/MealRoutine'
import { useNavigate } from 'react-router-dom'

export default function MarketPage() {
  const { t } = useTranslation()
  usePageTitle(t('market.title'))
  const [activeTab, setActiveTab] = useState<'bazaar' | 'routine'>('bazaar')
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Tab Switcher */}
      <div className="border-nex-border flex items-center justify-between gap-2 border-b pb-3">
        <div
          role="tablist"
          aria-label={t('market.title')}
          className="bg-nex-elevated border-nex-border/80 scrollbar-none flex min-w-0 items-center gap-1 overflow-x-auto rounded-xl border p-1"
        >
          {[
            { key: 'bazaar' as const, label: t('market.tabs.schedule'), icon: ShoppingBag },
            { key: 'routine' as const, label: t('market.tabs.routine'), icon: CalendarClock },
          ].map(({ key, label, icon: Icon }) => {
            const isActive = activeTab === key
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(key)}
                className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all focus:outline-none sm:gap-2 sm:px-3.5 sm:text-sm ${
                  isActive
                    ? 'bg-nex-primary text-white shadow-xs'
                    : 'text-nex-muted hover:text-nex-text hover:bg-nex-hover/60'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{label}</span>
              </button>
            )
          })}
        </div>

        {/* NexMessAI Quick Access Button */}
        <button
          type="button"
          onClick={() => navigate('/nexmess-ai')}
          className="bg-nex-primary-light text-nex-primary-ink border-nex-primary/20 hover:bg-nex-primary/15 flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all active:scale-95"
          id="open-ai-assistant"
        >
          <Sparkles className="h-3.5 w-3.5 animate-pulse" />
          <span className="hidden sm:inline">{t('market.tabs.ai')}</span>
          <span className="sm:hidden">AI</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-0">{activeTab === 'bazaar' ? <BazaarSchedule /> : <MealRoutine />}</div>
    </div>
  )
}
