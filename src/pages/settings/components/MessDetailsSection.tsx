import { useState, useEffect } from 'react'
import { Copy, CheckCircle2, Save, MapPin, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Mess } from '../../../types/database'
import { useMessStore } from '../../../stores/messStore'

interface MessDetailsSectionProps {
  currentMess: Mess | null
  isManager?: boolean
}

export default function MessDetailsSection({ currentMess, isManager = false }: MessDetailsSectionProps) {
  const [copied, setCopied] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [location, setLocation] = useState(currentMess?.location || '')
  const [rules, setRules] = useState(currentMess?.rules_and_info || '')
  const [isSaving, setIsSaving] = useState(false)
  
  const updateMess = useMessStore((state) => state.updateMess)

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
      await updateMess(currentMess.id, { location, rules_and_info: rules })
      toast.success('Mess details updated!')
      setIsEditing(false)
    } catch (error) {
      toast.error('Failed to update details')
    } finally {
      setIsSaving(false)
    }
  }

  if (!currentMess) return null

  return (
    <div className="nex-card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-nex-text">Mess Details</h3>
        {isManager && !isEditing && (
          <button onClick={() => setIsEditing(true)} className="text-sm font-medium text-nex-primary hover:underline transition-all">
            Edit Details
          </button>
        )}
      </div>

      <div className="flex items-center justify-between p-4 bg-nex-elevated rounded-xl">
        <div>
          <p className="text-sm font-medium text-nex-text">{currentMess.name}</p>
          <p className="text-xs text-nex-muted font-mono mt-0.5">{currentMess.unique_code}</p>
        </div>
        <button onClick={copyCode} className="nex-btn-secondary text-xs">
          {copied ? <CheckCircle2 className="w-4 h-4 text-nex-success" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied' : 'Copy Code'}
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-nex-text mb-1.5">
            <MapPin className="w-4 h-4 text-nex-muted" />
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
             <div className="p-3 bg-nex-elevated rounded-xl min-h-[46px] flex items-center text-sm text-nex-muted">
               {location ? <span className="text-nex-text">{location}</span> : 'No location provided yet.'}
             </div>
          )}
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-nex-text mb-1.5">
            <Info className="w-4 h-4 text-nex-muted" />
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
            <div className="p-3 bg-nex-elevated rounded-xl min-h-[100px] whitespace-pre-wrap text-sm text-nex-muted">
               {rules ? <span className="text-nex-text">{rules}</span> : 'No rules or info provided yet.'}
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
            className="nex-btn-secondary"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="nex-btn-primary flex items-center gap-2"
          >
            {isSaving ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </button>
        </div>
      )}
    </div>
  )
}
