import { useTranslation } from 'react-i18next'
import { usePageTitle } from '../../hooks/usePageTitle'
import { ShoppingBag, CalendarClock, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import SlidingTabs from '../../components/SlidingTabs'
import BazaarSchedule from './components/BazaarSchedule'
import MealRoutine from './components/MealRoutine'
import { useNavigate, useSearchParams } from 'react-router-dom'

type MarketTab = 'bazaar' | 'routine'

export default function MarketPage() {
  const { t } = useTranslation()
  usePageTitle(t('market.title'))
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const activeTab: MarketTab = tabParam === 'routine' ? 'routine' : 'bazaar'
  const navigate = useNavigate()

  const handleTabChange = (nextTab: MarketTab) => {
    const next = new URLSearchParams(searchParams)
    if (nextTab === 'bazaar') next.delete('tab')
    else next.set('tab', nextTab)
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Tab Switcher */}
      <div className="flex items-center justify-between gap-3">
        <SlidingTabs
          layoutId="market-tabs"
          ariaLabel={t('market.title')}
          tabs={[
            { key: 'bazaar', label: t('market.tabs.schedule'), icon: ShoppingBag },
            { key: 'routine', label: t('market.tabs.routine'), icon: CalendarClock },
          ]}
          activeTab={activeTab}
          onChange={handleTabChange}
          className="min-w-0"
        />

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
      <div className="min-h-0">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {activeTab === 'bazaar' ? <BazaarSchedule /> : <MealRoutine />}
        </motion.div>
      </div>
    </div>
  )
}
