import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { Camera, ArrowRight } from 'lucide-react'
import logoIcon from '../../assets/logo-icon.svg'
import toast from 'react-hot-toast'
import { onboardingSchema, validateForm } from '../../lib/validation/schemas'
import { prepareImageForUpload, generateSafeFileName } from '../../lib/fileValidator'
import { sanitizeAppError } from '../../lib/errorHandler'

export default function OnboardingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, updateProfile } = useAuthStore()
  const [username, setUsername] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarExt, setAvatarExt] = useState<string>('webp')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const prepared = await prepareImageForUpload(file, 'avatar')
    if (!prepared.valid) {
      toast.error(prepared.error)
      if (fileRef.current) fileRef.current.value = ''
      return
    }

    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarFile(prepared.file)
    setAvatarExt(prepared.ext)
    setAvatarPreview(URL.createObjectURL(prepared.file))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // 1. Strict Schema Validation
    const validation = validateForm(onboardingSchema, { username })
    if (!validation.success) {
      toast.error(validation.error)
      return
    }

    setLoading(true)
    try {
      let avatar_url: string | null = null

      // Upload pre-compressed avatar to public storage under the user's folder
      if (avatarFile && user) {
        const safeFileName = generateSafeFileName('avatar', avatarExt)
        const path = `${user.id}/${safeFileName}`

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { contentType: avatarFile.type, upsert: true })

        if (!uploadError) {
          const {
            data: { publicUrl },
          } = supabase.storage.from('avatars').getPublicUrl(path)
          avatar_url = publicUrl
        } else {
          toast.error(sanitizeAppError(uploadError, 'Failed to upload avatar'))
        }
      }

      await updateProfile({
        username: validation.data.username,
        ...(avatar_url && { avatar_url }),
      })

      toast.success("Profile set up! Let's go 🚀")
      navigate('/dashboard')
    } catch (err: unknown) {
      toast.error(sanitizeAppError(err, 'Something went wrong while setting up profile.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-nex-bg flex min-h-screen items-center justify-center p-6">
      <div className="nex-card w-full max-w-md p-8">
        <div className="mb-6 flex items-center gap-2">
          <div className="h-8 w-8 overflow-hidden rounded-lg">
            <img src={logoIcon} alt="NexMess" className="h-full w-full" />
          </div>
          <span className="text-nex-primary text-sm font-semibold">NexMess</span>
        </div>

        <h1 className="text-nex-text mb-1 text-2xl font-bold">{t('auth.onboarding.title')}</h1>
        <p className="text-nex-muted mb-8">{t('auth.onboarding.subtitle')}</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="from-nex-primary-light to-nex-hover border-nex-border hover:border-nex-primary group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-dashed bg-gradient-to-br transition-colors"
              id="avatar-upload"
            >
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Camera className="text-nex-muted group-hover:text-nex-primary h-6 w-6 transition-colors" />
                  <span className="text-nex-muted text-[10px]">{t('auth.onboarding.upload')}</span>
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
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          <div>
            <label className="text-nex-text mb-1.5 block text-sm font-medium">{t('auth.onboarding.username')}</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="nex-input"
              placeholder={t('auth.onboarding.usernamePlaceholder')}
              required
              id="onboarding-username"
            />
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
                {t('auth.onboarding.submit')} <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
