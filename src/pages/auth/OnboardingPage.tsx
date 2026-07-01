import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { Camera, ArrowRight } from 'lucide-react'
import logoIcon from '../../assets/logo-icon.svg'
import toast from 'react-hot-toast'

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { user, updateProfile } = useAuthStore()
  const [username, setUsername] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image must be less than 2MB')
        return
      }
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!username.trim()) {
      toast.error('Please enter a username')
      return
    }
    if (username.trim().length < 3) {
      toast.error('Username must be at least 3 characters')
      return
    }

    setLoading(true)
    try {
      let avatar_url: string | null = null

      // Upload avatar if selected
      if (avatarFile && user) {
        const ext = avatarFile.name.split('.').pop()
        const path = `${user.id}/avatar.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: true })

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
          avatar_url = publicUrl
        }
      }

      await updateProfile({
        username: username.trim(),
        ...(avatar_url && { avatar_url }),
      })

      toast.success('Profile set up! Let\'s go 🚀')
      navigate('/dashboard')
    } catch {
      toast.error('Something went wrong. Try again.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-nex-bg flex items-center justify-center p-6">
      <div className="nex-card p-8 max-w-md w-full">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg overflow-hidden">
            <img src={logoIcon} alt="NexMess" className="w-full h-full" />
          </div>
          <span className="text-sm font-semibold text-nex-primary">NexMess</span>
        </div>

        <h1 className="text-2xl font-bold text-nex-text mb-1">Set up your profile</h1>
        <p className="text-nex-muted mb-8">Choose a username and avatar to get started</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 border-2 border-dashed border-nex-border hover:border-nex-primary flex items-center justify-center transition-colors group overflow-hidden"
              id="avatar-upload"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover rounded-full" />
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Camera className="w-6 h-6 text-nex-muted group-hover:text-nex-primary transition-colors" />
                  <span className="text-[10px] text-nex-muted">Upload</span>
                </div>
              )}
              {avatarPreview && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                  <Camera className="w-5 h-5 text-white" />
                </div>
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </div>

          <div>
            <label className="block text-sm font-medium text-nex-text mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="nex-input"
              placeholder="e.g., kamal_ahmed"
              required
              id="onboarding-username"
            />
            <p className="text-xs text-nex-muted mt-1">This will be visible to your mess members</p>
          </div>

          <button type="submit" disabled={loading} className="nex-btn-primary w-full py-3 disabled:opacity-50" id="onboarding-submit">
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>Continue to Dashboard <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
