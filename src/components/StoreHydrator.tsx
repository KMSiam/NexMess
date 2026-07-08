'use client'

import { useEffect, useRef } from 'react'
import { useProfileStore, useMessStore } from '@/stores/appStore'
import type { Profile, Mess, MessMember } from '@/types/database'

interface StoreHydratorProps {
  profile: Profile | null
  messes: Mess[]
  pendingRequests: { mess_id: string; messes: Mess }[]
  currentMess: Mess | null
  members: MessMember[]
  children: React.ReactNode
}

export default function StoreHydrator({
  profile,
  messes,
  pendingRequests,
  currentMess,
  members,
  children,
}: StoreHydratorProps) {
  const initialized = useRef(false)

  if (!initialized.current) {
    useProfileStore.getState().setProfile(profile)
    useProfileStore.getState().setLoading(false)

    useMessStore.getState().setMesses(messes)
    useMessStore.getState().setPendingRequests(pendingRequests)
    
    // Only set currentMess if none is currently selected in store, or if it is in the list
    const storeState = useMessStore.getState()
    if (!storeState.currentMess && currentMess) {
      useMessStore.getState().setCurrentMess(currentMess)
      useMessStore.getState().setMembers(members)
    } else if (storeState.currentMess) {
      // Keep selected mess if it's still valid
      const stillValid = messes.find((m) => m.id === storeState.currentMess?.id)
      if (!stillValid && messes.length > 0) {
        useMessStore.getState().setCurrentMess(messes[0])
      }
    }
    initialized.current = true
  }

  // Also sync on subsequent updates if profile or messes change
  useEffect(() => {
    useProfileStore.getState().setProfile(profile)
  }, [profile])

  useEffect(() => {
    useMessStore.getState().setMesses(messes)
    useMessStore.getState().setPendingRequests(pendingRequests)
  }, [messes, pendingRequests])

  return <>{children}</>
}
