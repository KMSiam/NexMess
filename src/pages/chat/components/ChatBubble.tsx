import { useState } from 'react'
import { Smile } from 'lucide-react'
import { getInitials, isSafeHttpUrl, formatNumber, formatLocalizedDate } from '../../../lib/utils'
import type { ChatMessage, Profile } from '../../../types/database'

interface Reaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
  profiles?: Profile
}

interface ChatBubbleProps {
  msg: ChatMessage
  isOwn: boolean
  reactions: Reaction[]
  currentUserId: string | undefined
  onAddReaction: (messageId: string, emoji: string) => void
  onRemoveReaction: (reactionId: string) => void
}

const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏']

export default function ChatBubble({
  msg,
  isOwn,
  reactions,
  currentUserId,
  onAddReaction,
  onRemoveReaction,
}: ChatBubbleProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const sender = (msg as any).profiles

  // Group reactions by emoji
  const reactionsByEmoji = reactions.reduce<
    Record<string, { count: number; userReacted: string | null; ids: string[] }>
  >((acc, curr) => {
    if (!acc[curr.emoji]) {
      acc[curr.emoji] = { count: 0, userReacted: null, ids: [] }
    }
    acc[curr.emoji].count += 1
    acc[curr.emoji].ids.push(curr.id)
    if (curr.user_id === currentUserId) {
      acc[curr.emoji].userReacted = curr.id
    }
    return acc
  }, {})

  const handleEmojiClick = (emoji: string) => {
    const existingReaction = reactionsByEmoji[emoji]?.userReacted
    if (existingReaction) {
      onRemoveReaction(existingReaction)
    } else {
      onAddReaction(msg.id, emoji)
    }
    setShowEmojiPicker(false)
  }

  return (
    <div className={`group/bubble relative flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      {!isOwn && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-slate-300 to-slate-400 text-[10px] font-semibold text-white sm:h-8 sm:w-8 sm:text-xs">
          {sender?.avatar_url && isSafeHttpUrl(sender.avatar_url) ? (
            <img src={sender.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            getInitials(sender?.username || '?')
          )}
        </div>
      )}

      <div className={`relative max-w-[80%] sm:max-w-[70%] ${isOwn ? 'order-1' : ''}`}>
        {!isOwn && <p className="text-nex-muted mb-0.5 ml-1 text-xs">{sender?.username}</p>}

        <div className="relative">
          <div
            className={`rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap ${
              isOwn
                ? 'bg-nex-primary rounded-br-sm text-white'
                : 'bg-nex-elevated text-nex-text border-nex-border/50 rounded-bl-sm border'
            }`}
          >
            {msg.message_type === 'image' && isSafeHttpUrl(msg.text) ? (
              <a
                href={msg.text}
                target="_blank"
                rel="noreferrer"
                className="block max-w-xs overflow-hidden rounded-lg"
              >
                <img
                  src={msg.text}
                  alt="Chat media"
                  className="h-auto w-full object-cover transition-transform duration-200 hover:scale-102"
                />
              </a>
            ) : (
              msg.text
            )}
          </div>

          <div
            className={`bg-nex-surface border-nex-border absolute top-1/2 z-10 flex -translate-y-1/2 items-center gap-1 rounded-full border px-1.5 py-1 opacity-0 shadow-md transition-opacity group-hover/bubble:opacity-100 ${
              isOwn ? 'right-full mr-2' : 'left-full ml-2'
            }`}
          >
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="text-nex-muted hover:text-nex-text hover:bg-nex-hover rounded-full p-1 transition-colors"
              title="Add reaction"
              aria-label="Add reaction"
            >
              <Smile className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {showEmojiPicker && (
          <div
            className={`bg-nex-surface border-nex-border animate-slide-up absolute z-20 mt-1 flex gap-1.5 rounded-full border px-2 py-1 shadow-lg ${
              isOwn ? 'right-0' : 'left-0'
            }`}
          >
            {COMMON_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleEmojiClick(emoji)}
                className="px-1 text-base transition-transform hover:scale-125"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {reactions.length > 0 && (
          <div className={`mt-1 flex flex-wrap gap-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(reactionsByEmoji).map(([emoji, data]) => (
              <button
                key={emoji}
                onClick={() =>
                  data.userReacted
                    ? onRemoveReaction(data.userReacted)
                    : onAddReaction(msg.id, emoji)
                }
                className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs ${
                  data.userReacted
                    ? 'bg-nex-primary-light border-nex-primary/30 text-nex-primary'
                    : 'bg-nex-elevated border-nex-border text-nex-text'
                } hover:bg-nex-hover transition-colors`}
              >
                <span>{emoji}</span>
                <span className="text-[10px] font-semibold">{formatNumber(data.count)}</span>
              </button>
            ))}
          </div>
        )}

        <p className={`text-nex-muted mt-0.5 text-[10px] ${isOwn ? 'mr-1 text-right' : 'ml-1'}`}>
          {formatLocalizedDate(msg.created_at, 'h:mm a')}
        </p>
      </div>
    </div>
  )
}
