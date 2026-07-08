'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { joinMess, cancelJoinRequest } from '@/actions/mess'
import { useMessStore } from '@/stores/appStore'
import { Users, ArrowRight, AlertCircle, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

export default function JoinMessPage() {
  const router = useRouter()
  const { pendingRequests } = useMessStore()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  const handleJoin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!code.trim()) return

    setLoading(true)
    try {
      const result = await joinMess(code.trim())
      if (result.success) {
        toast.success('Join request sent! Waiting for manager approval.')
        window.location.href = '/dashboard'
      } else {
        toast.error(result.error || 'Failed to join')
      }
    } catch (err: any) {
      toast.error('Failed to send join request')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (messId: string) => {
    try {
      await cancelJoinRequest(messId)
      toast.success('Request canceled')
      window.location.reload()
    } catch (err: any) {
      toast.error('Failed to cancel request')
      console.error(err)
    }
  }

  const hasPending = pendingRequests && pendingRequests.length > 0
  const pendingReq = hasPending ? pendingRequests[0] : null

  return (
    <div className="bg-nex-bg min-h-screen flex items-center justify-center p-6">
      <div className="nex-card w-full max-w-md p-8">
        <div className="rounded-card bg-nex-primary-light mx-auto mb-6 flex h-14 w-14 items-center justify-center">
          <Users className="text-nex-primary h-7 w-7" />
        </div>
        <h1 className="text-nex-text mb-1 text-center text-2xl font-bold">Join a Mess</h1>

        {hasPending ? (
          <div className="mt-8 space-y-5">
            <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div>
                <h3 className="mb-1 text-sm font-bold text-amber-600 dark:text-amber-400">
                  Pending Request Exists
                </h3>
                <p className="text-nex-muted text-xs leading-relaxed">
                  You already have a pending request to join{' '}
                  <strong>{pendingReq?.messes?.name || 'another mess'}</strong>. You must cancel it
                  before you can join a different mess.
                </p>
              </div>
            </div>

            <div className="nex-card border-nex-border/80 space-y-4 border p-5 text-center">
              <div className="bg-nex-elevated mx-auto flex h-12 w-12 items-center justify-center rounded-full">
                <Clock className="text-nex-muted h-6 w-6" />
              </div>
              <div>
                <h4 className="text-nex-text font-bold">
                  {pendingReq?.messes?.name || 'Unknown Mess'}
                </h4>
                <p className="mt-1 text-xs font-medium text-amber-500">
                  Waiting for manager approval...
                </p>
              </div>
              <button
                onClick={() => pendingReq && handleCancel(pendingReq.mess_id)}
                className="nex-btn-danger w-full bg-red-500/10 py-2.5 text-red-500 hover:bg-red-500 hover:text-white"
              >
                Cancel Request
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-nex-muted mb-8 text-center">
              Enter the mess code shared by your manager
            </p>
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="text-nex-text mb-1.5 block text-sm font-medium">Mess Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="nex-input text-center font-mono text-lg tracking-widest"
                  placeholder="NEX-XXXX"
                  required
                  maxLength={8}
                  id="join-code-input"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="nex-btn-primary w-full py-3 disabled:opacity-50"
                id="join-mess-btn"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    Request to Join <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
