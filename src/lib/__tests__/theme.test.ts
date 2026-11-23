import { describe, it, expect, beforeEach } from 'vitest'
import { useThemeStore } from '../../stores/themeStore'

describe('Theme Store', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    useThemeStore.getState().setTheme(false)
  })

  it('initializes with light mode by default', () => {
    expect(useThemeStore.getState().isDark).toBe(false)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('nexmess-theme')).toBe('light')
  })

  it('updates dark mode and applies dark class to documentElement', () => {
    useThemeStore.getState().setTheme(true)
    expect(useThemeStore.getState().isDark).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('nexmess-theme')).toBe('dark')

    useThemeStore.getState().setTheme(false)
    expect(useThemeStore.getState().isDark).toBe(false)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('nexmess-theme')).toBe('light')
  })

  it('toggles theme state back and forth', () => {
    useThemeStore.getState().toggleTheme()
    expect(useThemeStore.getState().isDark).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    useThemeStore.getState().toggleTheme()
    expect(useThemeStore.getState().isDark).toBe(false)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
