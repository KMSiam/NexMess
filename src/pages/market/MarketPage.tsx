import { useState } from 'react'
import { usePageTitle } from '../../hooks/usePageTitle'
import { ShoppingBag, CalendarClock } from 'lucide-react'
import BazaarSchedule from './components/BazaarSchedule'
import MealRoutine from './components/MealRoutine'

export default function MarketPage() {
  usePageTitle('Market & Routine')
  const [activeTab, setActiveTab] = useState<'bazaar' | 'routine'>('bazaar')

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Tab Switcher */}
      <div className="border-nex-border flex border-b">
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

      {/* Tab Content */}
      <div className="min-h-0">{activeTab === 'bazaar' ? <BazaarSchedule /> : <MealRoutine />}</div>
    </div>
  )
}
