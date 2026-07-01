import { useState } from 'react'
import { Megaphone, Send, X, Pin } from 'lucide-react'
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
        <div className="nex-card p-5 animate-slide-up border-t-4 border-nex-primary">
          <div className="flex items-center gap-2 mb-3">
            <Megaphone className="w-4 h-4 text-nex-primary" />
            <p className="text-sm font-semibold text-nex-text">Post a Notice to Mess</p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={noticeText}
              onChange={e => setNoticeText(e.target.value)}
              className="nex-input flex-1 text-sm py-2"
              placeholder="e.g., Dinner is canceled tonight due to maintenance..."
              maxLength={200}
            />
            <button
              onClick={handleSave}
              disabled={loading || !noticeText.trim()}
              className="nex-btn-primary px-4 py-2 disabled:opacity-50 flex items-center justify-center shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
            <button
              onClick={onCloseForm}
              className="nex-btn-secondary px-3 py-2 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Pinned Notice Board */}
      {notice && (
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border-l-4 border-l-indigo-600 dark:border-l-indigo-500 border-y border-r border-slate-100 dark:border-slate-800/80 p-5 shadow-md flex items-start gap-4 animate-fade-in">
          {/* Decorative glowing backplate */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
          
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shrink-0 flex items-center justify-center">
            <Pin className="w-5 h-5 rotate-45 text-indigo-600 dark:text-indigo-400 animate-pulse-soft" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Pinned Notice
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" />
            </div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
              {notice.message}
            </p>
          </div>

          {isManager && (
            <button
              onClick={onDismissNotice}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all duration-200 shrink-0"
              title="Remove notice"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          )}
        </div>
      )}
    </>
  )
}
