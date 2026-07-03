import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
          className={`relative flex items-center gap-2 px-4 pb-3 text-sm font-semibold transition-colors focus:outline-none ${
            activeTab === 'bazaar' ? 'text-nex-primary' : 'text-nex-muted hover:text-nex-text'
          }`}
        >
          <ShoppingBag className="h-4.5 w-4.5" />
          <span>Bazaar Schedule</span>
          {activeTab === 'bazaar' && (
            <motion.div
              layoutId="activeTabUnderline"
              className="bg-nex-primary absolute bottom-0 left-0 right-0 h-0.5"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab('routine')}
          className={`relative flex items-center gap-2 px-4 pb-3 text-sm font-semibold transition-colors focus:outline-none ${
            activeTab === 'routine' ? 'text-nex-primary' : 'text-nex-muted hover:text-nex-text'
          }`}
        >
          <CalendarClock className="h-4.5 w-4.5" />
          <span>Meal Routine</span>
          {activeTab === 'routine' && (
            <motion.div
              layoutId="activeTabUnderline"
              className="bg-nex-primary absolute bottom-0 left-0 right-0 h-0.5"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
        </button>
      </div>

      {/* Tab Content with smooth animations */}
      <div className="min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'bazaar' ? <BazaarSchedule /> : <MealRoutine />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
