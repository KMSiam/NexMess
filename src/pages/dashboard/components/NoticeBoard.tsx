import { useState } from 'react'
import { Megaphone, Send, X } from 'lucide-react'
import type { DashboardNotice } from '../../../hooks/useDashboardData'

interface NoticeBoardProps {
  notice: DashboardNotice | null
  isManager: boolean
  showForm: boolean
  onSaveNotice: (text: string) => Promise<void>
  onDismissNotice: () => void
  onCloseForm: () => void
}

export default function NoticeBoard({ notice, isManager, showForm, onSaveNotice, onDismissNotice, onCloseForm }: NoticeBoardProps) {
  const [noticeText, setNoticeText] = useState(notice?.message || '')
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!noticeText.trim()) return
    setLoading(true)
    await onSaveNotice(noticeText.trim())
    setNoticeText('')
    setLoading(false)
  }

  return (
    <>
      {/* Manager Notice Form */}
      {showForm && isManager && (
        <div className="nex-card p-4 animate-slide-up border-l-4 border-nex-primary">
          <div className="flex items-center gap-2 mb-3">
            <Megaphone className="w-4 h-4 text-nex-primary" />
            <p className="text-sm font-semibold text-nex-text">Post a Notice</p>
          </div>
          <div className="flex gap-2">
            <input type="text" value={noticeText} onChange={e => setNoticeText(e.target.value)} className="nex-input flex-1 text-base" placeholder="e.g., No dinner tomorrow, deposit ৳2000 by Friday..." maxLength={200} />
            <button onClick={handleSave} disabled={loading || !noticeText.trim()} className="nex-btn-primary px-3 disabled:opacity-50"><Send className="w-4 h-4" /></button>
            <button onClick={onCloseForm} className="nex-btn-secondary px-3"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* Pinned Notice */}
      {notice && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 shadow-md flex items-start gap-3">
          <Megaphone className="w-5 h-5 text-white/80 shrink-0 mt-0.5" />
          <p className="flex-1 text-sm text-white font-medium leading-relaxed">{notice.message}</p>
          {isManager && (
            <button onClick={onDismissNotice} className="p-1 rounded-full hover:bg-white/20 transition-colors text-white/60 hover:text-white shrink-0" title="Remove notice">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </>
  )
}
