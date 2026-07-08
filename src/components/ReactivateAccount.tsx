'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldAlert, RefreshCw, LogOut } from 'lucide-react'
import { useClerk } from '@clerk/nextjs'
import { restoreAccount } from '@/actions/profile'
import toast from 'react-hot-toast'

export default function ReactivateAccount() {
  const [reactivating, setReactivating] = useState(false)
  const router = useRouter()
  const { signOut } = useClerk()

  const handleRestore = async () => {
    setReactivating(true)
    try {
      await restoreAccount()
      toast.success('Account successfully restored!')
      // Refresh the page to reload the layout
      window.location.reload()
    } catch (err: any) {
      toast.error('Failed to restore account: ' + err.message)
    } finally {
      setReactivating(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.replace('/')
  }

  return (
    <div className="bg-nex-bg flex min-h-screen items-center justify-center p-4">
      <div className="nex-card animate-in fade-in zoom-in-95 w-full max-w-md space-y-6 border border-red-500/10 p-8 text-center shadow-xl duration-200">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-500">
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
            onClick={handleSignOut}
            disabled={reactivating}
            className="nex-btn-secondary flex w-full items-center justify-center gap-2 border-red-500/10 py-3 text-red-500 hover:bg-red-500/10 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" /> Cancel & Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
