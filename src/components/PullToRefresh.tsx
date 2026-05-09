import { useEffect, useRef, useState } from 'react'
import { ArrowDown, RefreshCw } from 'lucide-react'

type Phase = 'idle' | 'pulling' | 'ready' | 'refreshing'

const THRESHOLD = 80   // px of pull needed to trigger refresh
const MAX_PULL  = 110  // px cap on indicator height

interface Props {
  onRefresh: (() => void | Promise<void>) | null
  children: React.ReactNode
}

export default function PullToRefresh({ onRefresh, children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const phaseRef     = useRef<Phase>('idle')
  const startYRef    = useRef(0)
  const onRefreshRef = useRef(onRefresh)

  const [pullDist, setPullDist]   = useState(0)
  const [phase, setPhase]         = useState<Phase>('idle')

  // Keep the callback ref fresh without re-attaching listeners
  useEffect(() => { onRefreshRef.current = onRefresh }, [onRefresh])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const setP = (p: Phase) => { phaseRef.current = p; setPhase(p) }

    const onTouchStart = (e: TouchEvent) => {
      if (el.scrollTop > 2) return
      if (phaseRef.current === 'refreshing') return
      startYRef.current = e.touches[0].clientY
      setP('pulling')
    }

    const onTouchMove = (e: TouchEvent) => {
      const p = phaseRef.current
      if (p !== 'pulling' && p !== 'ready') return

      const delta = e.touches[0].clientY - startYRef.current
      if (delta <= 0) {
        setP('idle')
        setPullDist(0)
        return
      }

      e.preventDefault()
      const dist = Math.min(delta * 0.5, MAX_PULL)
      setPullDist(dist)
      setP(dist >= THRESHOLD ? 'ready' : 'pulling')
    }

    const onTouchEnd = async () => {
      const p = phaseRef.current
      if (p === 'ready') {
        setP('refreshing')
        setPullDist(48)
        try {
          await onRefreshRef.current?.()
        } finally {
          setP('idle')
          setPullDist(0)
        }
      } else if (p === 'pulling') {
        setP('idle')
        setPullDist(0)
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove',  onTouchMove,  { passive: false })
    el.addEventListener('touchend',   onTouchEnd,   { passive: true })

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove',  onTouchMove)
      el.removeEventListener('touchend',   onTouchEnd)
    }
  }, [])

  const indicatorH = phase === 'refreshing' ? 48 : pullDist
  const isIdle     = phase === 'idle'

  return (
    <div ref={containerRef} className="h-full overflow-y-auto">
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden text-nex-muted"
        style={{
          height: indicatorH,
          transition: isIdle ? 'height 0.3s ease' : 'none',
        }}
      >
        {phase !== 'idle' && (
          <div className="flex items-center gap-2 text-sm">
            {phase === 'refreshing' ? (
              <RefreshCw className="w-4 h-4 animate-spin text-nex-primary" />
            ) : (
              <ArrowDown
                className="w-4 h-4 transition-transform duration-200"
                style={{ transform: phase === 'ready' ? 'rotate(180deg)' : 'none' }}
              />
            )}
            <span>
              {phase === 'refreshing'
                ? 'Refreshing…'
                : phase === 'ready'
                ? 'Release to refresh'
                : 'Pull to refresh'}
            </span>
          </div>
        )}
      </div>

      {children}
    </div>
  )
}
