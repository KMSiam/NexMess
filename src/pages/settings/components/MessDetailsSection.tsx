import { useState } from 'react'
import { Copy, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Mess } from '../../../types/database'

interface MessDetailsSectionProps {
  currentMess: Mess | null
}

export default function MessDetailsSection({ currentMess }: MessDetailsSectionProps) {
  const [copied, setCopied] = useState(false)

  const copyCode = () => {
    if (currentMess?.unique_code) {
      navigator.clipboard.writeText(currentMess.unique_code)
      setCopied(true)
      toast.success('Code copied!')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!currentMess) return null

  return (
    <div className="nex-card p-6">
      <h3 className="text-lg font-semibold text-nex-text mb-4">Mess Details</h3>
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
    </div>
  )
}
