'use client'

import { useState } from 'react'
import { getInitials } from '@/lib/utils'
import { getPresignedUploadUrl } from '@/actions/storage'
import { Camera } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Profile } from '@/types/database'

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
  const [username, setUsername] = useState(profile?.username || '')
  const [contactNo, setContactNo] = useState(profile?.contact_no || '')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Verification & emergency contact states
  const [verificationDocType, setVerificationDocType] = useState<
    'nid' | 'birth_certificate' | 'other' | 'none'
  >((profile?.verification_doc_type as any) || 'none')
  const [verificationDocNo, setVerificationDocNo] = useState(profile?.verification_doc_no || '')
  const [verificationDocUrl, setVerificationDocUrl] = useState(profile?.verification_doc_url || '')
  const [emergencyContactNo, setEmergencyContactNo] = useState(profile?.emergency_contact_no || '')
  const [uploadingDoc, setUploadingDoc] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onUpdate(
        username.trim(),
        contactNo.trim(),
        avatarUrl || null,
        verificationDocType === 'none' ? null : verificationDocType,
        verificationDocType === 'none' ? null : verificationDocNo.trim(),
        verificationDocType === 'none' ? null : verificationDocUrl || null,
        emergencyContactNo.trim() || null
      )
    } finally {
      setSaving(false)
    }
  }

  // Handle avatar upload via Cloudflare R2 presigned URL
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

    try {
      const { uploadUrl, publicUrl } = await getPresignedUploadUrl(
        'avatar',
        file.name,
        file.type,
        profile.id
      )

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      })

      if (!uploadRes.ok) throw new Error('R2 upload failed')

      setAvatarUrl(publicUrl)
      toast.success('Avatar uploaded! Click save to apply changes.')
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  // Handle verification document upload via Cloudflare R2 presigned URL
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setUploadingDoc(true)

    try {
      const { uploadUrl, publicUrl } = await getPresignedUploadUrl(
        'avatar',
        file.name,
        file.type,
        profile.id
      )

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      })

      if (!uploadRes.ok) throw new Error('R2 upload failed')

      setVerificationDocUrl(publicUrl)
      toast.success('Document uploaded! Click save to apply changes.')
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload document')
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
      <h3 className="text-nex-text mb-4 text-lg font-semibold">Profile Settings</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          {/* Avatar with hover change effect */}
          <div className="group relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-2xl font-bold text-white">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              getInitials(profile?.username || 'U')
            )}
            <label className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="h-5 w-5 text-white" />
              <span className="mt-1 text-[10px] text-white/90">{uploading ? '...' : 'Upload'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
          <div className="w-full flex-1 space-y-3">
            <div>
              <p className="text-nex-muted mb-1 font-mono text-xs">Email: {email}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-nex-text mb-1 block text-sm font-medium">Username</label>
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
                  Contact Number
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

            {/* Additional Contact & Verification Info */}
            <div className="border-nex-border mt-4 grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2">
              <div>
                <label className="text-nex-text mb-1 block text-sm font-medium">
                  Emergency Contact Number
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
                  Verification Document Type
                </label>
                <select
                  value={verificationDocType}
                  onChange={(e) => setVerificationDocType(e.target.value as any)}
                  className="nex-input bg-nex-elevated text-sm"
                >
                  <option value="none">None / Unspecified</option>
                  <option value="nid">National ID (NID)</option>
                  <option value="birth_certificate">Birth Certificate</option>
                  <option value="other">Other Document</option>
                </select>
              </div>

              {verificationDocType !== 'none' && (
                <>
                  <div>
                    <label className="text-nex-text mb-1 block text-sm font-medium">
                      {verificationDocType === 'nid'
                        ? 'NID Number'
                        : verificationDocType === 'birth_certificate'
                          ? 'Birth Certificate Number'
                          : 'Document Number'}
                    </label>
                    <input
                      type="text"
                      value={verificationDocNo}
                      onChange={(e) => setVerificationDocNo(e.target.value)}
                      className="nex-input text-sm"
                      placeholder="Enter document number"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-nex-text mb-1 block text-sm font-medium">
                      Upload Document Copy (Photo)
                    </label>
                    <div className="flex items-center gap-3">
                      {verificationDocUrl ? (
                        <div className="bg-nex-elevated border-nex-border flex w-full items-center justify-between rounded-lg border px-3 py-1.5">
                          <a
                            href={verificationDocUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-nex-primary max-w-[150px] truncate text-xs font-medium hover:underline"
                          >
                            View Uploaded Document
                          </a>
                          <button
                            type="button"
                            onClick={handleRemoveDoc}
                            className="text-nex-danger text-xs font-semibold hover:text-red-500 cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <label className="border-nex-border hover:bg-nex-hover text-nex-muted flex w-full cursor-pointer items-center justify-center rounded-lg border border-dashed px-4 py-2 text-xs font-medium transition-colors">
                          <span>{uploadingDoc ? 'Uploading...' : 'Choose Photo (Max 2MB)'}</span>
                          <input
                            type="file"
                            accept="image/*"
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
            disabled={saving || uploading || uploadingDoc}
            className="nex-btn-primary disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
