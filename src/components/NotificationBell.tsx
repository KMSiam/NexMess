import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuthStore } from '../stores/authStore'
import { useMessStore } from '../stores/messStore'
import { supabase } from '../lib/supabase'
import type { Notification } from '../types/database'
import {
  ArrowUpRight,
  Bell,
  Check,
  CheckCheck,
  Settings,
  Trash2,
  X,
} from 'lucide-react'
import { formatNumber, formatLocalizedDistance } from '../lib/utils'
import {
  getNotificationVisualMeta,
  localizeNotification,
  resolveNotificationUrl,
} from '../lib/notifications'

interface NotificationBellProps {
  className?: string
}

export default function NotificationBell({ className }: NotificationBellProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { messes, currentMess, setCurrentMess } = useMessStore()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showPanel, setShowPanel] = useState(false)
  const [filterMode, setFilterMode] = useState<'all' | 'unread'>('all')
  const panelRef = useRef<HTMLDivElement>(null)
  const seenToastIdsRef = useRef<Set<string>>(new Set())

  const unreadCount = notifications.filter((n) => !n.is_read).length
  const visibleNotifications =
    filterMode === 'unread' ? notifications.filter((n) => !n.is_read) : notifications

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)
    if (data) {
      const list = data as Notification[]
      setNotifications(list)
      list.forEach((n) => seenToastIdsRef.current.add(n.id))
    }
  }, [user?.id])

  const markRead = useCallback(
    async (id: string) => {
      if (!user?.id) return
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
      await supabase.from('notifications').update({ is_read: true }).eq('id', id).eq('user_id', user.id)
    },
    [user?.id]
  )

  const handleNotificationOpen = useCallback(
    (notification: Notification) => {
      if (!notification.is_read) {
        void markRead(notification.id)
      }

      if (notification.mess_id) {
        const targetMess = messes.find((m) => m.id === notification.mess_id)
        if (targetMess && currentMess?.id !== targetMess.id) {
          setCurrentMess(targetMess)
        }
      }

      setShowPanel(false)
      navigate(resolveNotificationUrl(notification))
    },
    [markRead, messes, currentMess?.id, setCurrentMess, navigate]
  )

  const showLiveNotificationToast = useCallback(
    (notification: Notification) => {
      if (seenToastIdsRef.current.has(notification.id)) return
      seenToastIdsRef.current.add(notification.id)

      const meta = getNotificationVisualMeta(notification)
      const Icon = meta.icon
      const localized = localizeNotification(notification, t)

      toast.custom(
        (toastInstance) => (
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              toast.dismiss(toastInstance.id)
              handleNotificationOpen(notification)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                toast.dismiss(toastInstance.id)
                handleNotificationOpen(notification)
              }
            }}
            className={`bg-nex-surface border-nex-border hover:border-nex-primary/40 flex w-full max-w-sm cursor-pointer items-start gap-3 rounded-2xl border p-3.5 shadow-xl shadow-black/10 transition-all duration-200 dark:shadow-black/50 ${
              toastInstance.visible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
            }`}
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.bgClass}`}
            >
              <Icon className={`h-4.5 w-4.5 ${meta.textClass}`} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-nex-primary-ink text-[10px] font-semibold tracking-wide uppercase">
                  {t('notifications.liveBadge')}
                </span>
                <span className="text-nex-muted/50 text-[10px]">·</span>
                <span className="text-nex-muted truncate text-[10px] font-medium">
                  {t(meta.destinationKey)}
                </span>
              </div>
              <p className="text-nex-text mt-0.5 truncate text-sm font-semibold">
                {localized.title}
              </p>
              {localized.body && (
                <p className="text-nex-muted mt-0.5 line-clamp-2 text-xs leading-snug">
                  {localized.body}
                </p>
              )}
              <span className="text-nex-primary-ink mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold">
                {t('notifications.openPage')}
                <ArrowUpRight className="h-3 w-3" />
              </span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                toast.dismiss(toastInstance.id)
              }}
              aria-label={t('common.close')}
              className="text-nex-muted hover:text-nex-text hover:bg-nex-hover shrink-0 rounded-lg p-1 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ),
        { id: `notif-${notification.id}`, duration: 5500 }
      )
    },
    [t, handleNotificationOpen]
  )

  useEffect(() => {
    if (!user?.id) return
    void fetchNotifications()

    // Real-time subscription for new notifications, read-state updates, and deletions
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const incoming = payload.new as Notification
          setNotifications((prev) => {
            if (prev.some((n) => n.id === incoming.id)) return prev
            return [incoming, ...prev].slice(0, 30)
          })
          showLiveNotificationToast(incoming)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as Notification
          setNotifications((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const deletedId = (payload.old as { id?: string })?.id
          if (deletedId) {
            setNotifications((prev) => prev.filter((n) => n.id !== deletedId))
          }
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [user?.id, fetchNotifications, showLiveNotificationToast])

  // Sync read state immediately if a push click marks a notification read via AppInitializer
  useEffect(() => {
    const onExternalRead = (event: Event) => {
      const notifId = (event as CustomEvent<{ id?: string }>).detail?.id
      if (!notifId) return
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
      )
    }
    window.addEventListener('nexmess:notification-read', onExternalRead)
    return () => window.removeEventListener('nexmess:notification-read', onExternalRead)
  }, [])

  // Close on click outside or Escape
  useEffect(() => {
    if (!showPanel) return
    const handleOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowPanel(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowPanel(false)
    }
    document.addEventListener('mousedown', handleOutside)
    window.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      window.removeEventListener('keydown', handleKey)
    }
  }, [showPanel])

  const markAllRead = async () => {
    if (!user?.id || unreadCount === 0) return
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
  }

  const deleteNotification = async (id: string) => {
    if (!user?.id) return
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    await supabase.from('notifications').delete().eq('id', id).eq('user_id', user.id)
  }

  const clearAllNotifications = async () => {
    if (!user?.id || notifications.length === 0) return
    setNotifications([])
    await supabase.from('notifications').delete().eq('user_id', user.id)
  }

  return (
    <div className={`relative ${className || ''}`} ref={panelRef}>
      <button
        type="button"
        onClick={() => setShowPanel((prev) => !prev)}
        className={`rounded-btn relative flex h-9 w-9 cursor-pointer items-center justify-center transition-all active:scale-95 ${
          showPanel
            ? 'bg-nex-primary-light text-nex-primary-ink'
            : 'text-nex-muted hover:bg-nex-hover hover:text-nex-text'
        }`}
        id="notification-bell"
        aria-label={t('notifications.title')}
        aria-expanded={showPanel}
        aria-haspopup="dialog"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="bg-nex-danger ring-nex-surface absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ring-2">
            {formatNumber(unreadCount > 9 ? '9+' : unreadCount)}
          </span>
        )}
      </button>

      {/* Animated Notification Center Panel */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            role="dialog"
            aria-label={t('notifications.title')}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="bg-nex-surface border-nex-border fixed top-16 right-3 left-3 z-50 flex max-h-[75vh] flex-col overflow-hidden rounded-2xl border shadow-xl shadow-black/10 sm:absolute sm:top-12 sm:right-0 sm:left-auto sm:w-[400px] dark:border-[#2c2b2e] dark:shadow-black/50"
          >
            {/* Header */}
            <div className="border-nex-border bg-nex-surface/95 border-b px-4 pt-3.5 pb-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-nex-text text-sm font-bold">{t('notifications.title')}</h3>
                  {unreadCount > 0 && (
                    <span className="bg-nex-primary-light text-nex-primary-ink rounded-full px-2 py-0.5 text-[11px] font-semibold">
                      {t('notifications.unreadCount', { count: formatNumber(unreadCount) })}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllRead}
                      className="text-nex-primary-ink hover:bg-nex-primary-light flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      <span>{t('notifications.markAll')}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPanel(false)}
                    className="text-nex-muted hover:text-nex-text hover:bg-nex-hover cursor-pointer rounded-lg p-1.5 transition-colors"
                    aria-label={t('common.close', { defaultValue: 'Close' })}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {notifications.length > 0 && (
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <div className="bg-nex-elevated border-nex-border/60 inline-flex rounded-lg border p-0.5">
                    <button
                      type="button"
                      onClick={() => setFilterMode('all')}
                      className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                        filterMode === 'all'
                          ? 'bg-nex-surface text-nex-text shadow-2xs'
                          : 'text-nex-muted hover:text-nex-text'
                      }`}
                    >
                      {t('notifications.filterAll')} ({formatNumber(notifications.length)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterMode('unread')}
                      className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                        filterMode === 'unread'
                          ? 'bg-nex-surface text-nex-text shadow-2xs'
                          : 'text-nex-muted hover:text-nex-text'
                      }`}
                    >
                      {t('notifications.filterUnread')} ({formatNumber(unreadCount)})
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={clearAllNotifications}
                    className="text-nex-muted hover:text-nex-danger cursor-pointer rounded-md px-2 py-1 text-[11px] font-medium transition-colors"
                  >
                    {t('notifications.clear')}
                  </button>
                </div>
              )}
            </div>

            {/* Notification List */}
            <div className="divide-nex-border/70 flex-1 divide-y overflow-y-auto">
              {visibleNotifications.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <div className="bg-nex-elevated mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl">
                    <Bell className="text-nex-muted/60 h-5 w-5" />
                  </div>
                  <p className="text-nex-text text-sm font-semibold">
                    {filterMode === 'unread'
                      ? t('notifications.emptyUnread')
                      : t('notifications.empty')}
                  </p>
                  <p className="text-nex-muted mt-1 text-xs">
                    {filterMode === 'unread'
                      ? t('notifications.emptyUnreadDesc')
                      : t('notifications.emptyDesc')}
                  </p>
                </div>
              ) : (
                visibleNotifications.map((n) => {
                  const meta = getNotificationVisualMeta(n)
                  const Icon = meta.icon
                  const localized = localizeNotification(n, t)
                  const messName =
                    messes.length > 1 && n.mess_id
                      ? messes.find((m) => m.id === n.mess_id)?.name
                      : null

                  return (
                    <div
                      key={n.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleNotificationOpen(n)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleNotificationOpen(n)
                        }
                      }}
                      className={`group relative cursor-pointer px-4 py-3.5 transition-colors focus:outline-none ${
                        !n.is_read
                          ? 'bg-nex-primary-light/55 hover:bg-nex-primary-light/85'
                          : 'hover:bg-nex-hover/70'
                      }`}
                    >
                      {!n.is_read && (
                        <span
                          className="bg-nex-primary absolute inset-y-2 left-0 w-1 rounded-r-full"
                          aria-hidden="true"
                        />
                      )}

                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.bgClass}`}
                        >
                          <Icon className={`h-4 w-4 ${meta.textClass}`} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={`text-sm leading-snug ${
                                !n.is_read ? 'text-nex-text font-semibold' : 'text-nex-text font-medium'
                              }`}
                            >
                              {localized.title}
                            </p>
                            {!n.is_read && (
                              <span
                                className="bg-nex-primary mt-1.5 h-2 w-2 shrink-0 rounded-full"
                                aria-hidden="true"
                              />
                            )}
                          </div>

                          {localized.body && (
                            <p className="text-nex-muted mt-1 line-clamp-2 text-xs leading-relaxed">
                              {localized.body}
                            </p>
                          )}

                          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                            <span className="text-nex-muted">
                              {formatLocalizedDistance(n.created_at)}
                            </span>
                            {messName && (
                              <>
                                <span className="text-nex-muted/40">·</span>
                                <span className="bg-nex-elevated text-nex-text max-w-[110px] truncate rounded px-1.5 py-0.5 font-medium">
                                  {messName}
                                </span>
                              </>
                            )}
                            <span className="text-nex-muted/40">·</span>
                            <span className="text-nex-primary-ink inline-flex items-center gap-0.5 font-semibold">
                              <span>{t(meta.destinationKey)}</span>
                              <ArrowUpRight className="h-2.5 w-2.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                            </span>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-0.5">
                          {!n.is_read && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                void markRead(n.id)
                              }}
                              title={t('notifications.markRead')}
                              aria-label={t('notifications.markRead')}
                              className="text-nex-muted hover:text-nex-primary-ink hover:bg-nex-surface cursor-pointer rounded-lg p-1.5 opacity-80 transition-colors sm:opacity-0 sm:group-hover:opacity-100"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              void deleteNotification(n.id)
                            }}
                            title={t('common.delete')}
                            aria-label={t('common.delete')}
                            className="text-nex-muted/70 hover:text-nex-danger hover:bg-nex-surface cursor-pointer rounded-lg p-1.5 transition-colors sm:opacity-0 sm:group-hover:opacity-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer */}
            <div className="border-nex-border bg-nex-elevated/55 flex items-center justify-between border-t px-4 py-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowPanel(false)
                  navigate('/settings?tab=notifications')
                }}
                className="text-nex-muted hover:text-nex-primary-ink inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium transition-colors"
              >
                <Settings className="h-3.5 w-3.5" />
                <span>{t('notifications.manageSettings')}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
