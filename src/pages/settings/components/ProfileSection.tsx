import { useState } from 'react'
import { getInitials } from '../../../lib/utils'
import { supabase } from '../../../lib/supabase'
import { Camera } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Profile } from '../../../types/database'

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
  const [verificationDocType, setVerificationDocType] = useState<'nid' | 'birth_certificate' | 'other' | 'none'>(
    (profile?.verification_doc_type as any) || 'none'
  )
  const [verificationDocNo, setVerificationDocNo] = useState(profile?.verification_doc_no || '')
  const [verificationDocUrl, setVerificationDocUrl] = useState(profile?.verification_doc_url || '')
  const [emergencyContactNo, setEmergencyContactNo] = useState(profile?.emergency_contact_no || '')
  const [uploadingDoc, setUploadingDoc] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    await onUpdate(
      username.trim(),
      contactNo.trim(),
      avatarUrl || null,
      verificationDocType === 'none' ? null : verificationDocType,
      verificationDocType === 'none' ? null : verificationDocNo.trim(),
      verificationDocType === 'none' ? null : verificationDocUrl || null,
      emergencyContactNo.trim() || null
    )
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

  // Handle verification document upload to Supabase storage 'avatars' bucket
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
    const ext = file.name.split('.').pop()
    const path = `${profile.id}/verification-${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })

    if (uploadError) {
      toast.error('Failed to upload document')
    } else {
      const publicUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
      setVerificationDocUrl(publicUrl)
      toast.success('Document uploaded! Click save to apply changes.')
    }
    setUploadingDoc(false)
  }

  const handleRemoveDoc = () => {
    setVerificationDocUrl('')
    toast.success('Document reference cleared. Click save to apply changes.')
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

            {/* Additional Contact & Verification Info */}
            <div className="border-t border-nex-border pt-4 mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-nex-text mb-1">Emergency Contact Number</label>
                <input
                  type="tel"
                  value={emergencyContactNo}
                  onChange={e => setEmergencyContactNo(e.target.value)}
                  className="nex-input text-sm"
                  placeholder="Emergency contact (e.g. +88017...)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-nex-text mb-1">Verification Document Type</label>
                <select
                  value={verificationDocType}
                  onChange={e => setVerificationDocType(e.target.value as any)}
                  className="nex-input text-sm bg-nex-elevated"
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
                    <label className="block text-sm font-medium text-nex-text mb-1">
                      {verificationDocType === 'nid'
                        ? 'NID Number'
                        : verificationDocType === 'birth_certificate'
                        ? 'Birth Certificate Number'
                        : 'Document Number'}
                    </label>
                    <input
                      type="text"
                      value={verificationDocNo}
                      onChange={e => setVerificationDocNo(e.target.value)}
                      className="nex-input text-sm"
                      placeholder="Enter document number"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-nex-text mb-1">Upload Document Copy (Photo)</label>
                    <div className="flex items-center gap-3">
                      {verificationDocUrl ? (
                        <div className="flex items-center justify-between w-full bg-nex-elevated px-3 py-1.5 rounded-lg border border-nex-border">
                          <a
                            href={verificationDocUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-nex-primary hover:underline font-medium truncate max-w-[150px]"
                          >
                            View Uploaded Document
                          </a>
                          <button
                            type="button"
                            onClick={handleRemoveDoc}
                            className="text-xs text-nex-danger hover:text-red-500 font-semibold"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center justify-center px-4 py-2 border border-dashed border-nex-border rounded-lg cursor-pointer hover:bg-nex-hover transition-colors text-xs text-nex-muted font-medium w-full">
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
          <button type="submit" disabled={saving || uploading || uploadingDoc} className="nex-btn-primary disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
