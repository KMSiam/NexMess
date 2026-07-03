import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '../../../stores/authStore'
import { useMessStore } from '../../../stores/messStore'
import { supabase } from '../../../lib/supabase'
import {
  Send, Sparkles, MapPin, Bot, User, AlertCircle, Loader2, ArrowRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

interface Message {
  id: string
  text: string
  is_ai: boolean
  is_daily_update: boolean
  created_at: string
  sender_id: string | null
  profiles?: {
    username: string | null
    avatar_url: string | null
  }
}

export default function AIMarketAssistant() {
  const { session, user } = useAuthStore()
  const { currentMess } = useMessStore()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const hasLocation = !!currentMess?.location?.trim()
  const messLocation = currentMess?.location || ''

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Real-time message subscription
  const fetchMessages = useCallback(async () => {
    if (!currentMess?.id) return
    const { data } = await supabase
      .from('market_chat_messages')
      .select('*, profiles(username, avatar_url)')
      .eq('mess_id', currentMess.id)
      .order('created_at', { ascending: true })

    if (data) {
      setMessages(data as Message[])
    }
  }, [currentMess?.id])

  useEffect(() => {
    if (!currentMess?.id) return

    fetchMessages()

    const channel = supabase
      .channel(`market-chat-${currentMess.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'market_chat_messages', filter: `mess_id=eq.${currentMess.id}` },
        () => {
          fetchMessages()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentMess?.id, fetchMessages])

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || !currentMess?.id || !session?.access_token || loading) return
    
    setInputText('')
    setLoading(true)

    try {
      // Build local chat history to pass to Gemini (last 6 messages to keep tokens small)
      const chatHistory = messages
        .slice(-6)
        .map(m => ({ text: m.text, is_ai: m.is_ai }))

      // Call Supabase Edge Function
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/market-assistant`
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          mess_id: currentMess.id,
          message: textToSend,
          action: 'chat',
          history: chatHistory
        })
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Failed to get response from assistant.')
      }
      
      // Force refresh of the message logs
      await fetchMessages()
    } catch (error: any) {
      toast.error(error.message || 'Error communicating with AI')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSuggestClick = (suggestion: string) => {
    setInputText('')
    handleSend(suggestion)
  }

  const suggestions = [
    { label: "Daily price report", text: "Please generate a new daily price report for Dhaka" },
    { label: "Cheapest place for eggs?", text: "Where can I find the cheapest place to buy eggs and chicken in this area today?" },
    { label: "Check my budget status", text: "Review our recent expenses and suggest how we can optimize our bazaar budget." },
    { label: "Grocery list helper", text: "Create a detailed grocery shopping list for tonight's meals." }
  ]

  if (!currentMess) return null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-12rem)] min-h-[480px]">
      
      {/* Sidebar: Location Details & Guidelines */}
      <div className="lg:col-span-1 flex flex-col gap-4">
        <div className="nex-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-nex-text uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-nex-primary animate-pulse" />
            Market Assistant
          </h3>
          <p className="text-xs text-nex-muted leading-relaxed">
            Your personal, read-only coordinator powered by Google Gemini. The assistant analyses meal routines, upcoming bazaar shifts, and recent spending.
          </p>

          <div className="p-4 bg-nex-elevated rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-nex-text">
              <MapPin className="w-4 h-4 text-nex-primary" />
              Location Status
            </div>
            {hasLocation ? (
              <p className="text-xs font-medium text-nex-success font-mono">{messLocation}</p>
            ) : (
              <div className="flex items-start gap-1.5 text-nex-danger text-[11px]">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>No location configured. Chat features are limited.</span>
              </div>
            )}
          </div>
          
          <div className="text-xs text-nex-muted space-y-1.5 border-t border-nex-border pt-3">
            <span className="font-semibold text-nex-text block mb-1">Safety & Scope Bounds:</span>
            <p>• Cannot add or delete expenses.</p>
            <p>• Cannot modify members or calendar.</p>
            <p>• Queries are restricted to your mess.</p>
          </div>
        </div>

        {/* Suggestion Chips Box (Hidden if location is missing) */}
        {hasLocation && (
          <div className="nex-card p-4 hidden lg:block space-y-2">
            <span className="text-[11px] font-semibold text-nex-muted uppercase tracking-wider block mb-1">Quick Questions</span>
            <div className="flex flex-col gap-2">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestClick(s.text)}
                  disabled={loading}
                  className="w-full text-left p-2.5 text-xs bg-nex-elevated hover:bg-nex-hover border border-nex-border rounded-xl text-nex-text transition-all duration-200 flex items-center justify-between group"
                >
                  <span className="truncate pr-2">{s.label}</span>
                  <ArrowRight className="w-3 h-3 text-nex-muted group-hover:text-nex-primary group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Chat Panel */}
      <div className="lg:col-span-3 nex-card flex flex-col overflow-hidden h-full">
        {/* Chat Header */}
        <div className="p-4 border-b border-nex-border flex items-center justify-between bg-nex-elevated/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-nex-primary/10 flex items-center justify-center border border-nex-primary/20">
              <Bot className="w-5 h-5 text-nex-primary" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-nex-text">Shared AI Market Log</h4>
              <p className="text-[10px] text-nex-muted">
                {hasLocation ? `Analyzing market at ${messLocation}` : 'Location unconfigured'}
              </p>
            </div>
          </div>
        </div>

        {/* Chat Messages Scrolling Area */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-nex-bg/20">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <Bot className="w-10 h-10 text-nex-muted/40 animate-bounce" />
              <div className="max-w-md">
                <p className="text-sm font-semibold text-nex-text">No Assistant Messages yet</p>
                <p className="text-xs text-nex-muted mt-1 leading-relaxed">
                  {hasLocation 
                    ? "Send a message or select a suggestion chip to start discussing grocery prices and budget reminders."
                    : "Configure a location in Mess Details Settings. The AI needs a location to crawl local grocery prices."}
                </p>
              </div>
            </div>
          ) : (
            messages.map((m) => {
              const isMe = m.sender_id === user?.id
              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-2.5 max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                >
                  {/* Sender Avatar / Icon */}
                  <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold ${
                    m.is_ai 
                      ? 'bg-gradient-to-br from-blue-400 to-blue-600 text-white' 
                      : 'bg-nex-elevated text-nex-text border border-nex-border'
                  }`}>
                    {m.is_ai ? (
                      <Bot className="w-4 h-4" />
                    ) : (
                      m.profiles?.username ? m.profiles.username.substring(0, 2).toUpperCase() : <User className="w-4 h-4" />
                    )}
                  </div>

                  {/* Message Bubble Container */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-[10px] font-semibold text-nex-text">
                        {m.is_ai ? 'Market Assistant' : (m.profiles?.username || 'Member')}
                      </span>
                      <span className="text-[9px] text-nex-muted">
                        {format(new Date(m.created_at), 'hh:mm a')}
                      </span>
                    </div>

                    <div className={`rounded-2xl p-3.5 text-xs leading-relaxed whitespace-pre-wrap ${
                      m.is_daily_update 
                        ? 'bg-nex-primary-light border border-nex-primary/30 text-nex-text shadow-sm'
                        : m.is_ai 
                          ? 'bg-nex-surface border border-nex-border text-nex-text shadow-sm'
                          : 'bg-nex-primary text-white shadow-sm'
                    }`}>
                      {m.text}
                    </div>
                  </div>
                </div>
              )
            })
          )}

          {/* AI Typing Indicator */}
          {loading && (
            <div className="flex items-start gap-2.5 max-w-[80%] mr-auto animate-pulse">
              <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600 text-white text-xs font-semibold">
                <Bot className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-nex-text px-1">Market Assistant</span>
                <div className="rounded-2xl p-3 bg-nex-surface border border-nex-border flex items-center gap-1.5 min-w-[70px] justify-center">
                  <Loader2 className="w-4 h-4 text-nex-primary animate-spin" />
                  <span className="text-[10px] text-nex-muted font-medium">Searching web...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input form */}
        <div className="p-4 border-t border-nex-border bg-nex-elevated/40">
          {!hasLocation ? (
            <div className="p-2.5 bg-nex-danger/10 border border-nex-danger/20 rounded-xl text-center text-xs text-nex-danger font-medium">
              You must set a location in Settings to enable the AI Market Assistant.
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSend(inputText)
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask about onion prices, shopping lists, or budget reminders..."
                className="nex-input flex-1 py-3 px-4 text-xs"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !inputText.trim()}
                className="nex-btn-primary p-3 shrink-0 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
