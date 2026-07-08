import { cookies } from 'next/headers'
import { getDashboardDetails } from '@/actions/dashboard'
import DashboardClient from './DashboardClient'

export const metadata = {
  title: 'Dashboard',
}

export default async function Page() {
  const cookieStore = await cookies()
  const messId = cookieStore.get('currentMessId')?.value

  let initialData = null
  if (messId) {
    try {
      initialData = await getDashboardDetails(messId)
    } catch (error) {
      console.error('Failed to pre-fetch dashboard data:', error)
    }
  }

  return <DashboardClient initialData={initialData} />
}
