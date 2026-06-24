import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useMessStore } from '../stores/messStore'

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

  if (!session) return <Navigate to="/login" replace />

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

/**
 * Role guard — only renders the nested routes for managers of the current
 * mess. Mirrors AuthGuard's <Outlet/>-or-<Navigate/> pattern.
 *
 * `members` is re-fetched whenever the current mess changes (see messStore),
 * so while it's empty we wait (spinner) instead of false-redirecting. This
 * keeps a manager from being bounced to /dashboard on first load.
 */
export function ManagerGuard() {
  const { user } = useAuthStore()
  const { members, loading } = useMessStore()

  const isManager = members.some(
    (m) => m.user_id === user?.id && m.role === 'manager',
  )

  if (loading || (!isManager && members.length === 0)) {
    return (
      <div className="min-h-screen bg-nex-bg flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-nex-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isManager) return <Navigate to="/dashboard" replace />

  return <Outlet />
}
