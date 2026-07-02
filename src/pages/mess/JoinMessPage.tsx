import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { useMessStore } from '../../stores/messStore'
import { Users, ArrowRight, AlertCircle, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

export default function JoinMessPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { joinMess, pendingRequests, cancelJoinRequest } = useMessStore()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  const handleJoin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!code.trim() || !user) return

    setLoading(true)
    const result = await joinMess(code.trim(), user.id)
    if (result.success) {
      toast.success('Join request sent! Waiting for manager approval.')
      navigate('/dashboard')
    } else {
      toast.error(result.error || 'Failed to join')
    }
    setLoading(false)
  }

  const hasPending = pendingRequests && pendingRequests.length > 0
  const pendingReq = hasPending ? pendingRequests[0] : null

  return (
    <div className="max-w-md mx-auto py-12">
      <div className="nex-card p-8">
        <div className="w-14 h-14 rounded-card bg-nex-primary-light mx-auto flex items-center justify-center mb-6">
          <Users className="w-7 h-7 text-nex-primary" />
        </div>
        <h1 className="text-2xl font-bold text-nex-text text-center mb-1">Join a Mess</h1>
        
        {hasPending ? (
          <div className="mt-8 space-y-5">
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400 mb-1">Pending Request Exists</h3>
                <p className="text-xs text-nex-muted leading-relaxed">
                  You already have a pending request to join <strong>{pendingReq?.messes?.name || 'another mess'}</strong>. You must cancel it before you can join a different mess.
                </p>
              </div>
            </div>

            <div className="nex-card p-5 border border-nex-border/80 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-nex-elevated mx-auto flex items-center justify-center">
                <Clock className="w-6 h-6 text-nex-muted" />
              </div>
              <div>
                <h4 className="font-bold text-nex-text">{pendingReq?.messes?.name || 'Unknown Mess'}</h4>
                <p className="text-xs text-amber-500 font-medium mt-1">Waiting for manager approval...</p>
              </div>
              <button
                onClick={() => {
                  if (user?.id && pendingReq) {
                    cancelJoinRequest(pendingReq.mess_id, user.id)
                    toast.success('Request canceled')
                  }
                }}
                className="nex-btn-danger w-full py-2.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white"
              >
                Cancel Request
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-nex-muted text-center mb-8">Enter the mess code shared by your manager</p>
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-nex-text mb-1.5">Mess Code</label>
                <input
                  type="text" value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  className="nex-input text-center text-lg tracking-widest font-mono"
                  placeholder="NEX-XXXX" required maxLength={8} id="join-code-input"
                />
              </div>
              <button type="submit" disabled={loading} className="nex-btn-primary w-full py-3 disabled:opacity-50" id="join-mess-btn">
                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <>Request to Join <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
