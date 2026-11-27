import { useState } from 'react'
import { Check, Moon, Sun, type LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { formatCurrency, formatNumber } from '../../../lib/utils'

interface MealDayState {
  lunchActive: boolean
  dinnerActive: boolean
  lunchGuests: number
  dinnerGuests: number
}

interface MealSlotProps {
  icon: LucideIcon
  iconBgClass: string
  iconTextClass: string
  title: string
  active: boolean
  guests: number
  isBangla: boolean
  decreaseLabel: string
  increaseLabel: string
  onToggle: () => void
  onUpdateGuests: (delta: number) => void
}

function MealSlotCard({
  icon: SlotIcon,
  iconBgClass,
  iconTextClass,
  title,
  active,
  guests,
  isBangla,
  decreaseLabel,
  increaseLabel,
  onToggle,
  onUpdateGuests,
}: MealSlotProps) {
  const isHighlighted = active || guests > 0
  const statusText = isBangla ? (active ? 'খাচ্ছি' : 'বন্ধ') : active ? 'Eating' : 'Skipping'

  return (
    <div
      className={`flex flex-col rounded-xl border p-3.5 transition-all duration-300 ${
        isHighlighted
          ? 'border-emerald-200/90 bg-emerald-50/75 dark:border-emerald-500/25 dark:bg-emerald-500/[0.08]'
          : 'border-nex-border bg-nex-surface dark:border-[#2c2c32] dark:bg-[#1c1c20]'
      }`}
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${iconBgClass}`}
            aria-hidden="true"
          >
            <SlotIcon className={`h-4 w-4 ${iconTextClass}`} />
          </span>
          <div>
            <p className="text-nex-text text-xs font-semibold">{title}</p>
            <p
              className={`text-[10px] font-medium ${
                active ? 'font-bold text-[#16794C] dark:text-emerald-400' : 'text-nex-muted'
              }`}
            >
              {statusText}
            </p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={active}
          aria-label={title}
          onClick={onToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-all duration-300 active:scale-95 ${
            active
              ? 'bg-gradient-to-r from-[#23543A] to-[#16794C] shadow-inner shadow-black/10 dark:from-emerald-600 dark:to-emerald-500'
              : 'bg-[#ded6ca] dark:bg-[#2f2f36]'
          }`}
        >
          <span
            className={`pointer-events-none flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
              active ? 'translate-x-5' : 'translate-x-0'
            }`}
          >
            {active && (
              <Check className="h-2.5 w-2.5 stroke-[3] text-[#16794C] dark:text-emerald-600" />
            )}
          </span>
        </button>
      </div>

      <div className="border-nex-border/60 flex items-center justify-between border-t pt-2.5 dark:border-white/5">
        <span className="text-nex-muted text-[10px] font-medium">
          {isBangla ? 'মেহমান' : 'Guests'}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onUpdateGuests(-1)}
            disabled={guests === 0}
            aria-label={decreaseLabel}
            className="bg-nex-surface border-nex-border text-nex-muted hover:bg-nex-hover flex h-5 w-5 cursor-pointer items-center justify-center rounded border text-[10px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-45 dark:bg-[#161618]"
          >
            -
          </button>
          <span className="text-nex-text w-3 text-center text-[11px] font-semibold tabular-nums">
            {formatNumber(guests)}
          </span>
          <button
            type="button"
            onClick={() => onUpdateGuests(1)}
            aria-label={increaseLabel}
            className="bg-nex-surface border-nex-border text-nex-muted hover:bg-nex-hover flex h-5 w-5 cursor-pointer items-center justify-center rounded border text-[10px] font-bold transition-colors dark:bg-[#161618]"
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}

interface HeroDashboardPreviewProps {
  isBangla: boolean
}

export default function HeroDashboardPreview({ isBangla }: HeroDashboardPreviewProps) {
  const [previewDay, setPreviewDay] = useState<'today' | 'tomorrow'>('today')
  const [days, setDays] = useState<Record<'today' | 'tomorrow', MealDayState>>({
    today: { lunchActive: true, dinnerActive: false, lunchGuests: 0, dinnerGuests: 0 },
    tomorrow: { lunchActive: false, dinnerActive: false, lunchGuests: 0, dinnerGuests: 0 },
  })

  const currentDay = days[previewDay]

  const toggleSlot = (slot: 'lunchActive' | 'dinnerActive') => {
    setDays((prev) => ({
      ...prev,
      [previewDay]: {
        ...prev[previewDay],
        [slot]: !prev[previewDay][slot],
      },
    }))
  }

  const updateGuests = (slot: 'lunchGuests' | 'dinnerGuests', delta: number) => {
    setDays((prev) => ({
      ...prev,
      [previewDay]: {
        ...prev[previewDay],
        [slot]: Math.max(0, Math.min(10, prev[previewDay][slot] + delta)),
      },
    }))
  }

  // Live recalculating metrics across Today & Tomorrow in Bangladeshi Taka (৳)
  const pastMeals = 16.5
  const countDayMeals = (d: MealDayState) =>
    (d.lunchActive ? 1 : 0) + (d.dinnerActive ? 1 : 0) + d.lunchGuests + d.dinnerGuests
  const totalMeals = pastMeals + countDayMeals(days.today) + countDayMeals(days.tomorrow)
  const mealRate = 75
  const deposit = 1800
  const fixedCosts = 280
  const totalCost = totalMeals * mealRate + fixedCosts
  const balance = deposit - totalCost
  const messTotalSpent = 6450

  const activities = isBangla
    ? [
        { id: 1, actor: 'সিয়াম', action: '৳ ১,৪৫০ বাজার খরচ যোগ করেছেন', time: '১০ মিনিট আগে', type: 'expense' },
        { id: 2, actor: 'আবির', action: '৳ ২,০০০ জমা দিয়েছেন', time: '১ ঘণ্টা আগে', type: 'deposit' },
        { id: 3, actor: 'সিয়াম', action: '৳ ৩২০ ইউটিলিটি ফিক্সড খরচ যোগ করেছেন', time: '৩ ঘণ্টা আগে', type: 'expense' },
      ]
    : [
        { id: 1, actor: 'Siam', action: 'added ৳ 1,450 bazaar cost', time: '10m ago', type: 'expense' },
        { id: 2, actor: 'Abir', action: 'added ৳ 2,000 deposit', time: '1h ago', type: 'deposit' },
        { id: 3, actor: 'Siam', action: 'added ৳ 320 utility fixed cost', time: '3h ago', type: 'expense' },
      ]

  const isPositiveBalance = balance >= 0

  return (
    <div className="relative flex w-full max-w-lg flex-1 justify-center lg:max-w-none">
      {/* Ambient emerald glow behind interactive preview */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-4 rounded-3xl bg-emerald-500/12 blur-3xl dark:bg-emerald-500/10"
      />

      <div className="border-nex-border/90 bg-nex-surface/95 relative flex w-full max-w-lg flex-col overflow-hidden rounded-3xl border p-4 shadow-[0_24px_60px_-15px_rgba(20,40,28,0.12)] backdrop-blur-md sm:p-5 dark:shadow-[0_24px_60px_-15px_rgba(0,0,0,0.6)]">
        {/* Window Top Chrome */}
        <div className="border-nex-border mb-4 flex items-center justify-between gap-2 border-b pb-3 text-xs">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </div>

          <span className="border-nex-border/80 bg-nex-bg/70 text-nex-muted rounded-md border px-3 py-0.5 font-mono text-[10px] sm:text-[11px]">
            nexmess.shop/dashboard
          </span>

          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-[10px] font-bold tracking-wider text-emerald-700 dark:text-emerald-400">
              {isBangla ? 'লাইভ' : 'LIVE'}
            </span>
          </div>
        </div>

        {/* 4 Live KPI Cards */}
        <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
          <div className="border-nex-border bg-nex-bg/50 rounded-xl border p-2.5 text-center sm:p-3 dark:bg-white/[0.03]">
            <p className="text-nex-muted text-[9px] font-semibold tracking-wider uppercase">
              {isBangla ? 'আমার মিল' : 'My Meals'}
            </p>
            <motion.p
              key={totalMeals}
              initial={{ scale: 1.08 }}
              animate={{ scale: 1 }}
              className="text-nex-text mt-1 text-base font-extrabold tabular-nums sm:text-lg"
            >
              {formatNumber(totalMeals.toFixed(1))}
            </motion.p>
          </div>

          <div
            className={`rounded-xl border p-2.5 text-center transition-colors sm:p-3 ${
              isPositiveBalance
                ? 'border-emerald-200/80 bg-emerald-50/75 dark:border-emerald-500/25 dark:bg-emerald-500/[0.08]'
                : 'border-rose-200/80 bg-rose-50/75 dark:border-rose-500/25 dark:bg-rose-500/[0.08]'
            }`}
          >
            <p
              className={`text-[9px] font-semibold tracking-wider uppercase ${
                isPositiveBalance
                  ? 'text-emerald-800/80 dark:text-emerald-300/85'
                  : 'text-rose-800/80 dark:text-rose-300/85'
              }`}
            >
              {isBangla ? 'ব্যালেন্স' : 'Balance'}
            </p>
            <motion.p
              key={balance}
              initial={{ scale: 1.08 }}
              animate={{ scale: 1 }}
              className={`mt-1 text-base font-extrabold tabular-nums sm:text-lg ${
                isPositiveBalance
                  ? 'text-[#16794C] dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatCurrency(Math.round(balance))}
            </motion.p>
          </div>

          <div className="border-nex-border bg-nex-bg/50 rounded-xl border p-2.5 text-center sm:p-3 dark:bg-white/[0.03]">
            <p className="text-nex-muted text-[9px] font-semibold tracking-wider uppercase">
              {isBangla ? 'মিল রেট' : 'Meal Rate'}
            </p>
            <p className="text-nex-text mt-1 text-base font-extrabold tabular-nums sm:text-lg">
              {formatCurrency(mealRate)}
            </p>
          </div>

          <div className="rounded-xl border border-amber-200/80 bg-amber-50/75 p-2.5 text-center sm:p-3 dark:border-amber-500/25 dark:bg-amber-500/[0.08]">
            <p className="text-[9px] font-semibold tracking-wider uppercase text-amber-800/80 dark:text-amber-300/85">
              {isBangla ? 'মেসের খরচ' : 'Mess Spent'}
            </p>
            <p className="mt-1 text-base font-extrabold text-amber-700 tabular-nums sm:text-lg dark:text-amber-400">
              {formatCurrency(messTotalSpent)}
            </p>
          </div>
        </div>

        {/* Interactive My Meals Selector */}
        <div className="border-nex-border bg-nex-bg/55 rounded-2xl border p-3.5 sm:p-4 dark:bg-white/[0.02]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-nex-text text-[11px] font-bold tracking-wider uppercase">
              {isBangla ? 'আমার মিল' : 'My Meals'}
            </p>

            <div className="bg-nex-elevated border-nex-border/80 flex rounded-lg border p-0.5">
              <button
                type="button"
                onClick={() => setPreviewDay('today')}
                className={`cursor-pointer rounded-md px-2.5 py-1 text-[10px] transition-colors ${
                  previewDay === 'today'
                    ? 'bg-nex-surface text-nex-text font-semibold shadow-xs'
                    : 'text-nex-muted hover:text-nex-text font-medium'
                }`}
              >
                {isBangla ? 'আজ' : 'Today'}
              </button>
              <button
                type="button"
                onClick={() => setPreviewDay('tomorrow')}
                className={`cursor-pointer rounded-md px-2.5 py-1 text-[10px] transition-colors ${
                  previewDay === 'tomorrow'
                    ? 'bg-nex-surface text-nex-text font-semibold shadow-xs'
                    : 'text-nex-muted hover:text-nex-text font-medium'
                }`}
              >
                {isBangla ? 'আগামীকাল' : 'Tomorrow'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MealSlotCard
              icon={Sun}
              iconBgClass="bg-amber-500/12 dark:bg-amber-400/15"
              iconTextClass="text-amber-700 dark:text-amber-400"
              title={isBangla ? 'দুপুর' : 'Lunch'}
              active={currentDay.lunchActive}
              guests={currentDay.lunchGuests}
              isBangla={isBangla}
              decreaseLabel={isBangla ? 'দুপুরের মেহমান কমান' : 'Decrease lunch guests'}
              increaseLabel={isBangla ? 'দুপুরের মেহমান বাড়ান' : 'Increase lunch guests'}
              onToggle={() => toggleSlot('lunchActive')}
              onUpdateGuests={(delta) => updateGuests('lunchGuests', delta)}
            />
            <MealSlotCard
              icon={Moon}
              iconBgClass="bg-nex-secondary-light"
              iconTextClass="text-nex-secondary"
              title={isBangla ? 'রাত' : 'Dinner'}
              active={currentDay.dinnerActive}
              guests={currentDay.dinnerGuests}
              isBangla={isBangla}
              decreaseLabel={isBangla ? 'রাতের মেহমান কমান' : 'Decrease dinner guests'}
              increaseLabel={isBangla ? 'রাতের মেহমান বাড়ান' : 'Increase dinner guests'}
              onToggle={() => toggleSlot('dinnerActive')}
              onUpdateGuests={(delta) => updateGuests('dinnerGuests', delta)}
            />
          </div>
        </div>

        {/* Simulated Live Activity Feed */}
        <div className="border-nex-border bg-nex-bg/35 mt-4 rounded-2xl border p-3.5 sm:p-4 dark:bg-white/[0.02]">
          <p className="text-nex-muted mb-2.5 text-[10px] font-bold tracking-wider uppercase">
            {isBangla ? 'সাম্প্রতিক কার্যক্রম' : 'Recent Activity'}
          </p>
          <div className="flex flex-col gap-2">
            {activities.map((act) => (
              <div
                key={act.id}
                className="border-nex-border/60 bg-nex-surface flex items-center gap-2.5 rounded-xl border px-3 py-2 text-[11px] shadow-2xs"
              >
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    act.type === 'deposit' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <span className="text-nex-muted truncate">
                    <strong className="text-nex-text font-semibold">{act.actor}</strong> {act.action}
                  </span>
                  <span className="text-nex-muted shrink-0 text-[10px]">{act.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
