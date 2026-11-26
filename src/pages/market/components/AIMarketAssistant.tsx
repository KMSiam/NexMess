import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../../stores/authStore'
import { useMessStore } from '../../../stores/messStore'
import { supabase } from '../../../lib/supabase'
import {
  Send,
  Sparkles,
  MapPin,
  User,
  AlertCircle,
  Loader2,
  ArrowRight,
  TrendingDown,
  ShoppingCart,
  BarChart3,
  UtensilsCrossed,
  Clock,
  CheckCircle2,
  Info,
  X,
  Copy,
  Check,
  ShieldAlert,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { usePageTitle } from '../../../hooks/usePageTitle'
import MarkdownRenderer from '../../../components/MarkdownRenderer'
import { sanitizeAppError } from '../../../lib/errorHandler'
import { formatLocalizedDate, getInitials, isSafeHttpUrl } from '../../../lib/utils'

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
  const { t, i18n } = useTranslation()
  const isBangla = (i18n.language || 'en').startsWith('bn')
  usePageTitle(t('nav.nexmessAi'))
  const { session, user, profile } = useAuthStore()
  const { currentMess } = useMessStore()

  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [showMobileInfo, setShowMobileInfo] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const chatContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hasLocation = !!currentMess?.location?.trim()
  const messLocation = currentMess?.location?.trim() || ''

  // Scroll inner message container smoothly without scrolling parent document window
  useEffect(() => {
    const container = chatContainerRef.current
    if (!container) return
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  // Auto-resize composer textarea cleanly (1-4 lines)
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 112)}px`
  }, [inputText])

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
      setMessages([...data].reverse() as Message[])
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

    const userMessageText = textToSend.trim()
    setInputText('')

    const tempId = `temp-${crypto.randomUUID()}`
    const optimisticUserMessage: Message = {
      id: tempId,
      text: userMessageText,
      is_ai: false,
      is_daily_update: false,
      created_at: new Date().toISOString(),
      sender_id: user?.id || null,
      profiles: {
        username: profile?.username || 'Member',
        avatar_url: profile?.avatar_url || null,
      },
    }
    setMessages((prev) => [...prev, optimisticUserMessage])
    setLoading(true)

    try {
      const chatHistory = messages.slice(-6).map((m) => ({ text: m.text, is_ai: m.is_ai }))

      const { error: insertErr } = await supabase.from('market_chat_messages').insert({
        mess_id: currentMess.id,
        sender_id: user?.id || null,
        text: userMessageText,
        is_ai: false,
      })
      if (insertErr) throw insertErr

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
          message: userMessageText,
          action: 'chat',
          history: chatHistory,
          date_str: format(new Date(), 'yyyy-MM-dd'),
        }),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Failed to get response from assistant.')
      }
    } catch (error: unknown) {
      toast.error(sanitizeAppError(error, 'Error communicating with AI assistant.'))
      console.error(error)
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2000)
    } catch {
      toast.error(isBangla ? 'কপি করা যায়নি' : 'Could not copy message')
    }
  }

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend(inputText)
    }
  }

  const suggestions = [
    {
      icon: BarChart3,
      label: isBangla ? 'দৈনিক বাজার দর' : 'Daily price report',
      text: isBangla
        ? 'এই এলাকার জন্য আজকের নিত্যপ্রয়োজনীয় পণ্যের বাজার দর রিপোর্ট তৈরি করুন'
        : 'Please generate a new daily price report for this area',
      chipClass: 'text-blue-600 bg-blue-500/10 dark:text-blue-400',
    },
    {
      icon: TrendingDown,
      label: isBangla ? 'সেরা ডিল কোথায়?' : 'Best deals today?',
      text: isBangla
        ? 'আজকে এই এলাকার কোন বাজারে ডিম ও ব্রয়লার মুরগির দাম সবচেয়ে কম?'
        : 'Where can I find the cheapest place to buy eggs and chicken in this area today?',
      chipClass: 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-400',
    },
    {
      icon: ShoppingCart,
      label: isBangla ? 'বাজারের ফর্দ' : 'Shopping list',
      text: isBangla
        ? 'আজকের মিলের জন্য প্রয়োজনীয় উপাদান, পরিমাণ ও আনুমানিক খরচ সহ বাজারের ফর্দ বানিয়ে দিন।'
        : "Create a detailed grocery shopping list for today's meals with quantities and estimated cost.",
      chipClass: 'text-amber-600 bg-amber-500/10 dark:text-amber-400',
    },
    {
      icon: UtensilsCrossed,
      label: isBangla ? 'বাজেট বিশ্লেষণ' : 'Budget check',
      text: isBangla
        ? 'চলতি মাসে আমাদের মেসের বাজার খরচ বিশ্লেষণ করুন এবং খরচ কমানোর পরামর্শ দিন।'
        : 'Review our monthly spending so far and suggest how we can optimize our bazaar budget.',
      chipClass: 'text-purple-600 bg-purple-500/10 dark:text-purple-400',
    },
  ]

  const capabilities = isBangla
    ? ['এলাকাভিত্তিক বাজার দর ও সাশ্রয়', 'পরিমাণসহ বাজারের ফর্দ', 'বাজেট বিশ্লেষণ ও টিপস']
    : ['Local grocery prices & deals', 'Shopping lists with quantities', 'Budget analysis & savings tips']

  if (!currentMess) return null

  return (
    <div className="-mx-4 -mt-4 -mb-8 flex h-[calc(100dvh-8rem-env(safe-area-inset-bottom,0px))] min-h-[380px] flex-col md:mx-auto md:my-0 md:h-[calc(100dvh-7rem)] md:min-h-[480px] md:w-full md:max-w-6xl">
      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)] gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* Desktop Sidebar: Info & Quick Actions */}
        <aside className="hidden min-h-0 flex-col gap-3.5 overflow-y-auto pr-0.5 lg:flex">
          <div className="nex-card shrink-0 space-y-3.5 p-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#2F4B39] via-[#3A5643] to-emerald-600 text-white shadow-xs">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-nex-text text-sm font-bold">{t('nav.nexmessAi')}</h2>
                <p className="text-nex-muted truncate text-[11px]">
                  {isBangla ? 'স্মার্ট বাজার সহকারী (Gemini)' : 'Smart bazaar assistant'}
                </p>
              </div>
            </div>

            <div className="bg-nex-elevated/80 border-nex-border/70 space-y-1.5 rounded-xl border p-3">
              <div className="text-nex-text flex items-center justify-between gap-2 text-xs font-semibold">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="text-nex-primary h-3.5 w-3.5 dark:text-emerald-400" />
                  {isBangla ? 'মেসের অবস্থান' : 'Mess Location'}
                </span>
                {!hasLocation && (
                  <Link
                    to="/settings"
                    className="text-nex-primary text-[11px] font-semibold hover:underline"
                  >
                    {isBangla ? 'সেট করুন' : 'Set now'}
                  </Link>
                )}
              </div>
              {hasLocation ? (
                <p className="text-nex-primary text-xs leading-snug font-medium dark:text-emerald-400">
                  {messLocation}
                </p>
              ) : (
                <p className="text-nex-danger text-[11px] leading-snug">
                  {isBangla
                    ? 'লোকেশন সেট করা নেই। সেটিংস → মেস তথ্য থেকে যোগ করুন।'
                    : 'No location set. Add it in Settings → Mess Info.'}
                </p>
              )}
            </div>

            <div className="border-nex-border space-y-2 border-t pt-3">
              <span className="text-nex-text block text-[11px] font-semibold tracking-wider uppercase">
                {isBangla ? 'যা যা করতে পারে' : 'Capabilities'}
              </span>
              <ul className="space-y-1.5">
                {capabilities.map((cap) => (
                  <li key={cap} className="text-nex-muted flex items-center gap-2 text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    <span>{cap}</span>
                  </li>
                ))}
              </ul>
              <p className="text-nex-muted/80 flex items-center gap-1.5 pt-1 text-[11px]">
                <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                <span>
                  {isBangla
                    ? 'শুধুমাত্র তথ্য দেয় — হিসাব পরিবর্তন করে না'
                    : 'Read-only — never edits mess records'}
                </span>
              </p>
            </div>
          </div>

          {hasLocation && (
            <div className="nex-card shrink-0 space-y-2 p-4">
              <span className="text-nex-muted block text-[11px] font-semibold tracking-wider uppercase">
                {isBangla ? 'দ্রুত প্রশ্ন' : 'Quick Prompts'}
              </span>
              <div className="flex flex-col gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => void handleSend(s.text)}
                    disabled={loading}
                    className="bg-nex-elevated/70 hover:bg-nex-hover border-nex-border/80 text-nex-text group flex w-full cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-xs font-medium transition-all disabled:opacity-50"
                  >
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${s.chipClass}`}>
                      <s.icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="flex-1 truncate">{s.label}</span>
                    <ArrowRight className="text-nex-muted group-hover:text-nex-primary h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Main Chat Workspace (edge-to-edge on mobile, crisp card on md+) */}
        <section className="bg-nex-bg md:bg-nex-surface md:border-nex-border md:rounded-card md:shadow-card flex h-full min-h-0 flex-col overflow-hidden md:border">
          {/* Unified Compact Chat Header */}
          <header className="border-nex-border/80 bg-nex-surface/95 flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2.5 backdrop-blur-sm sm:px-5 sm:py-3">
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#2F4B39] via-[#3A5643] to-emerald-600 text-white shadow-xs">
                <Sparkles className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-nex-text truncate text-sm font-bold sm:text-base">
                    {t('nav.nexmessAi')}
                  </h1>
                  <span className="bg-nex-primary-light text-nex-primary hidden rounded-full px-2 py-0.5 text-[10px] font-semibold sm:inline-flex dark:text-emerald-400">
                    Gemini
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                      hasLocation ? 'animate-pulse bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  <p className="text-nex-muted truncate text-[11px]">
                    {hasLocation ? messLocation : t('market.ai.unconfigured')}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowMobileInfo((prev) => !prev)}
              className="border-nex-border bg-nex-elevated/80 hover:bg-nex-hover text-nex-muted hover:text-nex-text flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border transition-colors lg:hidden"
              aria-label={isBangla ? 'সহকারীর তথ্য' : 'Assistant info'}
              aria-expanded={showMobileInfo}
            >
              {showMobileInfo ? <X className="h-4 w-4" /> : <Info className="h-4 w-4" />}
            </button>
          </header>

          {/* Expandable Mobile/Tablet Info Sheet */}
          {showMobileInfo && (
            <div className="border-nex-border bg-nex-surface space-y-2.5 border-b px-4 py-3 text-xs lg:hidden">
              <div className="flex items-center justify-between gap-2">
                <span className="text-nex-text inline-flex items-center gap-1.5 font-semibold">
                  <MapPin className="text-nex-primary h-3.5 w-3.5 dark:text-emerald-400" />
                  {hasLocation ? messLocation : t('market.ai.unconfigured')}
                </span>
                {!hasLocation && (
                  <Link to="/settings" className="text-nex-primary font-semibold hover:underline">
                    {isBangla ? 'সেট করুন' : 'Set location'}
                  </Link>
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {capabilities.map((cap) => (
                  <span key={cap} className="text-nex-muted inline-flex items-center gap-1 text-[11px]">
                    <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
                    {cap}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Messages Scroll Area */}
          <div
            ref={chatContainerRef}
            className="bg-nex-bg/45 dark:bg-nex-bg/60 min-h-0 flex-1 space-y-4 overflow-y-auto px-3.5 py-4 sm:px-5"
          >
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-2 py-6 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2F4B39]/15 to-emerald-500/15 ring-1 ring-emerald-500/20">
                  <Sparkles className="text-nex-primary h-7 w-7 dark:text-emerald-400" />
                </div>
                <h2 className="text-nex-text text-base font-bold sm:text-lg">
                  {hasLocation
                    ? isBangla
                      ? 'হ্যালো! আমি নেক্সমেসএআই 👋'
                      : "Hey! I'm NexMessAI 👋"
                    : isBangla
                      ? 'মেসের লোকেশন প্রয়োজন'
                      : 'Location Required'}
                </h2>
                <p className="text-nex-muted mt-1.5 max-w-sm text-xs leading-relaxed sm:text-sm">
                  {hasLocation
                    ? isBangla
                      ? 'আজকের বাজার দর, ফর্দ তৈরি অথবা মেস খরচের বাজেট যাচাই করতে যে কোনো প্রশ্ন করুন।'
                      : "Ask me about today's grocery prices, build a shopping list, or review your mess budget."
                    : isBangla
                      ? 'আপনার এলাকার বাজার দর দেখতে সেটিংস → মেস তথ্য থেকে অবস্থান যোগ করুন।'
                      : 'Set your mess location in Settings → Mess Info to unlock local market insights.'}
                </p>

                {hasLocation && (
                  <div className="mt-5 grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-2">
                    {suggestions.map((s) => (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => void handleSend(s.text)}
                        disabled={loading}
                        className="bg-nex-surface hover:bg-nex-hover border-nex-border flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 text-left shadow-2xs transition-all active:scale-[0.98] disabled:opacity-50"
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${s.chipClass}`}
                        >
                          <s.icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="text-nex-text text-xs font-semibold">{s.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="flex justify-center">
                  <span className="bg-nex-surface/85 border-nex-border/80 text-nex-muted inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-medium">
                    <Clock className="h-3 w-3 shrink-0" />
                    <span>{t('market.ai.archivedNote')}</span>
                  </span>
                </div>

                {messages.map((m) => {
                  const isMe = m.sender_id === user?.id
                  const senderName = m.is_ai
                    ? t('nav.nexmessAi')
                    : m.profiles?.username || t('common.member')
                  const senderAvatar = m.profiles?.avatar_url

                  return (
                    <div
                      key={m.id}
                      className={`flex items-end gap-2 sm:items-start sm:gap-2.5 ${
                        isMe
                          ? 'ml-auto max-w-[88%] flex-row-reverse sm:max-w-[78%]'
                          : 'mr-auto max-w-[96%] sm:max-w-[86%]'
                      }`}
                    >
                      {/* Compact Avatar (hidden for own messages on mobile for extra bubble width) */}
                      <div
                        className={`h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full text-[10px] font-semibold ${
                          m.is_ai
                            ? 'hidden bg-gradient-to-br from-[#2F4B39] via-[#3A5643] to-emerald-600 text-white shadow-xs sm:flex'
                            : isMe
                              ? 'bg-nex-elevated text-nex-text border-nex-border hidden border sm:flex'
                              : 'bg-nex-elevated text-nex-text border-nex-border flex border'
                        }`}
                      >
                        {m.is_ai ? (
                          <Sparkles className="h-3.5 w-3.5" />
                        ) : senderAvatar && isSafeHttpUrl(senderAvatar) ? (
                          <img src={senderAvatar} alt="" className="h-full w-full object-cover" />
                        ) : senderName ? (
                          getInitials(senderName)
                        ) : (
                          <User className="h-3.5 w-3.5" />
                        )}
                      </div>

                      {/* Message Column */}
                      <div
                        className={`min-w-0 space-y-1 ${
                          isMe ? 'flex flex-col items-end' : 'w-fit max-w-full'
                        }`}
                      >
                        <div
                          className={`flex items-center gap-2 px-1 ${
                            isMe ? 'flex-row-reverse' : 'justify-between'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            {m.is_ai && (
                              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-[#2F4B39] to-emerald-600 text-white sm:hidden">
                                <Sparkles className="h-2.5 w-2.5" />
                              </span>
                            )}
                            <span className="text-nex-text text-[11px] font-semibold">
                              {senderName}
                            </span>
                            <span className="text-nex-muted text-[10px]">
                              {formatLocalizedDate(m.created_at, 'hh:mm a')}
                            </span>
                            {m.is_daily_update && (
                              <span className="rounded-full bg-emerald-500/12 px-2 py-0.5 text-[9px] font-semibold text-emerald-700 dark:text-emerald-300">
                                {t('market.ai.dailyReport')}
                              </span>
                            )}
                          </div>

                          {m.is_ai && (
                            <button
                              type="button"
                              onClick={() => void handleCopy(m.id, m.text)}
                              className="text-nex-muted hover:text-nex-text hover:bg-nex-hover inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] transition-colors"
                              aria-label={isBangla ? 'কপি করুন' : 'Copy response'}
                            >
                              {copiedId === m.id ? (
                                <>
                                  <Check className="h-3 w-3 text-emerald-500" />
                                  <span className="text-emerald-600 dark:text-emerald-400">
                                    {t('common.copied')}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" />
                                  <span className="hidden sm:inline">
                                    {isBangla ? 'কপি' : 'Copy'}
                                  </span>
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        <div
                          className={`w-fit max-w-full overflow-hidden rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 ${
                            m.is_daily_update
                              ? 'bg-nex-surface border-nex-border border-l-nex-primary border border-l-4 shadow-xs'
                              : m.is_ai
                                ? 'bg-nex-surface border-nex-border rounded-tl-sm border shadow-xs'
                                : 'rounded-br-sm bg-gradient-to-br from-[#355340] to-[#4A6D56] text-white shadow-sm'
                          }`}
                        >
                          {m.is_ai ? (
                            <MarkdownRenderer text={m.text} />
                          ) : (
                            <p className="text-[13px] leading-relaxed break-words whitespace-pre-wrap text-white">
                              {m.text}
                            </p>
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
              <div className="mr-auto flex max-w-[85%] items-start gap-2.5">
                <div className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2F4B39] via-[#3A5643] to-emerald-600 text-white shadow-xs sm:flex">
                  <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <span className="text-nex-text px-1 text-[11px] font-semibold">
                    {t('nav.nexmessAi')}
                  </span>
                  <div className="bg-nex-surface border-nex-border flex items-center gap-2.5 rounded-2xl rounded-tl-sm border px-4 py-3 shadow-xs">
                    <Loader2 className="text-nex-primary h-4 w-4 animate-spin dark:text-emerald-400" />
                    <div>
                      <span className="text-nex-text block text-xs font-medium">
                        {t('market.ai.searching')}
                      </span>
                      <span className="text-nex-muted block text-[10px]">
                        {t('market.ai.analyzing')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="h-1 shrink-0" />
          </div>

          {/* Bottom Composer Area */}
          <div className="border-nex-border/80 bg-nex-surface/95 shrink-0 border-t px-3 pt-2.5 pb-3 sm:px-4 sm:py-3">
            {/* Mobile/Tablet Quick Action Chips (only when chat already has messages) */}
            {hasLocation && messages.length > 0 && (
              <div className="scrollbar-none -mx-1 mb-2.5 flex gap-1.5 overflow-x-auto px-1 lg:hidden">
                {suggestions.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => void handleSend(s.text)}
                    disabled={loading}
                    className="bg-nex-elevated/85 hover:bg-nex-hover border-nex-border/80 text-nex-text inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition-transform active:scale-95 disabled:opacity-50"
                  >
                    <s.icon
                      className={`h-3 w-3 shrink-0 ${s.chipClass.split(' ').find((c) => c.startsWith('text-')) || ''}`}
                    />
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            )}

            {!hasLocation ? (
              <Link
                to="/settings"
                className="bg-nex-danger-light border-nex-danger/25 text-nex-danger flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-medium transition-opacity hover:opacity-90"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>
                  {isBangla
                    ? 'এআই সহকারী ব্যবহার করতে সেটিংস → মেস তথ্য থেকে অবস্থান যোগ করুন।'
                    : 'Set a mess location in Settings → Mess Info to enable AI chat.'}
                </span>
              </Link>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  void handleSend(inputText)
                }}
                className="border-nex-border bg-nex-bg/65 focus-within:border-nex-primary focus-within:ring-nex-primary/15 flex items-end gap-2 rounded-2xl border px-3 py-2 transition-all focus-within:ring-2 dark:bg-nex-elevated/70"
              >
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  placeholder={
                    isBangla
                      ? 'বাজার দর, ফর্দ বা বাজেট নিয়ে জিজ্ঞাসা করুন...'
                      : 'Ask about prices, lists, or budget...'
                  }
                  className="text-nex-text placeholder:text-nex-muted max-h-28 min-h-[24px] flex-1 resize-none bg-transparent py-1 text-base leading-snug focus:outline-none sm:text-sm"
                  disabled={loading}
                  id="ai-chat-input"
                />
                <button
                  type="submit"
                  disabled={loading || !inputText.trim()}
                  aria-label={t('chat.send', { defaultValue: 'Send message' })}
                  className="nex-btn-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-xl p-0 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
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
        </section>
      </div>
    </div>
  )
}
