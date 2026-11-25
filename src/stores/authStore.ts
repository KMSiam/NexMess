import { create } from 'zustand'
import { Session, User, type AuthChangeEvent } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Profile } from '../types/database'
import { useMessStore } from './messStore'

interface AuthState {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  initialized: boolean
  unsubscribe: (() => void) | null

  initialize: () => Promise<void>
  setSession: (session: Session | null) => void
  fetchProfile: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,
  initialized: false,
  unsubscribe: null,

  initialize: async () => {
    // Prevent double-initialization in StrictMode
    if (get().initialized || get().unsubscribe) return

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      set({ session, user: session?.user ?? null })

      if (session?.user) {
        await get().fetchProfile()
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
        // PASSWORD_RECOVERY is handled exclusively by UpdatePasswordPage
        // — do NOT set session here or the user will be treated as fully
        // logged in and guards will redirect them away from /update-password
        if (event === 'PASSWORD_RECOVERY') return

        if (event === 'SIGNED_OUT') {
          set({ session: null, user: null, profile: null })
          return
        }
        if (!session) return
        set({ session, user: session.user })
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          void get().fetchProfile()
        }
      })

      set({ unsubscribe: subscription.unsubscribe })
    } finally {
      set({ loading: false, initialized: true })
    }
  },

  setSession: (session) => {
    set({ session, user: session?.user ?? null })
  },

  fetchProfile: async () => {
    const user = get().user
    if (!user) return

    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()

    if (data) {
      set({ profile: data as Profile })
    }
  },

  updateProfile: async (updates) => {
    const user = get().user
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw error
    if (data) {
      set({ profile: data as Profile })
    }
  },

  signOut: async () => {
    const unsub = get().unsubscribe
    if (unsub) {
      unsub()
      set({ unsubscribe: null })
    }

    set({ session: null, user: null, profile: null })
    // Clear mess data so the next account on this device doesn't see stale state
    useMessStore.getState().reset()
    try {
      useMessStore.persist.clearStorage()
    } catch (e) {
      console.warn('Could not clear mess store persistent storage:', e)
    }

    // Sign out locally to avoid offline network failures
    await supabase.auth.signOut({ scope: 'local' })
  },
}))
