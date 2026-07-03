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
    <div className="mx-auto max-w-md py-12">
      <div className="nex-card p-8">
        <div className="rounded-card bg-nex-primary-light mx-auto mb-6 flex h-14 w-14 items-center justify-center">
          <Home className="text-nex-primary h-7 w-7" />
        </div>
        <h1 className="text-nex-text mb-1 text-center text-2xl font-bold">Create a Mess</h1>
        <p className="text-nex-muted mb-8 text-center">Start managing your shared living space</p>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-nex-text mb-1.5 block text-sm font-medium">Mess Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="nex-input"
              placeholder="e.g., Sunrise Mess"
              required
              id="mess-name-input"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="nex-btn-primary w-full py-3 disabled:opacity-50"
            id="create-mess-btn"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                {' '}
                Create & Continue <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
