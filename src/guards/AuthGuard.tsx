import { useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useMessStore } from '../stores/messStore'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { ShieldAlert, RefreshCw, LogOut } from 'lucide-react'
import { sanitizeAppError } from '../lib/errorHandler'

export function AuthGuard() {
  const { session, loading, initialized, profile, signOut } = useAuthStore()
  const [reactivating, setReactivating] = useState(false)

  if (!initialized || loading) {
    return (
      <div className="bg-nex-bg flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="border-nex-primary h-8 w-8 animate-spin rounded-full border-3 border-t-transparent" />
          <p className="text-nex-muted text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  // Reactivate Account UI
  if (profile && profile.deleted_at) {
    const handleRestore = async () => {
      setReactivating(true)
      const { error } = await supabase
        .from('profiles')
        .update({ deleted_at: null })
        .eq('id', profile.id)

      if (error) {
        toast.error(sanitizeAppError(error, 'Failed to restore account. Please try again.'))
      } else {
        toast.success('Account successfully restored!')
        const { fetchProfile } = useAuthStore.getState()
        await fetchProfile()
      }
      setReactivating(false)
    }

    const handleCancel = async () => {
      await signOut()
    }

    return (
      <div className="bg-nex-bg flex min-h-screen items-center justify-center p-4">
        <div className="nex-card animate-in fade-in zoom-in-95 border-nex-danger/15 w-full max-w-md space-y-6 border p-8 text-center shadow-xl duration-200">
          <div className="bg-nex-danger-light text-nex-danger mx-auto flex h-16 w-16 items-center justify-center rounded-full">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-nex-text text-xl font-bold">Welcome Back!</h2>
            <p className="text-nex-muted text-sm leading-relaxed">
              Your account is currently scheduled for permanent deletion. Would you like to restore
              your account and recover your data?
            </p>
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={handleRestore}
              disabled={reactivating}
              className="nex-btn-primary flex w-full items-center justify-center gap-2 py-3"
            >
              {reactivating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Restoring...
                </>
              ) : (
                'Yes, Restore Account'
              )}
            </button>
            <button
              onClick={handleCancel}
              disabled={reactivating}
              className="nex-btn-secondary border-nex-danger/20 text-nex-danger hover:bg-nex-danger-light flex w-full items-center justify-center gap-2 py-3"
            >
              <LogOut className="h-4 w-4" /> Cancel & Sign Out
            </button>
          </div>
        </div>
      </div>
    )
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
      <div className="bg-nex-bg flex min-h-screen items-center justify-center">
        <div className="border-nex-primary h-8 w-8 animate-spin rounded-full border-3 border-t-transparent" />
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

  const isManager = members.some((m) => m.user_id === user?.id && m.role === 'manager')

  if (loading || (!isManager && members.length === 0)) {
    return (
      <div className="bg-nex-bg flex min-h-screen items-center justify-center">
        <div className="border-nex-primary h-8 w-8 animate-spin rounded-full border-3 border-t-transparent" />
      </div>
    )
  }

  if (!isManager) return <Navigate to="/dashboard" replace />

  return <Outlet />
}
