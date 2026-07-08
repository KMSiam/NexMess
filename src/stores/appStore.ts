'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Mess, MessMember, Profile } from '@/types/database'

// ── Profile Store ─────────────────────────────────────────────────────────────
// Stores the current user's database profile (separate from Clerk's user object)

interface ProfileState {
  profile: Profile | null
  loading: boolean
  setProfile: (profile: Profile | null) => void
  setLoading: (loading: boolean) => void
}

export const useProfileStore = create<ProfileState>()((set) => ({
  profile: null,
  loading: true,
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
}))

// ── Mess Store ─────────────────────────────────────────────────────────────────
// Tracks which mess the user is currently in. Persisted to localStorage.

interface MessState {
  currentMess: Mess | null
  messes: Mess[]
  pendingRequests: { mess_id: string; messes: Mess }[]
  members: MessMember[]
  messLoading: boolean

  setCurrentMess: (mess: Mess | null) => void
  setMesses: (messes: Mess[]) => void
  setPendingRequests: (requests: { mess_id: string; messes: Mess }[]) => void
  setMembers: (members: MessMember[]) => void
  setMessLoading: (loading: boolean) => void
  reset: () => void
}

export const useMessStore = create<MessState>()(
  persist(
    (set) => ({
      currentMess: null,
      messes: [],
      pendingRequests: [],
      members: [],
      messLoading: false,

      setCurrentMess: (mess) => set({ currentMess: mess }),
      setMesses: (messes) => set({ messes }),
      setPendingRequests: (requests) => set({ pendingRequests: requests }),
      setMembers: (members) => set({ members }),
      setMessLoading: (loading) => set({ messLoading: loading }),

      reset: () =>
        set({
          currentMess: null,
          messes: [],
          pendingRequests: [],
          members: [],
          messLoading: false,
        }),
    }),
    {
      name: 'nexmess-store',
      partialize: (state) => ({ currentMess: state.currentMess }),
    }
  )
)
