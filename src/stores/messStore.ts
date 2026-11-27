import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import { Mess, MessMember } from '../types/database'

export interface MessInvitePreview {
  id: string
  name: string
  location: string | null
  avatar_url: string | null
  is_active: boolean
  max_members: number
  is_full: boolean
}

interface MessState {
  currentMess: Mess | null
  messes: Mess[]
  pendingRequests: { mess_id: string; messes: Mess }[]
  members: MessMember[]
  loading: boolean

  fetchUserMesses: (userId: string) => Promise<void>
  setCurrentMess: (mess: Mess) => void
  fetchMembers: (messId: string) => Promise<void>
  createMess: (name: string, userId: string, location?: string | null) => Promise<Mess | null>
  updateMess: (messId: string, updates: Partial<Mess>) => Promise<void>
  findMessByCode: (code: string) => Promise<MessInvitePreview | null>
  joinMess: (code: string, userId: string) => Promise<{ success: boolean; error?: string }>
  cancelJoinRequest: (messId: string, userId: string) => Promise<void>
  reset: () => void
}

export const useMessStore = create<MessState>()(
  persist(
    (set, get) => ({
      currentMess: null,
      messes: [],
      pendingRequests: [],
      members: [],
      loading: false,

      fetchUserMesses: async (userId: string) => {
        set({ loading: true })
        try {
          const { data: memberships } = await supabase
            .from('mess_members')
            .select('mess_id, status, role, messes(*)')
            .eq('user_id', userId)
            .in('status', ['approved', 'pending'])

          if (memberships) {
            const approved = memberships.filter((m: any) => m.status === 'approved')
            const pending = memberships.filter((m: any) => m.status === 'pending')

            const messes = approved.map((m: any) => m.messes).filter(Boolean) as Mess[]
            const pendingRequests = pending
              .map((m: any) => ({ mess_id: m.mess_id, messes: m.messes }))
              .filter((m) => m.messes)

            set({ messes, pendingRequests })

            const current = get().currentMess
            if (current) {
              const stillMember = messes.find((m) => m.id === current.id)
              if (stillMember) {
                set({ currentMess: stillMember })
                void get().fetchMembers(stillMember.id)
              } else if (messes.length > 0) {
                void get().setCurrentMess(messes[0])
              } else {
                set({ currentMess: null, members: [] })
              }
            } else if (messes.length > 0) {
              void get().setCurrentMess(messes[0])
            }
          }
        } finally {
          set({ loading: false })
        }
      },

      setCurrentMess: (mess) => {
        set({ currentMess: mess, members: [] })
        void get().fetchMembers(mess.id)
      },

      fetchMembers: async (messId) => {
        const { data } = await supabase
          .from('mess_members')
          .select('*, profiles(*)')
          .eq('mess_id', messId)
          .order('joined_at', { ascending: true })

        if (data) {
          set({ members: data as MessMember[] })
        }
      },

      createMess: async (name, userId, location) => {
        const cleanLocation = location?.trim() || null
        const { data: mess, error } = await supabase
          .from('messes')
          .insert({ name, manager_id: userId, location: cleanLocation })
          .select()
          .single()

        if (error || !mess) return null

        await supabase.from('mess_members').insert({
          mess_id: mess.id,
          user_id: userId,
          status: 'approved',
          role: 'manager',
        })

        await get().fetchUserMesses(userId)
        set({ currentMess: mess as Mess })
        return mess as Mess
      },

      updateMess: async (messId, updates) => {
        const { data, error } = await supabase
          .from('messes')
          .update(updates)
          .eq('id', messId)
          .select()
          .single()

        if (error) throw error
        if (data) {
          set((state) => ({
            currentMess: state.currentMess?.id === messId ? (data as Mess) : state.currentMess,
            messes: state.messes.map((m) => (m.id === messId ? (data as Mess) : m)),
          }))
        }
      },

      findMessByCode: async (code) => {
        const cleanCode = code.toUpperCase().trim()
        if (!cleanCode) return null

        const { data, error } = await supabase.rpc('find_mess_by_code', { p_code: cleanCode })
        if (error || !data) return null

        const row = Array.isArray(data) ? data[0] : data
        return (row as MessInvitePreview) || null
      },

      joinMess: async (code, userId) => {
        const mess = await get().findMessByCode(code)

        if (!mess) return { success: false, error: 'Mess not found. Check the code and try again.' }
        if (mess.is_full) {
          return { success: false, error: 'This mess has reached its maximum member capacity.' }
        }

        const { data: allPending } = await supabase
          .from('mess_members')
          .select('status')
          .eq('user_id', userId)
          .eq('status', 'pending')

        if (allPending && allPending.length > 0) {
          return {
            success: false,
            error: 'You already have a pending request. Please cancel it first.',
          }
        }

        const { data: existing } = await supabase
          .from('mess_members')
          .select('status')
          .eq('mess_id', mess.id)
          .eq('user_id', userId)
          .maybeSingle()

        if (existing && existing.status === 'approved') {
          return { success: false, error: 'You are already a member.' }
        }

        const { error } = await supabase.from('mess_members').upsert({
          mess_id: mess.id,
          user_id: userId,
          status: 'pending',
          role: 'member',
          left_at: null,
        })

        if (error) return { success: false, error: 'Failed to join. Try again.' }

        await get().fetchUserMesses(userId)
        return { success: true }
      },

      cancelJoinRequest: async (messId, userId) => {
        await supabase
          .from('mess_members')
          .delete()
          .eq('mess_id', messId)
          .eq('user_id', userId)
          .eq('status', 'pending')
        await get().fetchUserMesses(userId)
      },

      reset: () => {
        set({ currentMess: null, messes: [], pendingRequests: [], members: [], loading: false })
      },
    }),
    {
      name: 'nexmess-store',
      partialize: (state) => ({ currentMess: state.currentMess }),
    }
  )
)
