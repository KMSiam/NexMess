import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import { Mess, MessMember } from '../types/database'

interface MessState {
  currentMess: Mess | null
  messes: Mess[]
  members: MessMember[]
  loading: boolean

  fetchUserMesses: (userId: string) => Promise<void>
  setCurrentMess: (mess: Mess) => void
  fetchMembers: (messId: string) => Promise<void>
  createMess: (name: string, userId: string) => Promise<Mess | null>
  joinMess: (code: string, userId: string) => Promise<{ success: boolean; error?: string }>
  reset: () => void
}

export const useMessStore = create<MessState>()(
  persist(
    (set, get) => ({
      currentMess: null,
      messes: [],
      members: [],
      loading: false,

      fetchUserMesses: async (userId: string) => {
        set({ loading: true })
        const { data: memberships } = await supabase
          .from('mess_members')
          .select('mess_id, status, role, messes(*)')
          .eq('user_id', userId)
          .eq('status', 'approved')

        if (memberships) {
          const messes = (memberships as unknown[]).map((m) => (m as { messes: Mess }).messes).filter(Boolean) as Mess[]

          set({ messes })

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
        set({ loading: false })
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

      createMess: async (name, userId) => {
        const { data: mess, error } = await supabase
          .from('messes')
          .insert({ name, manager_id: userId })
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

      joinMess: async (code, userId) => {
        const { data: mess } = await supabase
          .from('messes')
          .select('*')
          .eq('unique_code', code.toUpperCase().trim())
          .eq('is_active', true)
          .single()

        if (!mess) return { success: false, error: 'Mess not found. Check the code and try again.' }

        const { data: existing } = await supabase
          .from('mess_members')
          .select('status')
          .eq('mess_id', mess.id)
          .eq('user_id', userId)
          .single()

        if (existing) {
          if (existing.status === 'approved') return { success: false, error: 'You are already a member.' }
          if (existing.status === 'pending') return { success: false, error: 'Your request is already pending.' }
        }

        const { error } = await supabase.from('mess_members').upsert({
          mess_id: mess.id,
          user_id: userId,
          status: 'pending',
          role: 'member',
        })

        if (error) return { success: false, error: 'Failed to join. Try again.' }
        return { success: true }
      },

      reset: () => {
        set({ currentMess: null, messes: [], members: [], loading: false })
      },
    }),
    {
      name: 'nexmess-store',
      partialize: (state) => ({ currentMess: state.currentMess }),
    }
  )
)
