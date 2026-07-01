import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { useMessStore } from '../../stores/messStore'
import { Users, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

export default function JoinMessPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { joinMess } = useMessStore()
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

  return (
    <div className="max-w-md mx-auto py-12">
      <div className="nex-card p-8">
        <div className="w-14 h-14 rounded-card bg-nex-primary-light mx-auto flex items-center justify-center mb-6">
          <Users className="w-7 h-7 text-nex-primary" />
        </div>
        <h1 className="text-2xl font-bold text-nex-text text-center mb-1">Join a Mess</h1>
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
      </div>
    </div>
  )
}
