import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { useMessStore } from '../../stores/messStore'
import { ArrowRight, Home } from 'lucide-react'
import toast from 'react-hot-toast'

export default function CreateMessPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { createMess } = useMessStore()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!name.trim() || !user) return

    setLoading(true)
    const mess = await createMess(name.trim(), user.id)
    if (mess) {
      toast.success(`"${mess.name}" created! Code: ${mess.unique_code}`)
      navigate('/dashboard')
    } else {
      toast.error('Failed to create mess')
    }
    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto py-12">
      <div className="nex-card p-8">
        <div className="w-14 h-14 rounded-card bg-nex-primary-light mx-auto flex items-center justify-center mb-6">
          <Home className="w-7 h-7 text-nex-primary" />
        </div>
        <h1 className="text-2xl font-bold text-nex-text text-center mb-1">Create a Mess</h1>
        <p className="text-nex-muted text-center mb-8">Start managing your shared living space</p>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-nex-text mb-1.5">Mess Name</label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)}
              className="nex-input" placeholder="e.g., Sunrise Mess" required id="mess-name-input"
            />
          </div>
          <button type="submit" disabled={loading} className="nex-btn-primary w-full py-3 disabled:opacity-50" id="create-mess-btn">
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <> Create & Continue <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>
      </div>
    </div>
  )
}
