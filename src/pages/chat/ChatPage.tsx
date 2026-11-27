import { useEffect, useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../stores/authStore'
import { useMessStore } from '../../stores/messStore'
import { supabase } from '../../lib/supabase'
import { ChatMessage } from '../../types/database'
import { Send, MessageSquare, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

import { usePageTitle } from '../../hooks/usePageTitle'
import { createRealtimeChannelName } from '../../hooks/useRealtimeTable'
import ChatBubble from './components/ChatBubble'
import ImageUploader from './components/ImageUploader'

interface Reaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
}

const PAGE_SIZE = 30

export default function ChatPage() {
  const { t } = useTranslation()
  usePageTitle(t('chat.title'))

  const { profile } = useAuthStore()
  const { currentMess, members } = useMessStore()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const membersRef = useRef(members)
  useEffect(() => {
    membersRef.current = members
  }, [members])

  // Fetch messages and their reactions
  const fetchMessagesAndReactions = useCallback(
    async (limit = PAGE_SIZE, beforeId?: string) => {
      if (!currentMess?.id) return

      let query = supabase
        .from('chat_messages')
        .select('*, profiles(username, avatar_url)')
        .eq('mess_id', currentMess.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (beforeId) {
        const beforeMsg = messages.find((m) => m.id === beforeId)
        if (beforeMsg) {
          query = query.lt('created_at', beforeMsg.created_at)
        }
      }

      const { data: rawMsgs, error } = await query
      if (error) {
        toast.error('Failed to load messages')
        return
      }

      const fetchedMsgs = ((rawMsgs as ChatMessage[]) || []).reverse()

      if (fetchedMsgs.length < limit) {
        setHasMore(false)
      }

      if (beforeId) {
        // Prepend older messages and preserve scroll position
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
        setMessages(fetchedMsgs)
        setTimeout(() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
          }
        }, 100)
      }

      if (fetchedMsgs.length > 0) {
        const msgIds = fetchedMsgs.map((m) => m.id)
        const { data: rxData } = await supabase
          .from('chat_reactions')
          .select('*')
          .in('message_id', msgIds)

        if (rxData) {
          setReactions((prev) => {
            const filteredPrev = prev.filter((r) => !msgIds.includes(r.message_id))
            return [...filteredPrev, ...(rxData as Reaction[])]
          })
        }
      }
    },
    [currentMess?.id, messages]
  )

  useEffect(() => {
    if (currentMess?.id) {
      setMessages([])
      setReactions([])
      setHasMore(true)
      fetchMessagesAndReactions(PAGE_SIZE)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMess?.id])

  // Infinite scroll: fetch older messages when reaching top
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    if (target.scrollTop === 0 && hasMore && !loadingOlder && messages.length > 0) {
      setLoadingOlder(true)
      fetchMessagesAndReactions(PAGE_SIZE, messages[0].id).finally(() => {
        setLoadingOlder(false)
      })
    }
  }

  // Subscriptions for new messages and reaction updates
  useEffect(() => {
    if (!currentMess?.id) return

    const channel = supabase
      .channel(createRealtimeChannelName(`chat-realtime-${currentMess.id}`))
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `mess_id=eq.${currentMess.id}`,
        },
        (payload) => {
          const newMsg = payload.new as any
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev
            const senderProfile = membersRef.current.find(
              (m) => m.user_id === newMsg.sender_id
            )?.profiles
            const completeMsg = {
              ...newMsg,
              profiles: senderProfile || { username: 'Unknown' },
            }
            return [...prev, completeMsg as ChatMessage]
          })
          // Auto-scroll if user is near bottom
          const container = messagesContainerRef.current
          if (container) {
            const isAtBottom =
              container.scrollHeight - container.clientHeight - container.scrollTop < 100
            if (isAtBottom) {
              setTimeout(() => {
                if (messagesContainerRef.current) {
                  messagesContainerRef.current.scrollTo({
                    top: messagesContainerRef.current.scrollHeight,
                    behavior: 'smooth',
                  })
                }
              }, 50)
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_reactions',
        },
        (payload) => {
          const eventType = payload.eventType
          if (eventType === 'INSERT') {
            const newRx = payload.new as Reaction
            setReactions((prev) => [...prev, newRx])
          } else if (eventType === 'DELETE') {
            const oldRx = payload.old as { id: string }
            setReactions((prev) => prev.filter((r) => r.id !== oldRx.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentMess?.id])

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

    // Optimistically append message to UI
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
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        mess_id: currentMess.id,
        sender_id: profile.id,
        text: msgText,
        message_type: messageType,
      })
      .select('*, profiles(username, avatar_url)')
      .single()

    if (data && !error) {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? (data as ChatMessage) : m)))
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTo({
            top: messagesContainerRef.current.scrollHeight,
            behavior: 'smooth',
          })
        }
      }, 50)
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      toast.error('Failed to send message')
    }
  }

  const handleAddReaction = async (messageId: string, emoji: string) => {
    if (!profile?.id) return
    const { error } = await supabase.from('chat_reactions').insert({
      message_id: messageId,
      user_id: profile.id,
      emoji,
    })
    if (error && error.code !== '23505') {
      // Unique constraint violation (duplicate reaction) is safely ignored
      toast.error('Failed to add reaction')
    }
  }

  const handleRemoveReaction = async (reactionId: string) => {
    const { error } = await supabase.from('chat_reactions').delete().eq('id', reactionId)
    if (error) {
      toast.error('Failed to remove reaction')
    }
  }

  if (!currentMess) return null

  return (
    <div className="mx-auto flex h-[calc(100dvh-11rem)] min-h-[400px] max-w-3xl flex-col md:h-[calc(100dvh-7.5rem)]">
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="text-nex-primary h-5 w-5 sm:h-6 sm:w-6" />
          <h1 className="text-nex-text text-xl font-bold sm:text-2xl">{t('chat.title')}</h1>
        </div>
      </div>

      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="nex-card relative min-h-0 flex-1 space-y-4 overflow-y-auto p-3 sm:p-4"
      >
        {loadingOlder && (
          <div className="flex justify-center py-2">
            <RefreshCw className="text-nex-primary h-4 w-4 animate-spin" />
          </div>
        )}

        {messages.length === 0 && !loadingOlder && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <MessageSquare className="text-nex-muted/20 mb-2 h-12 w-12 animate-bounce" />
            <p className="text-nex-text text-sm font-medium">{t('chat.noMessages')}</p>
            <p className="text-nex-muted mt-1 max-w-xs text-xs">
              {t('chat.noMessagesDesc')}
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
        <div className="h-1 shrink-0" />
      </div>

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
          placeholder={t('chat.typeMessage')}
          id="chat-input"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={sending || !newMessage.trim()}
          aria-label={t('chat.send', { defaultValue: 'Send message' })}
          className="nex-btn-primary px-4 disabled:opacity-50"
          id="chat-send"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}
