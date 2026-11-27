import { supabase } from './supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    Boolean(VAPID_PUBLIC_KEY)
  )
}

export async function getPushPermission(): Promise<NotificationPermission> {
  return Notification.permission
}

export async function subscribeToPush(userId: string): Promise<boolean> {
  if (!isPushSupported() || !VAPID_PUBLIC_KEY) return false

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return false

    const reg = await navigator.serviceWorker.ready
    const existing = await reg.pushManager.getSubscription()
    if (existing) await existing.unsubscribe()

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    })

    const { endpoint, keys } = subscription.toJSON() as {
      endpoint: string
      keys: { p256dh: string; auth: string }
    }

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,endpoint' }
    )

    if (error) {
      console.error('Failed to save push subscription to DB:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('Push subscription failed:', err)
    return false
  }
}

export async function unsubscribeFromPush(userId: string): Promise<boolean> {
  try {
    const reg = await navigator.serviceWorker.ready
    const subscription = await reg.pushManager.getSubscription()
    if (subscription) {
      const endpoint = subscription.endpoint
      await subscription.unsubscribe()
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', endpoint)
      if (error) {
        console.error('Failed to delete push subscription from DB:', error)
        return false
      }
    }
    return true
  } catch (err) {
    console.error('Failed to unsubscribe from push:', err)
    return false
  }
}

export async function isSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    return Boolean(sub) && Notification.permission === 'granted'
  } catch {
    return false
  }
}

export interface SendPushOptions {
  messId?: string | null
  notificationId?: string | null
  type?: string
}

export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  url = '/dashboard',
  options: SendPushOptions = {}
): Promise<{ sent: number; total?: number; skipped?: string }> {
  const { data, error } = await supabase.functions.invoke('send-push', {
    body: {
      user_id: userId,
      title,
      body,
      url,
      mess_id: options.messId ?? null,
      notification_id: options.notificationId ?? null,
      type: options.type ?? 'system',
    },
  })
  if (error) {
    console.error('sendPushToUser failed:', error)
    if (error.context) {
      const bodyText = await error.context.text()
      console.error('sendPushToUser error body:', bodyText)
      let parsedMessage: string | null = null
      try {
        const parsed = JSON.parse(bodyText) as { error?: string }
        if (parsed.error) parsedMessage = parsed.error
      } catch {
        // Ignore JSON parse failure and fall back to raw body text
      }
      throw new Error(parsedMessage || bodyText || error.message)
    }
    throw error
  }
  return (data as { sent: number; total?: number; skipped?: string }) ?? { sent: 0 }
}

// Send push to multiple users
export async function sendPushToUsers(
  userIds: string[],
  title: string,
  body: string,
  url = '/dashboard',
  options: SendPushOptions = {}
): Promise<void> {
  await Promise.allSettled(userIds.map((uid) => sendPushToUser(uid, title, body, url, options)))
}
