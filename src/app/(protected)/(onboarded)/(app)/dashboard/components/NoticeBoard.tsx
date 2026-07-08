'use client'

import { useState } from 'react'
import { Megaphone, Send, Pin, Plus } from 'lucide-react'

interface DashboardNotice {
  id: string
  message: string
}

interface NoticeBoardProps {
  notice: DashboardNotice | null
  isManager: boolean
  onSaveNotice: (text: string) => Promise<void>
  onDismissNotice: () => void
}

export default function NoticeBoard({
  notice,
  isManager,
  onSaveNotice,
  onDismissNotice,
}: NoticeBoardProps) {
  const [showInput, setShowInput] = useState(false)
  const [noticeText, setNoticeText] = useState(notice?.message || '')
  const [loading, setLoading] = useState(false)

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!noticeText.trim()) return
    setLoading(true)
    await onSaveNotice(noticeText.trim())
    setNoticeText('')
    setShowInput(false)
    setLoading(false)
  }

  return (
    <div className="nex-card flex h-full min-h-[160px] flex-col justify-between p-5">
      <div>
        <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Pin className="h-4 w-4 shrink-0 rotate-45 text-indigo-500" />
            <h4 className="text-nex-text text-xs font-bold tracking-wider uppercase">
              Notice Board
            </h4>
          </div>
          {isManager && !showInput && (
            <button
              onClick={() => {
                setShowInput(true)
                setNoticeText(notice?.message || '')
              }}
              className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-indigo-600 uppercase hover:underline dark:text-indigo-400 cursor-pointer"
            >
              <Plus className="h-3 w-3" /> {notice ? 'Edit' : 'Post'}
            </button>
          )}
        </div>

        {/* Input Form for managers */}
        {showInput && isManager ? (
          <form onSubmit={handleSave} className="animate-slide-up mt-2 space-y-2.5">
            <input
              type="text"
              value={noticeText}
              onChange={(e) => setNoticeText(e.target.value)}
              className="nex-input w-full px-3 py-2 text-sm"
              placeholder="Type your notice here..."
              maxLength={200}
              required
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading || !noticeText.trim()}
                className="nex-btn-primary flex items-center gap-1 px-3 py-1.5 text-xs disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" /> Save
              </button>
              <button
                type="button"
                onClick={() => setShowInput(false)}
                className="nex-btn-secondary px-3 py-1.5 text-xs"
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
                  className="nex-btn-secondary ml-auto border-red-500/20 px-3 py-1.5 text-xs !text-red-500 hover:!bg-red-500/10"
                >
                  Remove Notice
                </button>
              )}
            </div>
          </form>
        ) : notice ? (
          <p className="text-nex-text text-sm leading-relaxed font-medium break-words">
            {notice.message}
          </p>
        ) : (
          <div className="flex shrink-0 flex-col items-center justify-center py-4 text-center">
            <Megaphone className="mb-1 h-7 w-7 text-slate-400 dark:text-slate-600" />
            <p className="text-nex-muted text-xs font-medium">No active notice pinned.</p>
          </div>
        )}
      </div>
    </div>
  )
}
