import { useState } from 'react'
import { getInitials } from '../../../lib/utils'
import { supabase } from '../../../lib/supabase'
import { Camera } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Profile } from '../../../types/database'

interface ProfileSectionProps {
  profile: Profile | null
  email: string | undefined
  onUpdate: (username: string, contactNo: string, avatarUrl: string | null) => Promise<void>
}

export default function ProfileSection({ profile, email, onUpdate }: ProfileSectionProps) {
  const [username, setUsername] = useState(profile?.username || '')
  const [contactNo, setContactNo] = useState(profile?.contact_no || '')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await onUpdate(username.trim(), contactNo.trim(), avatarUrl || null)
    setSaving(false)
  }

  // Handle avatar upload to Supabase storage 'avatars' bucket
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile?.id) return

    if (!file.type.startsWith('image/')) {
      toast.error('File must be an image')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB')
      return
    }

    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${profile.id}/avatar-${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })

    if (uploadError) {
      toast.error('Failed to upload image')
    } else {
      const publicUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
      setAvatarUrl(publicUrl)
      toast.success('Avatar uploaded! Click save to apply changes.')
    }
    setUploading(false)
  }

  return (
    <div className="nex-card p-6">
      <h3 className="text-lg font-semibold text-nex-text mb-4">Profile Settings</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Avatar with hover change effect */}
          <div className="relative group w-20 h-20 rounded-full shrink-0 overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              getInitials(profile?.username || 'U')
            )}
            <label className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-5 h-5 text-white" />
              <span className="text-[10px] text-white/90 mt-1">{uploading ? '...' : 'Upload'}</span>
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploading} />
            </label>
          </div>
          <div className="flex-1 w-full space-y-3">
            <div>
              <p className="text-xs text-nex-muted mb-1 font-mono">Email: {email}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-nex-text mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="nex-input text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-nex-text mb-1">Contact Number</label>
                <input
                  type="tel"
                  value={contactNo}
                  onChange={e => setContactNo(e.target.value)}
                  className="nex-input text-sm"
                  placeholder="e.g., +8801700000000"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button type="submit" disabled={saving || uploading} className="nex-btn-primary disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
