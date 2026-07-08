import { getProfile } from '@/actions/profile'
import { getUserMesses, getMessMembers } from '@/actions/mess'
import ReactivateAccount from '@/components/ReactivateAccount'
import StoreHydrator from '@/components/StoreHydrator'
import type { Mess, MessMember } from '@/types/database'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getProfile()

  if (profile && profile.deleted_at) {
    return <ReactivateAccount />
  }

  // Fetch messes for hydrator
  let messes: Mess[] = []
  let pendingRequests: { mess_id: string; messes: Mess }[] = []
  let currentMess: Mess | null = null
  let members: MessMember[] = []

  if (profile) {
    const data = await getUserMesses()
    messes = data.messes
    pendingRequests = data.pendingRequests
    if (messes.length > 0) {
      currentMess = messes[0]
      members = await getMessMembers(currentMess.id)
    }
  }

  return (
    <StoreHydrator
      profile={profile}
      messes={messes}
      pendingRequests={pendingRequests}
      currentMess={currentMess}
      members={members}
    >
      {children}
    </StoreHydrator>
  )
}
