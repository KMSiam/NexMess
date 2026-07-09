import { useState } from 'react'
import { usePageTitle } from '../../hooks/usePageTitle'
import { ShoppingBag, CalendarClock, Sparkles } from 'lucide-react'
import BazaarSchedule from './components/BazaarSchedule'
import MealRoutine from './components/MealRoutine'
import { useNavigate } from 'react-router-dom'

export default function MarketPage() {
  usePageTitle('Market & Routine')
  const [activeTab, setActiveTab] = useState<'bazaar' | 'routine'>('bazaar')
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Tab Switcher */}
      <div className="border-nex-border flex items-center justify-between border-b">
        <div className="flex">
          <button
            onClick={() => setActiveTab('bazaar')}
            className={`-mb-[2px] flex items-center gap-2 border-b-2 px-4 pb-3 text-sm font-semibold transition-all focus:outline-none ${
              activeTab === 'bazaar'
                ? 'border-nex-primary text-nex-primary'
                : 'text-nex-muted hover:text-nex-text border-transparent'
            }`}
          >
            <ShoppingBag className="h-4.5 w-4.5" />
            <span>Bazaar Schedule</span>
          </button>
          <button
            onClick={() => setActiveTab('routine')}
            className={`-mb-[2px] flex items-center gap-2 border-b-2 px-4 pb-3 text-sm font-semibold transition-all focus:outline-none ${
              activeTab === 'routine'
                ? 'border-nex-primary text-nex-primary'
                : 'text-nex-muted hover:text-nex-text border-transparent'
            }`}
          >
            <CalendarClock className="h-4.5 w-4.5" />
            <span>Meal Routine</span>
          </button>
        </div>

        {/* NexMessAI Quick Access Button */}
        <button
          onClick={() => navigate('/market-assistant')}
          className="bg-nex-primary/10 text-nex-primary hover:bg-nex-primary/20 mb-2 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all active:scale-95"
          id="open-ai-assistant"
        >
          <Sparkles className="h-3.5 w-3.5 animate-pulse" />
          <span className="hidden sm:inline">NexMessAI</span>
          <span className="sm:hidden">AI</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-0">{activeTab === 'bazaar' ? <BazaarSchedule /> : <MealRoutine />}</div>
    </div>
  )
}
