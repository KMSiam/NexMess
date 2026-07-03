import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '../../../stores/authStore'
import { useMessStore } from '../../../stores/messStore'
import { supabase } from '../../../lib/supabase'
import { Send, Sparkles, MapPin, Bot, User, AlertCircle, Loader2, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { usePageTitle } from '../../../hooks/usePageTitle'

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
  usePageTitle('NexMessAI')
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
        {
          event: '*',
          schema: 'public',
          table: 'market_chat_messages',
          filter: `mess_id=eq.${currentMess.id}`,
        },
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
      const chatHistory = messages.slice(-6).map((m) => ({ text: m.text, is_ai: m.is_ai }))

      // Call Supabase Edge Function
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/market-assistant`
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          mess_id: currentMess.id,
          message: textToSend,
          action: 'chat',
          history: chatHistory,
        }),
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
    { label: 'Daily price report', text: 'Please generate a new daily price report for this area' },
    {
      label: 'Cheapest place for eggs?',
      text: 'Where can I find the cheapest place to buy eggs and chicken in this area today?',
    },
    {
      label: 'Check my budget status',
      text: 'Review our recent expenses and suggest how we can optimize our bazaar budget.',
    },
    {
      label: 'Grocery list helper',
      text: "Create a detailed grocery shopping list for tonight's meals.",
    },
  ]

  if (!currentMess) return null

  return (
    <div className="mx-auto flex h-[calc(100dvh-8rem)] w-full max-w-4xl flex-col md:h-[calc(100vh-6rem)]">
      <div className="mb-3 flex shrink-0 items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <Sparkles className="text-nex-primary h-5 w-5 animate-pulse sm:h-6 sm:w-6" />
          <h1 className="text-nex-text text-xl font-bold sm:text-2xl">NexMessAI</h1>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Sidebar: Location Details & Guidelines */}
        <div className="hidden flex-col gap-4 lg:col-span-1 lg:flex">
          <div className="nex-card space-y-4 p-5">
            <h3 className="text-nex-text flex items-center gap-2 text-sm font-semibold tracking-wider uppercase">
              <Sparkles className="text-nex-primary h-4 w-4 animate-pulse" />
              NexMessAI
            </h3>
            <p className="text-nex-muted text-xs leading-relaxed">
              Your personal, read-only coordinator powered by Google Gemini. The assistant analyses
              meal routines, upcoming bazaar shifts, and recent spending.
            </p>

            <div className="bg-nex-elevated space-y-2 rounded-xl p-4">
              <div className="text-nex-text flex items-center gap-2 text-xs font-semibold">
                <MapPin className="text-nex-primary h-4 w-4" />
                Location Status
              </div>
              {hasLocation ? (
                <p className="text-nex-success font-mono text-xs font-medium">{messLocation}</p>
              ) : (
                <div className="text-nex-danger flex items-start gap-1.5 text-[11px]">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>No location configured. Chat features are limited.</span>
                </div>
              )}
            </div>

            <div className="text-nex-muted border-nex-border space-y-1.5 border-t pt-3 text-xs">
              <span className="text-nex-text mb-1 block font-semibold">Safety & Scope Bounds:</span>
              <p>• Cannot add or delete expenses.</p>
              <p>• Cannot modify members or calendar.</p>
              <p>• Queries are restricted to your mess.</p>
            </div>
          </div>

          {/* Suggestion Chips Box (Hidden if location is missing) */}
          {hasLocation && (
            <div className="nex-card hidden space-y-2 p-4 lg:block">
              <span className="text-nex-muted mb-1 block text-[11px] font-semibold tracking-wider uppercase">
                Quick Questions
              </span>
              <div className="flex flex-col gap-2">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestClick(s.text)}
                    disabled={loading}
                    className="bg-nex-elevated hover:bg-nex-hover border-nex-border text-nex-text group flex w-full cursor-pointer items-center justify-between rounded-xl border p-2.5 text-left text-xs transition-all duration-200"
                  >
                    <span className="truncate pr-2">{s.label}</span>
                    <ArrowRight className="text-nex-muted group-hover:text-nex-primary h-3 w-3 transition-all group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main Chat Panel */}
        <div className="nex-card flex h-full flex-col overflow-hidden lg:col-span-2">
          {/* Chat Header */}
          <div className="border-nex-border bg-nex-elevated/40 flex items-center justify-between border-b p-4">
            <div className="flex items-center gap-3">
              <div className="bg-nex-primary/10 border-nex-primary/20 flex h-9 w-9 items-center justify-center rounded-xl border">
                <Bot className="text-nex-primary h-5 w-5" />
              </div>
              <div>
                <h4 className="text-nex-text text-sm font-bold">NexMessAI Log</h4>
                <p className="text-nex-muted text-[10px]">
                  {hasLocation ? `Analyzing market at ${messLocation}` : 'Location unconfigured'}
                </p>
              </div>
            </div>
          </div>

          {/* Chat Messages Scrolling Area */}
          <div className="bg-nex-bg/20 flex-1 space-y-4 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center space-y-3 p-6 text-center">
                <Bot className="text-nex-muted/40 h-10 w-10 animate-bounce" />
                <div className="max-w-md">
                  <p className="text-nex-text text-sm font-semibold">No Assistant Messages yet</p>
                  <p className="text-nex-muted mt-1 text-xs leading-relaxed">
                    {hasLocation
                      ? 'Send a message or select a suggestion chip to start discussing grocery prices and budget reminders.'
                      : 'Configure a location in Mess Details Settings. The AI needs a location to crawl local grocery prices.'}
                  </p>
                </div>
              </div>
            ) : (
              messages.map((m) => {
                const isMe = m.sender_id === user?.id
                return (
                  <div
                    key={m.id}
                    className={`flex max-w-[85%] items-start gap-2.5 ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                  >
                    {/* Sender Avatar / Icon */}
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        m.is_ai
                          ? 'bg-gradient-to-br from-blue-400 to-blue-600 text-white'
                          : 'bg-nex-elevated text-nex-text border-nex-border border'
                      }`}
                    >
                      {m.is_ai ? (
                        <Bot className="h-4 w-4" />
                      ) : m.profiles?.username ? (
                        m.profiles.username.substring(0, 2).toUpperCase()
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                    </div>

                    {/* Message Bubble Container */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 px-1">
                        <span className="text-nex-text text-[10px] font-semibold">
                          {m.is_ai ? 'NexMessAI' : m.profiles?.username || 'Member'}
                        </span>
                        <span className="text-nex-muted text-[9px]">
                          {format(new Date(m.created_at), 'hh:mm a')}
                        </span>
                      </div>

                      <div
                        className={`rounded-2xl p-3.5 text-xs leading-relaxed whitespace-pre-wrap ${
                          m.is_daily_update
                            ? 'bg-nex-primary-light border-nex-primary/30 text-nex-text border shadow-sm'
                            : m.is_ai
                              ? 'bg-nex-surface border-nex-border text-nex-text border shadow-sm'
                              : 'bg-nex-primary text-white shadow-sm'
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  </div>
                )
              })
            )}

            {/* AI Typing Indicator */}
            {loading && (
              <div className="mr-auto flex max-w-[80%] animate-pulse items-start gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-xs font-semibold text-white">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <span className="text-nex-text px-1 text-[10px] font-semibold">NexMessAI</span>
                  <div className="bg-nex-surface border-nex-border flex min-w-[70px] items-center justify-center gap-1.5 rounded-2xl border p-3">
                    <Loader2 className="text-nex-primary h-4 w-4 animate-spin" />
                    <span className="text-nex-muted text-[10px] font-medium">Searching web...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input form */}
          <div className="border-nex-border bg-nex-elevated/40 border-t p-4">
            {/* Horizontal scrolling suggestions for mobile */}
            {hasLocation && (
              <div
                className="-mx-2 flex gap-2 overflow-x-auto px-2 pb-3 lg:hidden"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSuggestClick(s.text)}
                    disabled={loading}
                    className="bg-nex-elevated hover:bg-nex-hover border-nex-border text-nex-text shrink-0 rounded-full border px-3 py-1.5 text-[10px] whitespace-nowrap shadow-sm transition-all active:scale-95"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            {!hasLocation ? (
              <div className="bg-nex-danger/10 border-nex-danger/20 text-nex-danger rounded-xl border p-2.5 text-center text-xs font-medium">
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
                  className="nex-input flex-1 px-4 py-3 text-base"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !inputText.trim()}
                  className="nex-btn-primary flex shrink-0 items-center justify-center p-3 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
