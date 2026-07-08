'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, ArrowRight } from 'lucide-react'
import { getPresignedUploadUrl, updateAvatarUrl } from '@/actions/storage'
import { updateProfile } from '@/actions/profile'
import toast from 'react-hot-toast'
import Image from 'next/image'

export default function OnboardingClient() {
  const router = useRouter()
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

      // Upload avatar to Cloudflare R2 if selected
      if (avatarFile) {
        // 1. Get presigned upload URL
        const { uploadUrl, publicUrl } = await getPresignedUploadUrl(
          'avatar',
          avatarFile.name,
          avatarFile.type
        )

        // 2. Upload file directly to R2
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          body: avatarFile,
          headers: {
            'Content-Type': avatarFile.type,
          },
        })

        if (!uploadRes.ok) {
          throw new Error('Avatar upload failed')
        }

        avatar_url = publicUrl
      }

      // Update user database profile
      await updateProfile({
        username: username.trim(),
        ...(avatar_url && { avatar_url }),
      })

      toast.success("Profile set up! Let's go 🚀")
      // Refresh page context and redirect
      window.location.href = '/dashboard'
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-nex-bg flex min-h-screen items-center justify-center p-6">
      <div className="nex-card w-full max-w-md p-8">
        <div className="mb-6 flex items-center gap-2">
          <div className="h-8 w-8 overflow-hidden rounded-lg relative">
            <Image src="/logo-icon.svg" alt="NexMess" fill className="object-cover" />
          </div>
          <span className="text-nex-primary text-sm font-semibold">NexMess</span>
        </div>

        <h1 className="text-nex-text mb-1 text-2xl font-bold">Set up your profile</h1>
        <p className="text-nex-muted mb-8">Choose a username and avatar to get started</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="from-nex-primary-light to-nex-hover border-nex-border hover:border-nex-primary group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-dashed bg-gradient-to-br transition-colors"
              id="avatar-upload"
            >
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Camera className="text-nex-muted group-hover:text-nex-primary h-6 w-6 transition-colors" />
                  <span className="text-nex-muted text-[10px]">Upload</span>
                </div>
              )}
              {avatarPreview && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                  <Camera className="h-5 w-5 text-white" />
                </div>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          <div>
            <label className="text-nex-text mb-1.5 block text-sm font-medium">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="nex-input"
              placeholder="e.g., kamal_ahmed"
              required
              id="onboarding-username"
            />
            <p className="text-nex-muted mt-1 text-xs">This will be visible to your mess members</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="nex-btn-primary w-full py-3 disabled:opacity-50"
            id="onboarding-submit"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                Continue to Dashboard <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
