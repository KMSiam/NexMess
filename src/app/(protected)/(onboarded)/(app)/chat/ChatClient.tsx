'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useProfileStore, useMessStore } from '@/stores/appStore'
import { getChatMessages, sendChatMessage, toggleChatReaction, getChatReactions } from '@/actions/chat'
import type { ChatMessage } from '@/types/database'
import { Send, MessageSquare, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { usePusherRealtime } from '@/hooks/usePusherRealtime'

// Components
import ChatBubble from './components/ChatBubble'
import ImageUploader from './components/ImageUploader'

interface Reaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
}

const PAGE_SIZE = 30

export default function ChatClient() {
  const { profile } = useProfileStore()
  const { currentMess } = useMessStore()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Fetch messages and reactions
  const fetchMessagesAndReactions = useCallback(
    async (limit = PAGE_SIZE, beforeId?: string) => {
      if (!currentMess?.id) return

      try {
        const fetchedMsgs = await getChatMessages(currentMess.id, limit, beforeId)

        if (fetchedMsgs.length < limit) {
          setHasMore(false)
        }

        if (beforeId) {
          // Prepend historical messages and maintain scroll position
          const container = messagesContainerRef.current
          const scrollHeightBefore = container?.scrollHeight || 0
          const scrollTopBefore = container?.scrollTop || 0

          setMessages((prev) => [...fetchedMsgs, ...prev])

          setTimeout(() => {
            if (container) {
              const scrollHeightAfter = container.scrollHeight
              container.scrollTop = scrollTopBefore + (scrollHeightAfter - scrollHeightBefore)
            }
          }, 0)
        } else {
          // Initial messages load
          setMessages(fetchedMsgs)
          setTimeout(() => {
            if (messagesContainerRef.current) {
              messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
            }
            bottomRef.current?.scrollIntoView({ behavior: 'auto' })
          }, 100)
        }

        // Fetch reactions for loaded messages
        if (fetchedMsgs.length > 0) {
          const msgIds = fetchedMsgs.map((m) => m.id)
          const rxData = await getChatReactions(currentMess.id, msgIds)
          setReactions((prev) => {
            const filteredPrev = prev.filter((r) => !msgIds.includes(r.message_id))
            return [...filteredPrev, ...rxData]
          })
        }
      } catch (err: any) {
        toast.error('Failed to load messages')
      }
    },
    [currentMess?.id]
  )

  // Initial load
  useEffect(() => {
    if (currentMess?.id) {
      setHasMore(true)
      fetchMessagesAndReactions(PAGE_SIZE)
    }
  }, [currentMess?.id, fetchMessagesAndReactions])

  // Pusher trigger to fetch latest chat updates
  usePusherRealtime(
    currentMess?.id,
    ['chat_messages', 'chat_reactions'],
    async () => {
      // Refresh current visible set of messages
      if (messages.length > 0) {
        const msgIds = messages.map((m) => m.id)
        const rxData = await getChatReactions(currentMess!.id, msgIds)
        setReactions(rxData)
      }
      // Simple fresh fetch if at bottom
      const container = messagesContainerRef.current
      if (container) {
        const isAtBottom = container.scrollHeight - container.clientHeight - container.scrollTop < 150
        if (isAtBottom) {
          const latest = await getChatMessages(currentMess!.id, PAGE_SIZE)
          setMessages(latest)
          setTimeout(() => {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
          }, 50)
        }
      }
    }
  )

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    if (target.scrollTop === 0 && hasMore && !loadingOlder && messages.length > 0) {
      setLoadingOlder(true)
      fetchMessagesAndReactions(PAGE_SIZE, messages[0].id).finally(() => {
        setLoadingOlder(false)
      })
    }
  }

  const handleSend = async (
    e?: React.FormEvent<HTMLFormElement>,
    customText?: string,
    messageType: 'text' | 'image' = 'text'
  ) => {
    if (e) e.preventDefault()

    const textToSend = customText || newMessage.trim()
    if (!textToSend || !profile?.id || !currentMess?.id) return

    const msgText = textToSend.slice(0, 2000)
    setSending(true)

    const tempId = 'temp-' + Date.now()

    // Optimistic message update
    const optimisticMsg = {
      id: tempId,
      mess_id: currentMess.id,
      sender_id: profile.id,
      text: msgText,
      message_type: messageType,
      created_at: new Date().toISOString(),
      profiles: { username: profile.username, avatar_url: profile.avatar_url },
    }
    setMessages((prev) => [...prev, optimisticMsg as any])
    if (!customText) setNewMessage('')
    setSending(false)

    try {
      const data = await sendChatMessage(currentMess.id, msgText, messageType)
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, id: data.id } : m)))
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 50)
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      toast.error('Failed to send message')
    }
  }

  const handleAddReaction = async (messageId: string, emoji: string) => {
    if (!profile?.id || !currentMess?.id) return
    try {
      await toggleChatReaction(currentMess.id, messageId, emoji)
    } catch (err: any) {
      toast.error('Failed to add reaction')
    }
  }

  const handleRemoveReaction = async (reactionId: string) => {
    if (!currentMess?.id) return
    // In our toggle system, reactionId matches the emoji toggle
    const rx = reactions.find((r) => r.id === reactionId)
    if (!rx) return
    try {
      await toggleChatReaction(currentMess.id, rx.message_id, rx.emoji)
    } catch (err: any) {
      toast.error('Failed to remove reaction')
    }
  }

  if (!currentMess) return null

  return (
    <div className="mx-auto flex h-[calc(100dvh-8rem)] max-w-3xl flex-col md:h-[calc(100vh-6rem)] animate-fade-in">
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="text-nex-primary h-5 w-5 sm:h-6 sm:w-6" />
          <h1 className="text-nex-text text-xl font-bold sm:text-2xl">Group Chat</h1>
        </div>
      </div>

      {/* Messages Window */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="nex-card relative flex-1 space-y-4 overflow-y-auto p-3 sm:p-4"
      >
        {loadingOlder && (
          <div className="flex justify-center py-2">
            <RefreshCw className="text-nex-primary h-4 w-4 animate-spin" />
          </div>
        )}

        {messages.length === 0 && !loadingOlder && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <MessageSquare className="text-nex-muted/20 mb-2 h-12 w-12 animate-bounce" />
            <p className="text-nex-text text-sm font-medium">No messages yet</p>
            <p className="text-nex-muted mt-1 max-w-xs text-xs">
              Start the conversation with your mess members!
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isOwn = msg.sender_id === profile?.id
          const msgReactions = reactions.filter((r) => r.message_id === msg.id)
          return (
            <ChatBubble
              key={msg.id}
              msg={msg}
              isOwn={isOwn}
              reactions={msgReactions}
              currentUserId={profile?.id}
              onAddReaction={handleAddReaction}
              onRemoveReaction={handleRemoveReaction}
            />
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input controls */}
      <form onSubmit={(e) => handleSend(e)} className="mt-2 flex shrink-0 gap-2">
        <ImageUploader
          messId={currentMess.id}
          onUploadComplete={(url) => handleSend(undefined, url, 'image')}
        />
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          maxLength={2000}
          className="nex-input flex-1 text-base"
          placeholder="Type a message..."
          id="chat-input"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={sending || !newMessage.trim()}
          className="nex-btn-primary px-4 disabled:opacity-50 cursor-pointer"
          id="chat-send"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}
