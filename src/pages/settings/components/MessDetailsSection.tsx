import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, CheckCircle2, Save, MapPin, Info, Camera, Link2, Share2 } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Mess } from '../../../types/database'
import { useMessStore } from '../../../stores/messStore'
import { supabase } from '../../../lib/supabase'
import { getInitials } from '../../../lib/utils'
import { buildInviteUrl, buildWhatsAppInviteUrl } from '../../../lib/invite'
import { updateMessDetailsSchema, validateForm } from '../../../lib/validation/schemas'
import { prepareImageForUpload, generateSafeFileName } from '../../../lib/fileValidator'
import { sanitizeAppError } from '../../../lib/errorHandler'

interface MessDetailsSectionProps {
  currentMess: Mess | null
  isManager?: boolean
}

export default function MessDetailsSection({
  currentMess,
  isManager = false,
}: MessDetailsSectionProps) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [location, setLocation] = useState(currentMess?.location || '')
  const [rules, setRules] = useState(currentMess?.rules_and_info || '')
  const [avatarUrl, setAvatarUrl] = useState(currentMess?.avatar_url || '')
  const [uploading, setUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const updateMess = useMessStore((state) => state.updateMess)

  useEffect(() => {
    if (currentMess) {
      setLocation(currentMess.location || '')
      setRules(currentMess.rules_and_info || '')
      setAvatarUrl(currentMess.avatar_url || '')
    }
  }, [currentMess])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    const file = input.files?.[0]
    if (!file || !currentMess?.id) return

    setUploading(true)
    try {
      const prepared = await prepareImageForUpload(file, 'avatar')
      if (!prepared.valid) {
        toast.error(prepared.error)
        return
      }

      const safeFileName = generateSafeFileName('mess-avatar', prepared.ext)
      const path = `mess-${currentMess.id}/${safeFileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, prepared.file, { contentType: prepared.file.type, upsert: true })

      if (uploadError) {
        toast.error(sanitizeAppError(uploadError, 'Failed to upload avatar'))
      } else {
        const publicUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
        setAvatarUrl(publicUrl)
        toast.success('Avatar uploaded! Click save changes to apply.')
      }
    } catch (err: unknown) {
      toast.error(sanitizeAppError(err, 'Failed to upload avatar'))
    } finally {
      setUploading(false)
      input.value = ''
    }
  }

  const copyCode = () => {
    if (currentMess?.unique_code) {
      navigator.clipboard.writeText(currentMess.unique_code)
      setCopied(true)
      toast.success('Code copied!')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const copyInviteLink = () => {
    if (!currentMess?.unique_code) return
    const url = buildInviteUrl(currentMess.unique_code)
    if (!url) return
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    toast.success(t('settings.messSection.linkCopied'))
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const whatsappShareUrl = currentMess?.unique_code
    ? buildWhatsAppInviteUrl(currentMess.name, currentMess.unique_code)
    : ''

  const handleSave = async () => {
    if (!currentMess?.id) return

    // 1. Strict Schema Validation
    const validation = validateForm(updateMessDetailsSchema, {
      name: currentMess.name,
      location: location || null,
      notes: rules || null,
    })

    if (!validation.success) {
      toast.error(validation.error)
      return
    }

    setIsSaving(true)
    try {
      await updateMess(currentMess.id, { 
        location: validation.data.location || '', 
        rules_and_info: validation.data.notes || '',
        avatar_url: avatarUrl || null
      })
      toast.success('Mess details updated!')
      setIsEditing(false)
    } catch (err: unknown) {
      toast.error(sanitizeAppError(err, 'Failed to update details'))
    } finally {
      setIsSaving(false)
    }
  }

  if (!currentMess) return null

  return (
    <div className="nex-card space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-nex-text text-lg font-semibold">{t('settings.messSection.title')}</h3>
        {isManager && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-nex-primary text-sm font-medium transition-all hover:underline"
          >
            {t('common.edit')}
          </button>
        )}
      </div>

      <div className="bg-nex-elevated flex flex-col gap-4 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="group relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-lg font-bold text-white shadow-inner">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Mess Avatar" className="h-full w-full object-cover" />
            ) : (
              getInitials(currentMess.name)
            )}
            {isEditing && isManager && (
              <label className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="h-4 w-4 text-white" />
                <span className="mt-0.5 text-[8px] text-white/90">{uploading ? '...' : t('common.upload')}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-nex-text text-sm font-semibold truncate">{currentMess.name}</p>
            <p className="text-nex-muted mt-0.5 font-mono text-xs">{currentMess.unique_code}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          <button type="button" onClick={copyCode} className="nex-btn-secondary text-xs">
            {copied ? (
              <CheckCircle2 className="text-nex-success h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? t('common.copied') : t('settings.messSection.copy')}
          </button>
          <button type="button" onClick={copyInviteLink} className="nex-btn-secondary text-xs">
            {copiedLink ? (
              <CheckCircle2 className="text-nex-success h-4 w-4" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
            {copiedLink ? t('common.copied') : t('settings.messSection.copyLink')}
          </button>
          {whatsappShareUrl && (
            <a
              href={whatsappShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="nex-btn-primary text-xs"
            >
              <Share2 className="h-4 w-4" />
              {t('settings.messSection.shareWhatsApp')}
            </a>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-nex-text mb-1.5 flex items-center gap-2 text-sm font-medium">
            <MapPin className="text-nex-muted h-4 w-4" />
            {t('settings.messSection.address')}
          </label>
          {isEditing ? (
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. 123 Main St, Block B"
              className="nex-input w-full"
            />
          ) : (
            <div className="bg-nex-elevated text-nex-muted flex min-h-[46px] items-center rounded-xl p-3 text-sm">
              {location ? (
                <span className="text-nex-text">{location}</span>
              ) : (
                '—'
              )}
            </div>
          )}
        </div>

        <div>
          <label className="text-nex-text mb-1.5 flex items-center gap-2 text-sm font-medium">
            <Info className="text-nex-muted h-4 w-4" />
            {t('settings.messSection.rules')}
          </label>
          {isEditing ? (
            <textarea
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              placeholder="e.g. Quiet hours, payment deadlines, etc."
              rows={4}
              className="nex-input w-full resize-none py-3"
            />
          ) : (
            <div className="bg-nex-elevated text-nex-muted min-h-[100px] rounded-xl p-3 text-sm whitespace-pre-wrap">
              {rules ? (
                <span className="text-nex-text">{rules}</span>
              ) : (
                '—'
              )}
            </div>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={() => {
              setIsEditing(false)
              setLocation(currentMess.location || '')
              setRules(currentMess.rules_and_info || '')
              setAvatarUrl(currentMess.avatar_url || '')
            }}
            className="nex-btn-secondary"
            disabled={isSaving}
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="nex-btn-primary flex items-center gap-2"
          >
            {isSaving ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {t('settings.messSection.save')}
          </button>
        </div>
      )}
    </div>
  )
}
