import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export function AuthGuard() {
  const { session, loading, initialized } = useAuthStore()

  if (!initialized || loading) {
    return (
      <div className="min-h-screen bg-nex-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-nex-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-nex-muted">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export function OnboardingGuard() {
  const { profile, loading } = useAuthStore()

  if (loading) return null

  // If user has no username, redirect to onboarding
  if (profile && !profile.username) {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}

export function GuestGuard() {
  const { session, loading, initialized } = useAuthStore()

  if (!initialized || loading) {
    return (
      <div className="min-h-screen bg-nex-bg flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-nex-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (session) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
