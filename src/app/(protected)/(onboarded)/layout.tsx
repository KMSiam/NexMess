import { getProfile } from '@/actions/profile'
import { redirect } from 'next/navigation'

export default async function OnboardedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getProfile()

  if (!profile || !profile.username) {
    redirect('/onboarding')
  }

  return <>{children}</>
}
