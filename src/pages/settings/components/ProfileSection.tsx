import { useState, useEffect, useTransition } from 'react'
import { useTranslation } from 'react-i18next'
import { getInitials } from '../../../lib/utils'
import { supabase } from '../../../lib/supabase'
import { Camera } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Profile } from '../../../types/database'
import { profileUpdateSchema, validateForm } from '../../../lib/validation/schemas'
import { validateUploadedFile, generateSafeFileName } from '../../../lib/fileValidator'
import { sanitizeAppError } from '../../../lib/errorHandler'

interface ProfileSectionProps {
  profile: Profile | null
  email: string | undefined
  onUpdate: (
    username: string,
    contactNo: string,
    avatarUrl: string | null,
    verificationDocType?: 'nid' | 'birth_certificate' | 'other' | null,
    verificationDocNo?: string | null,
    verificationDocUrl?: string | null,
    emergencyContactNo?: string | null
  ) => Promise<void>
}

export default function ProfileSection({ profile, email, onUpdate }: ProfileSectionProps) {
  const { t } = useTranslation()
  const [username, setUsername] = useState(profile?.username || '')
  const [contactNo, setContactNo] = useState(profile?.contact_no || '')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '')
  const [isPending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)

  const [verificationDocType, setVerificationDocType] = useState<
    'nid' | 'birth_certificate' | 'other' | 'none'
  >((profile?.verification_doc_type as any) || 'none')
  const [verificationDocNo, setVerificationDocNo] = useState(profile?.verification_doc_no || '')
  const [verificationDocUrl, setVerificationDocUrl] = useState(profile?.verification_doc_url || '')
  const [emergencyContactNo, setEmergencyContactNo] = useState(profile?.emergency_contact_no || '')
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [docPreviewUrl, setDocPreviewUrl] = useState('')

  useEffect(() => {
    if (!verificationDocUrl) {
      setDocPreviewUrl('')
      return
    }

    if (
      verificationDocUrl.startsWith('http://') ||
      verificationDocUrl.startsWith('https://')
    ) {
      setDocPreviewUrl(verificationDocUrl)
      return
    }

    supabase.storage
      .from('verifications')
      .createSignedUrl(verificationDocUrl, 3600)
      .then(({ data }) => {
        if (data?.signedUrl) {
          setDocPreviewUrl(data.signedUrl)
        }
      })
  }, [verificationDocUrl])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // 1. Strict Schema Validation
    const validation = validateForm(profileUpdateSchema, {
      username,
      contactNo: contactNo || null,
      emergencyContactNo: emergencyContactNo || null,
      verificationDocType: verificationDocType === 'none' ? null : verificationDocType,
      verificationDocNo: verificationDocType === 'none' ? null : verificationDocNo || null,
    })

    if (!validation.success) {
      toast.error(validation.error)
      return
    }

    startTransition(async () => {
      try {
        await onUpdate(
          validation.data.username,
          validation.data.contactNo || '',
          avatarUrl || null,
          (validation.data.verificationDocType as any) || null,
          validation.data.verificationDocNo || null,
          verificationDocType === 'none' ? null : verificationDocUrl || null,
          validation.data.emergencyContactNo || null
        )
      } catch (err: unknown) {
        toast.error(sanitizeAppError(err, 'Failed to update profile'))
      }
    })
  }

  // Upload avatar image to Supabase storage with binary magic bytes validation
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile?.id) return

    const validation = await validateUploadedFile(file, {
      category: 'image',
      maxSizeInBytes: 2 * 1024 * 1024,
    })

    if (!validation.valid) {
      toast.error(validation.error || 'Invalid image')
      return
    }

    setUploading(true)
    const safeFileName = generateSafeFileName('avatar', validation.sanitizedExt || 'jpg')
    const path = `${profile.id}/${safeFileName}`

    try {
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })

      if (uploadError) {
        toast.error(sanitizeAppError(uploadError, 'Failed to upload image'))
      } else {
        const publicUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
        setAvatarUrl(publicUrl)
        toast.success('Avatar uploaded! Click save to apply changes.')
      }
    } catch (err: unknown) {
      toast.error(sanitizeAppError(err, 'Failed to upload image'))
    } finally {
      setUploading(false)
    }
  }

  // Upload verification document with magic number verification
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile?.id) return

    const validation = await validateUploadedFile(file, {
      category: 'document',
      maxSizeInBytes: 2 * 1024 * 1024,
    })

    if (!validation.valid) {
      toast.error(validation.error || 'Invalid document file')
      return
    }

    setUploadingDoc(true)
    const safeFileName = generateSafeFileName('verification', validation.sanitizedExt || 'jpg')
    const path = `${profile.id}/${safeFileName}`

    try {
      const { error: uploadError } = await supabase.storage
        .from('verifications')
        .upload(path, file, { upsert: true })

      if (uploadError) {
        toast.error(sanitizeAppError(uploadError, 'Failed to upload document'))
      } else {
        setVerificationDocUrl(path)
        toast.success('Document uploaded! Click save to apply changes.')
      }
    } catch (err: unknown) {
      toast.error(sanitizeAppError(err, 'Failed to upload document'))
    } finally {
      setUploadingDoc(false)
    }
  }

  const handleRemoveDoc = () => {
    setVerificationDocUrl('')
    toast.success('Document reference cleared. Click save to apply changes.')
  }

  return (
    <div className="nex-card p-6">
      <h3 className="text-nex-text mb-4 text-lg font-semibold">{t('settings.profileSection.title')}</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="group relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-2xl font-bold text-white">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              getInitials(profile?.username || 'U')
            )}
            <label className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="h-5 w-5 text-white" />
              <span className="mt-1 text-[10px] text-white/90">{uploading ? '...' : t('common.upload')}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
          <div className="w-full flex-1 space-y-3">
            <div>
              <p className="text-nex-muted mb-1 font-mono text-xs">{t('settings.profileSection.email')}: {email}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-nex-text mb-1 block text-sm font-medium">{t('settings.profileSection.username')}</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="nex-input text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-nex-text mb-1 block text-sm font-medium">
                  {t('settings.profileSection.phone')}
                </label>
                <input
                  type="tel"
                  value={contactNo}
                  onChange={(e) => setContactNo(e.target.value)}
                  className="nex-input text-sm"
                  placeholder="e.g., +8801700000000"
                />
              </div>
            </div>

            <div className="border-nex-border mt-4 grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2">
              <div>
                <label className="text-nex-text mb-1 block text-sm font-medium">
                  {t('settings.profileSection.emergencyNo')}
                </label>
                <input
                  type="tel"
                  value={emergencyContactNo}
                  onChange={(e) => setEmergencyContactNo(e.target.value)}
                  className="nex-input text-sm"
                  placeholder="Emergency contact (e.g. +88017...)"
                />
              </div>

              <div>
                <label className="text-nex-text mb-1 block text-sm font-medium">
                  {t('settings.profileSection.docType')}
                </label>
                <select
                  value={verificationDocType}
                  onChange={(e) => setVerificationDocType(e.target.value as any)}
                  className="nex-input bg-nex-elevated text-sm"
                >
                  <option value="none">{t('settings.profileSection.noneDoc')}</option>
                  <option value="nid">{t('settings.profileSection.nid')}</option>
                  <option value="birth_certificate">{t('settings.profileSection.birthCert')}</option>
                  <option value="other">{t('settings.profileSection.otherDoc')}</option>
                </select>
              </div>

              {verificationDocType !== 'none' && (
                <>
                  <div>
                    <label className="text-nex-text mb-1 block text-sm font-medium">
                      {verificationDocType === 'nid'
                        ? t('settings.profileSection.nid')
                        : verificationDocType === 'birth_certificate'
                          ? t('settings.profileSection.birthCert')
                          : t('settings.profileSection.docNo')}
                    </label>
                    <input
                      type="text"
                      value={verificationDocNo}
                      onChange={(e) => setVerificationDocNo(e.target.value)}
                      className="nex-input text-sm"
                      placeholder={t('settings.profileSection.docNoPlaceholder')}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-nex-text mb-1 block text-sm font-medium">
                      {t('settings.profileSection.uploadDoc')}
                    </label>
                    <div className="flex items-center gap-3">
                      {verificationDocUrl ? (
                        <div className="bg-nex-elevated border-nex-border flex w-full items-center justify-between rounded-lg border px-3 py-1.5">
                          <a
                            href={docPreviewUrl || '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="text-nex-primary max-w-[150px] truncate text-xs font-medium hover:underline"
                          >
                            {t('settings.profileSection.viewDoc')}
                          </a>
                          <button
                            type="button"
                            onClick={handleRemoveDoc}
                            className="text-nex-danger text-xs font-semibold hover:text-red-500"
                          >
                            {t('common.delete')}
                          </button>
                        </div>
                      ) : (
                        <label className="border-nex-border hover:bg-nex-hover text-nex-muted flex w-full cursor-pointer items-center justify-center rounded-lg border border-dashed px-4 py-2 text-xs font-medium transition-colors">
                          <span>{uploadingDoc ? '...' : t('settings.profileSection.uploadDoc')}</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,application/pdf"
                            onChange={handleDocUpload}
                            className="hidden"
                            disabled={uploadingDoc}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isPending || uploading || uploadingDoc}
            className="nex-btn-primary disabled:opacity-50"
          >
            {isPending ? t('common.saving') : t('settings.profileSection.updateProfile')}
          </button>
        </div>
      </form>
    </div>
  )
}
