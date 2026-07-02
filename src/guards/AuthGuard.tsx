import { useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useMessStore } from '../stores/messStore'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { ShieldAlert, RefreshCw, LogOut } from 'lucide-react'

export function AuthGuard() {
  const { session, loading, initialized, profile, signOut } = useAuthStore()
  const [reactivating, setReactivating] = useState(false)

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

  // Reactivate Account UI
  if (profile && profile.deleted_at) {
    const handleRestore = async () => {
      setReactivating(true)
      const { error } = await supabase.from('profiles')
        .update({ deleted_at: null })
        .eq('id', profile.id)

      if (error) {
        toast.error('Failed to restore account: ' + error.message)
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
      <div className="min-h-screen bg-nex-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full nex-card p-8 border border-red-500/10 space-y-6 text-center shadow-xl animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto text-red-500">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-nex-text">Welcome Back!</h2>
            <p className="text-sm text-nex-muted leading-relaxed">
              Your account is currently scheduled for permanent deletion. Would you like to restore your account and recover your data?
            </p>
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={handleRestore}
              disabled={reactivating}
              className="nex-btn-primary w-full py-3 flex items-center justify-center gap-2"
            >
              {reactivating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Restoring...
                </>
              ) : (
                'Yes, Restore Account'
              )}
            </button>
            <button
              onClick={handleCancel}
              disabled={reactivating}
              className="nex-btn-secondary w-full py-3 text-red-500 hover:bg-red-500/10 hover:text-red-600 flex items-center justify-center gap-2 border-red-500/10"
            >
              <LogOut className="w-4 h-4" /> Cancel & Sign Out
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
