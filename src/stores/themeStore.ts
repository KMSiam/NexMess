import { create } from 'zustand'

interface ThemeState {
  isDark: boolean
  setTheme: (dark: boolean) => void
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
    setTheme: (dark: boolean) => {
      applyThemeToDOM(dark)
      set({ isDark: dark })
    },
    toggleTheme: (e?: React.MouseEvent) => {
      const next = !get().isDark
      const doc = document as any

      if (e && doc.startViewTransition) {
        const x = e.clientX
        const y = e.clientY
        document.documentElement.style.setProperty('--x', `${x}px`)
        document.documentElement.style.setProperty('--y', `${y}px`)
        doc.startViewTransition(() => {
          applyThemeToDOM(next)
          set({ isDark: next })
        })
      } else {
        applyThemeToDOM(next)
        set({ isDark: next })
      }
    },
  }
})
