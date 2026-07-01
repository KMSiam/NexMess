import { useState } from 'react'
import { Megaphone, Send, Pin, Plus } from 'lucide-react'
import type { DashboardNotice } from '../../../hooks/useDashboardData'

interface NoticeBoardProps {
  notice: DashboardNotice | null
  isManager: boolean
  showForm: boolean
  onSaveNotice: (text: string) => Promise<void>
  onDismissNotice: () => void
  onCloseForm: () => void
}

export default function NoticeBoard({
  notice,
  isManager,
  onSaveNotice,
  onDismissNotice,
}: Omit<NoticeBoardProps, 'showForm' | 'onCloseForm'>) {
  const [showInput, setShowInput] = useState(false)
  const [noticeText, setNoticeText] = useState(notice?.message || '')
  const [loading, setLoading] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!noticeText.trim()) return
    setLoading(true)
    await onSaveNotice(noticeText.trim())
    setNoticeText('')
    setShowInput(false)
    setLoading(false)
  }

  return (
    <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-900 rounded-2xl p-5 shadow-sm h-full flex flex-col justify-between min-h-[160px]">
      <div>
        <div className="flex items-center justify-between gap-3 mb-3 shrink-0">
          <div className="flex items-center gap-2">
            <Pin className="w-4 h-4 text-indigo-500 rotate-45 shrink-0" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Notice Board
            </h4>
          </div>
          {isManager && !showInput && (
            <button
              onClick={() => { setShowInput(true); setNoticeText(notice?.message || '') }}
              className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> {notice ? 'Edit' : 'Post'}
            </button>
          )}
        </div>

        {/* Input Form for managers */}
        {showInput && isManager ? (
          <form onSubmit={handleSave} className="space-y-2.5 animate-slide-up mt-2">
            <input
              type="text"
              value={noticeText}
              onChange={e => setNoticeText(e.target.value)}
              className="nex-input w-full text-sm py-2 px-3"
              placeholder="Type your notice here..."
              maxLength={200}
              required
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading || !noticeText.trim()}
                className="nex-btn-primary py-1.5 px-3 text-xs disabled:opacity-50 flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" /> Save
              </button>
              <button
                type="button"
                onClick={() => setShowInput(false)}
                className="nex-btn-secondary py-1.5 px-3 text-xs"
              >
                Cancel
              </button>
              {notice && (
                <button
                  type="button"
                  onClick={async () => {
                    await onDismissNotice()
                    setShowInput(false)
                  }}
                  className="nex-btn-secondary py-1.5 px-3 text-xs !text-red-500 hover:!bg-red-500/10 border-red-500/20 ml-auto"
                >
                  Remove Notice
                </button>
              )}
            </div>
          </form>
        ) : notice ? (
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed break-words">
            {notice.message}
          </p>
        ) : (
          <div className="flex flex-col items-center justify-center py-4 text-center shrink-0">
            <Megaphone className="w-7 h-7 text-slate-300 dark:text-slate-700 mb-1" />
            <p className="text-xs text-slate-400 dark:text-slate-500">No active notice pinned.</p>
          </div>
        )}
      </div>
    </div>
  )
}
