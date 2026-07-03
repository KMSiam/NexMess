import { useEffect, useState, useRef, useCallback } from 'react'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { Notification } from '../types/database'
import { Bell, CheckCheck, Trash2, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface NotificationBellProps {
  className?: string
}

export default function NotificationBell({ className }: NotificationBellProps) {
  const { user } = useAuthStore()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showPanel, setShowPanel] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setNotifications(data as Notification[])
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    fetchNotifications()

    // Real-time subscription
    const channel = supabase
      .channel('notifications-' + user.id)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchNotifications()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, fetchNotifications])

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowPanel(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
  }

  const markAllRead = async () => {
    if (!user?.id) return
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  const deleteNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const getIcon = (type: string) => {
    const icons: Record<string, string> = {
      bazaar_reminder: '🛒',
      join_request: '👤',
      join_approved: '✅',
      join_rejected: '❌',
      expense_added: '💰',
      balance_due: '⚠️',
      meal_reminder: '🍽️',
      deposit_verified: '💳',
      system: '🔔',
    }
    return icons[type] || '🔔'
  }

  return (
    <div className={`relative ${className || ''}`} ref={panelRef}>
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="rounded-btn text-nex-muted hover:bg-nex-hover relative p-2 transition-colors"
        id="notification-bell"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="bg-nex-danger absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {showPanel && (
        <div className="nex-card animate-slide-up absolute top-12 right-0 z-50 flex max-h-[70vh] w-80 flex-col overflow-hidden shadow-lg sm:w-96">
          {/* Header */}
          <div className="border-nex-border flex items-center justify-between border-b px-4 py-3">
            <h3 className="text-nex-text text-sm font-semibold">Notifications</h3>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-nex-primary flex items-center gap-1 text-xs hover:underline"
                >
                  <CheckCheck className="h-3 w-3" /> Mark all read
                </button>
              )}
              <button
                onClick={() => setShowPanel(false)}
                className="text-nex-muted hover:text-nex-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="divide-nex-border flex-1 divide-y overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="text-nex-muted/30 mx-auto mb-2 h-8 w-8" />
                <p className="text-nex-muted text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`hover:bg-nex-hover cursor-pointer px-4 py-3 transition-colors ${
                    !n.is_read ? 'bg-nex-primary-light' : ''
                  }`}
                  onClick={() => !n.is_read && markRead(n.id)}
                >
                  <div className="flex gap-3">
                    <span className="shrink-0 text-lg">{getIcon(n.type)}</span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm ${!n.is_read ? 'text-nex-text font-semibold' : 'text-nex-text'}`}
                      >
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-nex-muted mt-0.5 line-clamp-2 text-xs">{n.body}</p>
                      )}
                      <p className="text-nex-muted mt-1 text-[10px]">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteNotification(n.id)
                      }}
                      className="text-nex-muted/40 hover:text-nex-danger shrink-0 self-start transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
