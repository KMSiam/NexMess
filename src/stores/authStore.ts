import { create } from 'zustand'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Profile } from '../types/database'

interface AuthState {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  initialized: boolean

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

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      set({ session, user: session?.user ?? null })

      if (session?.user) {
        await get().fetchProfile()
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        // On sign out, clear everything immediately
        if (event === 'SIGNED_OUT' || !session) {
          set({ session: null, user: null, profile: null })
          return
        }

        // Update session & user for all other events
        set({ session, user: session.user })

        // Fetch profile on login/token refresh/password recovery
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          await get().fetchProfile()
        }
      })
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

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (data) {
      set({ profile: data as Profile })
    }
  },

  updateProfile: async (updates) => {
    const user = get().user
    if (!user) return

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (!error && data) {
      set({ profile: data as Profile })
    }
  },

  signOut: async () => {
    // Clear state first so UI updates immediately
    set({ session: null, user: null, profile: null })
    // Then tell Supabase to sign out (scope: 'local' avoids network issues)
    await supabase.auth.signOut({ scope: 'local' })
  },
}))
