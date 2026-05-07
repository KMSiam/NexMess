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
          const messes = memberships
            .map((m: any) => m.messes)
            .filter(Boolean) as Mess[]
          
          set({ messes })
          
          const current = get().currentMess
          if (current) {
            // Verify the persisted mess actually belongs to this user
            const stillMember = messes.find(m => m.id === current.id)
            if (stillMember) {
              set({ currentMess: stillMember })
              get().fetchMembers(stillMember.id)
            } else {
              // User switched accounts — clear stale data
              if (messes.length > 0) {
                get().setCurrentMess(messes[0])
              } else {
                set({ currentMess: null, members: [] })
              }
            }
          } else if (messes.length > 0) {
            get().setCurrentMess(messes[0])
          }
        }
        set({ loading: false })
      },

      setCurrentMess: (mess) => {
        set({ currentMess: mess, members: [] })
        get().fetchMembers(mess.id)
      },

      fetchMembers: async (messId: string) => {
        const { data } = await supabase
          .from('mess_members')
          .select('*, profiles(*)')
          .eq('mess_id', messId)
          .order('joined_at', { ascending: true })

        if (data) {
          set({ members: data as MessMember[] })
        }
      },

      createMess: async (name: string, userId: string) => {
        const { data: mess, error } = await supabase
          .from('messes')
          .insert({ name, manager_id: userId })
          .select()
          .single()

        if (error || !mess) return null

        // Add creator as approved manager
        await supabase
          .from('mess_members')
          .insert({
            mess_id: mess.id,
            user_id: userId,
            status: 'approved',
            role: 'manager',
          })

        await get().fetchUserMesses(userId)
        set({ currentMess: mess as Mess })
        return mess as Mess
      },

      joinMess: async (code: string, userId: string) => {
        const { data: mess } = await supabase
          .from('messes')
          .select('*')
          .eq('unique_code', code.toUpperCase().trim())
          .eq('is_active', true)
          .single()

        if (!mess) return { success: false, error: 'Mess not found. Check the code and try again.' }

        // Check if already a member
        const { data: existing } = await supabase
          .from('mess_members')
          .select('status')
          .eq('mess_id', mess.id)
          .eq('user_id', userId)
          .single()

        if (existing) {
          if (existing.status === 'approved') return { success: false, error: 'You are already a member.' }
          if (existing.status === 'pending') return { success: false, error: 'Your request is already pending.' }
          // If 'left', allow re-joining
        }

        const { error } = await supabase
          .from('mess_members')
          .upsert({ mess_id: mess.id, user_id: userId, status: 'pending', role: 'member' })

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
