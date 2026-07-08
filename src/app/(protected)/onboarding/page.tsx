import { getProfile } from '@/actions/profile'
import { redirect } from 'next/navigation'
import OnboardingClient from './OnboardingClient'

export default async function Page() {
  const profile = await getProfile()

  if (profile && profile.username) {
    redirect('/dashboard')
  }

  return <OnboardingClient />
}
