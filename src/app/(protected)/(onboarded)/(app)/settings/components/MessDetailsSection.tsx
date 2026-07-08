'use client'

import { useState, useEffect } from 'react'
import { Copy, CheckCircle2, Save, MapPin, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Mess } from '@/types/database'
import { useMessStore } from '@/stores/appStore'
import { updateMess } from '@/actions/mess'

interface MessDetailsSectionProps {
  currentMess: Mess | null
  isManager?: boolean
}

export default function MessDetailsSection({
  currentMess,
  isManager = false,
}: MessDetailsSectionProps) {
  const [copied, setCopied] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [location, setLocation] = useState(currentMess?.location || '')
  const [rules, setRules] = useState(currentMess?.rules_and_info || '')
  const [isSaving, setIsSaving] = useState(false)

  const setCurrentMess = useMessStore((state) => state.setCurrentMess)

  useEffect(() => {
    if (currentMess) {
      setLocation(currentMess.location || '')
      setRules(currentMess.rules_and_info || '')
    }
  }, [currentMess])

  const copyCode = () => {
    if (currentMess?.unique_code) {
      navigator.clipboard.writeText(currentMess.unique_code)
      setCopied(true)
      toast.success('Code copied!')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSave = async () => {
    if (!currentMess?.id) return
    setIsSaving(true)
    try {
      const updatedMess = await updateMess(currentMess.id, {
        location: location.trim(),
        rules_and_info: rules.trim(),
      })
      setCurrentMess(updatedMess)
      toast.success('Mess details updated!')
      setIsEditing(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to update details')
    } finally {
      setIsSaving(false)
    }
  }

  if (!currentMess) return null

  return (
    <div className="nex-card space-y-6 p-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-nex-text text-lg font-semibold">Mess Details</h3>
        {isManager && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-nex-primary text-sm font-medium transition-all hover:underline cursor-pointer"
          >
            Edit Details
          </button>
        )}
      </div>

      <div className="bg-nex-elevated flex items-center justify-between rounded-xl p-4">
        <div>
          <p className="text-nex-text text-sm font-medium">{currentMess.name}</p>
          <p className="text-nex-muted mt-0.5 font-mono text-xs">{currentMess.unique_code}</p>
        </div>
        <button onClick={copyCode} className="nex-btn-secondary text-xs cursor-pointer">
          {copied ? (
            <CheckCircle2 className="text-nex-success h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copied ? 'Copied' : 'Copy Code'}
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-nex-text mb-1.5 flex items-center gap-2 text-sm font-medium">
            <MapPin className="text-nex-muted h-4 w-4" />
            Location
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
                'No location provided yet.'
              )}
            </div>
          )}
        </div>

        <div>
          <label className="text-nex-text mb-1.5 flex items-center gap-2 text-sm font-medium">
            <Info className="text-nex-muted h-4 w-4" />
            Rules & Information
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
                'No rules or info provided yet.'
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
            }}
            className="nex-btn-secondary cursor-pointer"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="nex-btn-primary flex items-center gap-2 cursor-pointer"
          >
            {isSaving ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </button>
        </div>
      )}
    </div>
  )
}
