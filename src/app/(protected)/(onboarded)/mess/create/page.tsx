'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createMess } from '@/actions/mess'
import { ArrowRight, Home } from 'lucide-react'
import toast from 'react-hot-toast'

export default function CreateMessPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      const mess = await createMess(name.trim())
      toast.success(`"${mess.name}" created! Code: ${mess.unique_code}`)
      // Reload server-side layouts and navigate
      window.location.href = '/dashboard'
    } catch (err: any) {
      toast.error('Failed to create mess')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-nex-bg min-h-screen flex items-center justify-center p-6">
      <div className="nex-card w-full max-w-md p-8">
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
                Create & Continue <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
