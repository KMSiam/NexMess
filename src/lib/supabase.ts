import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

const REMEMBER_ME_KEY = 'nexmess-remember-me'

export function getRememberMePreference(): boolean {
  if (typeof window === 'undefined') return true
  try {
    return window.localStorage.getItem(REMEMBER_ME_KEY) !== 'false'
  } catch {
    return true
  }
}

export function setRememberMePreference(remember: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(REMEMBER_ME_KEY, remember ? 'true' : 'false')
  } catch {
    // Ignore storage access errors
  }
}

const authStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null
    try {
      const localVal = window.localStorage.getItem(key)
      if (localVal !== null) return localVal
      return window.sessionStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return
    try {
      if (getRememberMePreference()) {
        window.localStorage.setItem(key, value)
        window.sessionStorage.removeItem(key)
      } else {
        window.sessionStorage.setItem(key, value)
        window.localStorage.removeItem(key)
      }
    } catch {
      // Ignore storage access errors
    }
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.removeItem(key)
      window.sessionStorage.removeItem(key)
    } catch {
      // Ignore storage access errors
    }
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
