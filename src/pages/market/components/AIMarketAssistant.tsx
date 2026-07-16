import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '../../../stores/authStore'
import { useMessStore } from '../../../stores/messStore'
import { supabase } from '../../../lib/supabase'
import {
  Send,
  Sparkles,
  MapPin,
  Bot,
  User,
  AlertCircle,
  Loader2,
  ArrowRight,
  TrendingDown,
  ShoppingCart,
  BarChart3,
  UtensilsCrossed,
  Clock,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { usePageTitle } from '../../../hooks/usePageTitle'
import MarkdownRenderer from '../../../components/MarkdownRenderer'

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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
      .order('created_at', { ascending: false })
      .limit(20)

    if (data) {
      const reversed = [...data].reverse()
      setMessages(reversed as Message[])
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
          // Debounce to avoid rapid re-fetches from sequential inserts
          if (debounceRef.current) clearTimeout(debounceRef.current)
          debounceRef.current = setTimeout(() => {
            fetchMessages()
          }, 300)
        }
      )
      .subscribe()

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
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

      // Insert user's message to database immediately so it shows up in real-time
      const { error: insertErr } = await supabase.from('market_chat_messages').insert({
        mess_id: currentMess.id,
        sender_id: user?.id || null,
        text: textToSend.trim(),
        is_ai: false,
      })
      if (insertErr) throw insertErr

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

      // Realtime subscription handles the message refresh via debounced fetchMessages
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
    {
      icon: BarChart3,
      label: 'Daily price report',
      text: 'Please generate a new daily price report for this area',
      color: 'text-blue-500',
    },
    {
      icon: TrendingDown,
      label: 'Best deals today?',
      text: 'Where can I find the cheapest place to buy eggs and chicken in this area today?',
      color: 'text-emerald-500',
    },
    {
      icon: ShoppingCart,
      label: 'Shopping list',
      text: "Create a detailed grocery shopping list for today's meals with quantities and estimated cost.",
      color: 'text-amber-500',
    },
    {
      icon: UtensilsCrossed,
      label: 'Budget check',
      text: 'Review our monthly spending so far and suggest how we can optimize our bazaar budget.',
      color: 'text-purple-500',
    },
  ]

  if (!currentMess) return null

  return (
    <div className="mx-auto flex h-[calc(100dvh-8rem)] w-full max-w-4xl flex-col md:h-[calc(100vh-6rem)]">
      <div className="mb-3 flex shrink-0 items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <div className="from-nex-primary/20 to-nex-primary/5 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br">
            <Sparkles className="text-nex-primary h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-nex-text text-xl font-bold sm:text-2xl">NexMessAI</h1>
            <p className="text-nex-muted text-[10px]">Smart bazaar assistant powered by Gemini</p>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Sidebar: Location Details & Guidelines */}
        <div className="hidden flex-col gap-4 lg:col-span-1 lg:flex">
          <div className="nex-card space-y-4 p-5">
            <h3 className="text-nex-text flex items-center gap-2 text-sm font-semibold tracking-wider uppercase">
              <Sparkles className="text-nex-primary h-4 w-4 animate-pulse" />
              Assistant Info
            </h3>
            <p className="text-nex-muted text-xs leading-relaxed">
              Your personal bazaar coordinator powered by Google Gemini. Gets live grocery prices,
              estimates quantities, and tracks your budget.
            </p>

            <div className="bg-nex-elevated space-y-2 rounded-xl p-4">
              <div className="text-nex-text flex items-center gap-2 text-xs font-semibold">
                <MapPin className="text-nex-primary h-4 w-4" />
                Location
              </div>
              {hasLocation ? (
                <p className="text-nex-success font-mono text-xs font-medium">{messLocation}</p>
              ) : (
                <div className="text-nex-danger flex items-start gap-1.5 text-[11px]">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>No location set. Set it in Settings → Mess Details.</span>
                </div>
              )}
            </div>

            <div className="text-nex-muted border-nex-border space-y-1.5 border-t pt-3 text-xs">
              <span className="text-nex-text mb-1 block font-semibold">What it can do:</span>
              <p>✅ Live grocery prices & deals</p>
              <p>✅ Shopping lists with quantities</p>
              <p>✅ Budget analysis & savings tips</p>
              <p className="text-nex-muted/60 mt-2 text-[10px]">
                ⚠️ Read-only — can't edit expenses or schedules
              </p>
            </div>
          </div>

          {/* Suggestion Chips Box (Hidden if location is missing) */}
          {hasLocation && (
            <div className="nex-card hidden space-y-2 p-4 lg:block">
              <span className="text-nex-muted mb-1 block text-[11px] font-semibold tracking-wider uppercase">
                Quick Actions
              </span>
              <div className="flex flex-col gap-2">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestClick(s.text)}
                    disabled={loading}
                    className="bg-nex-elevated hover:bg-nex-hover border-nex-border text-nex-text group flex w-full cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 text-left text-xs transition-all duration-200"
                  >
                    <s.icon className={`h-3.5 w-3.5 shrink-0 ${s.color}`} />
                    <span className="flex-1 truncate">{s.label}</span>
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
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 shadow-sm">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <h4 className="text-nex-text text-sm font-bold">NexMessAI</h4>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  <p className="text-nex-muted text-[10px]">
                    {hasLocation ? messLocation : 'Location unconfigured'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Messages Scrolling Area */}
          <div className="bg-nex-bg/20 flex-1 space-y-4 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                <div className="from-nex-primary/10 to-nex-primary/5 mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br">
                  <Bot className="text-nex-primary h-8 w-8" />
                </div>
                <p className="text-nex-text text-sm font-semibold">
                  {hasLocation ? "Hey! I'm NexMessAI 👋" : 'Location Required'}
                </p>
                <p className="text-nex-muted mt-1.5 max-w-sm text-xs leading-relaxed">
                  {hasLocation
                    ? "Ask me about today's grocery prices, create a shopping list, or check your budget. I'll search for live prices in your area!"
                    : 'Set your mess location in Settings → Mess Details so I can find local grocery prices for you.'}
                </p>

                {/* Quick action grid in empty state */}
                {hasLocation && (
                  <div className="mt-5 grid w-full max-w-sm grid-cols-2 gap-2">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => handleSuggestClick(s.text)}
                        disabled={loading}
                        className="bg-nex-surface hover:bg-nex-hover border-nex-border flex items-center gap-2 rounded-xl border p-3 text-left transition-all active:scale-[0.98]"
                      >
                        <s.icon className={`h-4 w-4 shrink-0 ${s.color}`} />
                        <span className="text-nex-text text-[11px] font-medium">{s.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="bg-nex-surface/40 border-nex-border/40 mb-4 flex items-center justify-center gap-2 rounded-xl border p-2.5 text-center">
                  <Clock className="text-nex-muted h-3.5 w-3.5" />
                  <span className="text-nex-muted text-[10px] font-medium">
                    Older messages are archived and cannot be accessed to optimize performance.
                  </span>
                </div>
                {messages.map((m) => {
                  const isMe = m.sender_id === user?.id
                  return (
                    <div
                      key={m.id}
                      className={`flex items-start gap-2.5 ${isMe ? 'ml-auto max-w-[80%] flex-row-reverse' : 'mr-auto max-w-[90%]'}`}
                    >
                      {/* Sender Avatar / Icon */}
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                          m.is_ai
                            ? 'bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-sm'
                            : 'bg-nex-elevated text-nex-text border-nex-border border'
                        }`}
                      >
                        {m.is_ai ? (
                          <Bot className="h-3.5 w-3.5" />
                        ) : m.profiles?.username ? (
                          m.profiles.username.substring(0, 2).toUpperCase()
                        ) : (
                          <User className="h-3.5 w-3.5" />
                        )}
                      </div>

                      {/* Message Bubble Container */}
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 px-1">
                          <span className="text-nex-text text-[10px] font-semibold">
                            {m.is_ai ? 'NexMessAI' : m.profiles?.username || 'Member'}
                          </span>
                          <span className="text-nex-muted text-[9px]">
                            {format(new Date(m.created_at), 'hh:mm a')}
                          </span>
                          {m.is_daily_update && (
                            <span className="bg-nex-primary/10 text-nex-primary rounded-full px-1.5 py-0.5 text-[8px] font-semibold">
                              Daily Report
                            </span>
                          )}
                        </div>

                        <div
                          className={`overflow-hidden rounded-2xl p-3.5 ${
                            m.is_daily_update
                              ? 'bg-nex-primary-light border-nex-primary/20 text-nex-text border shadow-sm'
                              : m.is_ai
                                ? 'bg-nex-surface border-nex-border text-nex-text border shadow-sm'
                                : 'bg-nex-primary text-white shadow-sm'
                          }`}
                        >
                          {m.is_ai ? (
                            <MarkdownRenderer text={m.text} />
                          ) : (
                            <p className="text-xs leading-relaxed whitespace-pre-wrap">{m.text}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </>
            )}

            {/* AI Typing Indicator */}
            {loading && (
              <div className="mr-auto flex max-w-[80%] items-start gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-sm">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-nex-text px-1 text-[10px] font-semibold">NexMessAI</span>
                  <div className="bg-nex-surface border-nex-border flex min-w-[140px] items-center gap-2 rounded-2xl border p-3.5 shadow-sm">
                    <Loader2 className="text-nex-primary h-4 w-4 animate-spin" />
                    <div className="space-y-1">
                      <span className="text-nex-text block text-[10px] font-medium">
                        Searching prices...
                      </span>
                      <span className="text-nex-muted block text-[9px]">
                        Analyzing live market data
                      </span>
                    </div>
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
                    className="bg-nex-elevated hover:bg-nex-hover border-nex-border text-nex-text flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] whitespace-nowrap shadow-sm transition-all active:scale-95"
                  >
                    <s.icon className={`h-3 w-3 ${s.color}`} />
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            {!hasLocation ? (
              <div className="bg-nex-danger/10 border-nex-danger/20 text-nex-danger flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Set a location in Settings → Mess Details to enable the AI assistant.
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
                  placeholder="Ask about prices, shopping lists, or budget..."
                  className="nex-input flex-1 px-4 py-3 text-sm"
                  disabled={loading}
                  id="ai-chat-input"
                />
                <button
                  type="submit"
                  disabled={loading || !inputText.trim()}
                  className="nex-btn-primary flex shrink-0 items-center justify-center rounded-xl p-3 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  id="ai-chat-send"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
