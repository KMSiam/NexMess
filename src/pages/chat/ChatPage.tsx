import { useEffect, useState, useRef } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { useMessStore } from '../../stores/messStore'
import { supabase } from '../../lib/supabase'
import { ChatMessage } from '../../types/database'
import { Send, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'
import { getInitials } from '../../lib/utils'
import toast from 'react-hot-toast'

export default function ChatPage() {
  const { profile } = useAuthStore()
  const { currentMess, members } = useMessStore()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!currentMess?.id) return

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*, profiles(username, avatar_url)')
        .eq('mess_id', currentMess.id)
        .order('created_at', { ascending: true })
        .limit(100)
      if (data) setMessages(data as ChatMessage[])
    }
    fetchMessages()

    // Real-time subscription
    const channel = supabase
      .channel('chat-' + currentMess.id)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages',
        filter: `mess_id=eq.${currentMess.id}`,
      }, (payload) => {
        const newMsg = payload.new as any
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev
          
          // Look up sender from local members store to avoid DB read-replica lag
          const senderProfile = members.find(m => m.user_id === newMsg.sender_id)?.profiles
          const completeMsg = {
            ...newMsg,
            profiles: senderProfile || { username: 'Unknown' }
          }
          return [...prev, completeMsg as ChatMessage]
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [currentMess?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !profile?.id || !currentMess?.id) return
    setSending(true)

    const tempId = 'temp-' + Date.now()
    const msgText = newMessage.trim()
    
    // Optimistic UI update
    const optimisticMsg = {
      id: tempId,
      mess_id: currentMess.id,
      sender_id: profile.id,
      text: msgText,
      message_type: 'text',
      created_at: new Date().toISOString(),
      profiles: { username: profile.username, avatar_url: profile.avatar_url }
    }
    setMessages(prev => [...prev, optimisticMsg as any])
    setNewMessage('')
    setSending(false)

    // Actual DB Insert
    const { data, error } = await supabase.from('chat_messages').insert({
      mess_id: currentMess.id,
      sender_id: profile.id,
      text: msgText,
      message_type: 'text',
    }).select('*, profiles(username, avatar_url)').single()

    if (data && !error) {
      setMessages(prev => prev.map(m => m.id === tempId ? (data as ChatMessage) : m))
    } else {
      // If error, remove the optimistic message
      setMessages(prev => prev.filter(m => m.id !== tempId))
      toast.error('Failed to send message')
    }
  }

  if (!currentMess) return null

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100dvh-8rem)] lg:h-[calc(100vh-6rem)]">
      <div className="flex items-center gap-3 mb-3">
        <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-nex-primary" />
        <h1 className="text-xl sm:text-2xl font-bold text-nex-text">Group Chat</h1>
      </div>

      {/* Messages */}
      <div className="flex-1 nex-card p-3 sm:p-4 overflow-y-auto space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-nex-muted py-12 text-sm">No messages yet. Start the conversation!</p>
        )}
        {messages.map((msg) => {
          const isOwn = msg.sender_id === profile?.id
          const sender = (msg as any).profiles
          return (
            <div key={msg.id} className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              {!isOwn && (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white text-[10px] sm:text-xs font-semibold shrink-0">
                  {sender?.avatar_url ? (
                    <img src={sender.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : getInitials(sender?.username || '?')}
                </div>
              )}
              <div className={`max-w-[80%] sm:max-w-[70%] ${isOwn ? 'order-1' : ''}`}>
                {!isOwn && <p className="text-[10px] text-nex-muted mb-0.5 ml-1">{sender?.username}</p>}
                <div className={`px-3 py-2 rounded-2xl text-sm ${
                  isOwn
                    ? 'bg-nex-primary text-white rounded-br-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-nex-text rounded-bl-sm'
                }`}>
                  {msg.text}
                </div>
                <p className={`text-[10px] text-nex-muted mt-0.5 ${isOwn ? 'text-right mr-1' : 'ml-1'}`}>
                  {format(new Date(msg.created_at), 'h:mm a')}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="mt-2 flex gap-2">
        <input
          type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)}
          className="nex-input flex-1 text-base" placeholder="Type a message..."
          id="chat-input"
        />
        <button type="submit" disabled={sending || !newMessage.trim()}
          className="nex-btn-primary px-4 disabled:opacity-50" id="chat-send">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}
