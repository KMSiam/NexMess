import { useState } from 'react'
import { format } from 'date-fns'
import { Smile } from 'lucide-react'
import { getInitials } from '../../../lib/utils'
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
  const reactionsByEmoji = reactions.reduce<Record<string, { count: number; userReacted: string | null; ids: string[] }>>((acc, curr) => {
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
    <div className={`flex gap-2 group/bubble relative ${isOwn ? 'justify-end' : 'justify-start'}`}>
      {!isOwn && (
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white text-[10px] sm:text-xs font-semibold shrink-0">
          {sender?.avatar_url ? (
            <img src={sender.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            getInitials(sender?.username || '?')
          )}
        </div>
      )}
      
      <div className={`max-w-[80%] sm:max-w-[70%] relative ${isOwn ? 'order-1' : ''}`}>
        {!isOwn && <p className="text-xs text-nex-muted mb-0.5 ml-1">{sender?.username}</p>}
        
        {/* Message Content Bubble */}
        <div className="relative">
          <div className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
            isOwn
              ? 'bg-nex-primary text-white rounded-br-sm'
              : 'bg-nex-elevated text-nex-text rounded-bl-sm border border-nex-border/50'
          }`}>
            {msg.message_type === 'image' ? (
              <a href={msg.text} target="_blank" rel="noreferrer" className="block max-w-xs overflow-hidden rounded-lg">
                <img src={msg.text} alt="Chat media" className="w-full h-auto object-cover hover:scale-102 transition-transform duration-200" />
              </a>
            ) : (
              msg.text
            )}
          </div>

          {/* Quick Action Button Panel (hover to trigger) */}
          <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 bg-nex-surface border border-nex-border shadow-md rounded-full px-1.5 py-1 opacity-0 group-hover/bubble:opacity-100 transition-opacity z-10 ${
            isOwn ? 'right-full mr-2' : 'left-full ml-2'
          }`}>
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1 text-nex-muted hover:text-nex-text hover:bg-nex-hover rounded-full transition-colors"
              title="Add reaction"
            >
              <Smile className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Emoji Reaction Selector Drawer */}
        {showEmojiPicker && (
          <div className={`absolute z-20 bg-nex-surface border border-nex-border shadow-lg rounded-full px-2 py-1 flex gap-1.5 animate-slide-up mt-1 ${
            isOwn ? 'right-0' : 'left-0'
          }`}>
            {COMMON_EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleEmojiClick(emoji)}
                className="hover:scale-125 transition-transform px-1 text-base"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Rendered Reactions Badges */}
        {reactions.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(reactionsByEmoji).map(([emoji, data]) => (
              <button
                key={emoji}
                onClick={() => data.userReacted ? onRemoveReaction(data.userReacted) : onAddReaction(msg.id, emoji)}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border ${
                  data.userReacted
                    ? 'bg-nex-primary-light border-nex-primary/30 text-nex-primary'
                    : 'bg-nex-elevated border-nex-border text-nex-text'
                } hover:bg-nex-hover transition-colors`}
              >
                <span>{emoji}</span>
                <span className="text-[10px] font-semibold">{data.count}</span>
              </button>
            ))}
          </div>
        )}

        <p className={`text-[10px] text-nex-muted mt-0.5 ${isOwn ? 'text-right mr-1' : 'ml-1'}`}>
          {format(new Date(msg.created_at), 'h:mm a')}
        </p>
      </div>
    </div>
  )
}
