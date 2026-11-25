import { create } from 'zustand'
import { flushSync } from 'react-dom'

interface ThemeState {
  isDark: boolean
  setTheme: (dark: boolean, e?: React.MouseEvent) => void
  toggleTheme: (e?: React.MouseEvent) => void
}

const getInitialTheme = (): boolean => {
  if (typeof window === 'undefined') return false
  try {
    const saved = localStorage.getItem('nexmess-theme')
    if (saved === 'dark') return true
    if (saved === 'light') return false
    if (typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
  } catch {
    // Fallback if localStorage or matchMedia is inaccessible
  }
  return false
}

const applyThemeToDOM = (dark: boolean) => {
  if (typeof document === 'undefined') return
  if (dark) {
    document.documentElement.classList.add('dark')
    localStorage.setItem('nexmess-theme', 'dark')
  } else {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('nexmess-theme', 'light')
  }
}

type ViewTransitionDoc = Document & {
  startViewTransition?: (cb: () => void) => {
    ready: Promise<void>
    finished: Promise<void>
  }
}

const runThemeTransition = async (
  nextDark: boolean,
  applyState: () => void,
  e?: React.MouseEvent
) => {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    applyThemeToDOM(nextDark)
    applyState()
    return
  }

  const doc = document as ViewTransitionDoc
  const prefersReducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (!e || !doc.startViewTransition || prefersReducedMotion) {
    applyThemeToDOM(nextDark)
    applyState()
    return
  }

  let x = window.innerWidth / 2
  let y = window.innerHeight / 2
  if (e.currentTarget instanceof HTMLElement) {
    const rect = e.currentTarget.getBoundingClientRect()
    x = rect.left + rect.width / 2
    y = rect.top + rect.height / 2
  } else if (e.clientX || e.clientY) {
    x = e.clientX
    y = e.clientY
  }

  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  )

  // Suppress per-element CSS transitions so the View Transition captures the crisp final state
  document.documentElement.classList.add('theme-transitioning')

  try {
    const transition = doc.startViewTransition(() => {
      flushSync(() => {
        applyThemeToDOM(nextDark)
        applyState()
      })
    })

    await transition.ready

    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${endRadius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration: 460,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        pseudoElement: '::view-transition-new(root)',
      }
    )

    await transition.finished
  } catch {
    // Fallback if view transition fails or is interrupted
    applyThemeToDOM(nextDark)
    applyState()
  } finally {
    document.documentElement.classList.remove('theme-transitioning')
  }
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const initial = getInitialTheme()
  // Ensure DOM is in sync on initialization
  applyThemeToDOM(initial)

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key === 'nexmess-theme') {
        const dark = e.newValue === 'dark'
        applyThemeToDOM(dark)
        set({ isDark: dark })
      }
    })
  }

  return {
    isDark: initial,
    setTheme: (dark: boolean, e?: React.MouseEvent) => {
      if (get().isDark === dark) {
        applyThemeToDOM(dark)
        return
      }
      void runThemeTransition(dark, () => set({ isDark: dark }), e)
    },
    toggleTheme: (e?: React.MouseEvent) => {
      const next = !get().isDark
      void runThemeTransition(next, () => set({ isDark: next }), e)
    },
  }
})
