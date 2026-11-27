import { useCallback, useEffect, useRef, useState } from 'react'
import { LayoutGroup, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react'
import { formatNumber } from '../lib/utils'

export interface SlidingTabItem<T extends string = string> {
  key: T
  label: string
  icon?: LucideIcon
  badge?: number
  danger?: boolean
}

interface SlidingTabsProps<T extends string> {
  tabs: SlidingTabItem<T>[]
  activeTab: T
  onChange: (key: T) => void
  layoutId: string
  ariaLabel?: string
  fullWidth?: boolean
  size?: 'sm' | 'md'
  showScrollArrows?: boolean
  className?: string
}

/**
 * Shared segmented tab slider with an elevated surface pill that smoothly glides
 * between options using Framer Motion layout transitions.
 */
export default function SlidingTabs<T extends string>({
  tabs,
  activeTab,
  onChange,
  layoutId,
  ariaLabel,
  fullWidth = false,
  size = 'md',
  showScrollArrows = false,
  className = '',
}: SlidingTabsProps<T>) {
  const sliderRef = useRef<HTMLDivElement>(null)
  const [scrollState, setScrollState] = useState({ left: false, right: false })

  const updateScrollState = useCallback(() => {
    const el = sliderRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    setScrollState({
      left: scrollLeft > 4,
      right: scrollLeft + clientWidth < scrollWidth - 4,
    })
  }, [])

  useEffect(() => {
    if (!showScrollArrows) return
    const el = sliderRef.current
    if (!el) return
    updateScrollState()
    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateScrollState) : null
    observer?.observe(el)
    window.addEventListener('resize', updateScrollState)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', updateScrollState)
    }
  }, [showScrollArrows, updateScrollState, tabs])

  const scrollTabs = (direction: 'left' | 'right') => {
    sliderRef.current?.scrollBy({
      left: direction === 'left' ? -180 : 180,
      behavior: 'smooth',
    })
  }

  const buttonPadding =
    size === 'sm' ? 'px-3 py-1 text-xs' : 'px-3 py-2 text-xs sm:px-3.5 sm:text-sm'

  return (
    <div
      className={`bg-nex-elevated rounded-btn border-nex-border/70 relative border p-1 ${
        fullWidth ? 'w-full max-w-full' : 'inline-flex max-w-full'
      } ${className}`}
    >
      {showScrollArrows && scrollState.left && (
        <div className="from-nex-elevated via-nex-elevated/90 rounded-l-btn pointer-events-none absolute inset-y-0 left-0 z-20 flex items-center bg-gradient-to-r to-transparent pr-4 pl-1.5">
          <button
            type="button"
            onClick={() => scrollTabs('left')}
            aria-label="Scroll tabs left"
            className="bg-nex-surface border-nex-border/80 text-nex-muted hover:text-nex-text pointer-events-auto flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border shadow-sm transition-transform active:scale-95"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      )}

      <LayoutGroup id={layoutId}>
        <motion.div
          ref={sliderRef}
          layoutScroll
          role="tablist"
          aria-label={ariaLabel}
          onScroll={showScrollArrows ? updateScrollState : undefined}
          className={`scrollbar-none flex flex-nowrap items-center gap-1 overflow-x-auto scroll-smooth ${
            fullWidth ? 'w-full sm:justify-between' : ''
          }`}
        >
          {tabs.map(({ key, label, icon: Icon, badge, danger }) => {
            const isActive = activeTab === key
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={(e) => {
                  onChange(key)
                  e.currentTarget.scrollIntoView({
                    behavior: 'smooth',
                    inline: 'nearest',
                    block: 'nearest',
                  })
                }}
                className={`relative flex shrink-0 cursor-pointer items-center justify-center rounded-md font-medium whitespace-nowrap transition-colors duration-200 focus:outline-none ${buttonPadding} ${
                  fullWidth ? 'sm:flex-1' : ''
                } ${
                  danger
                    ? isActive
                      ? 'text-nex-danger font-semibold'
                      : 'text-nex-muted hover:text-nex-danger'
                    : isActive
                      ? 'text-nex-text font-semibold'
                      : 'text-nex-muted hover:text-nex-text'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId={`${layoutId}-pill`}
                    transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.8 }}
                    className="bg-nex-surface absolute inset-0 z-0 rounded-md shadow-sm dark:bg-[#2c2c31] dark:ring-1 dark:ring-white/10"
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  {Icon && <Icon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />}
                  <span>{label}</span>
                  {badge !== undefined && (
                    <span
                      className={`bg-nex-danger inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${
                        isActive ? '' : 'animate-pulse'
                      }`}
                    >
                      {formatNumber(badge)}
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </motion.div>
      </LayoutGroup>

      {showScrollArrows && scrollState.right && (
        <div className="from-nex-elevated via-nex-elevated/90 rounded-r-btn pointer-events-none absolute inset-y-0 right-0 z-20 flex items-center bg-gradient-to-l to-transparent pr-1.5 pl-4">
          <button
            type="button"
            onClick={() => scrollTabs('right')}
            aria-label="Scroll tabs right"
            className="bg-nex-surface border-nex-border/80 text-nex-muted hover:text-nex-text pointer-events-auto flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border shadow-sm transition-transform active:scale-95"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
