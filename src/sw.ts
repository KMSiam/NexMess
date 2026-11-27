/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope

cleanupOutdatedCaches()
// vite-plugin-pwa injects the precache manifest at build time
const manifest = (self as unknown as { __WB_MANIFEST: { url: string; revision: string | null }[] })
  .__WB_MANIFEST
if (manifest) {
  precacheAndRoute(manifest)
}

interface PushNotificationPayload {
  title?: string
  body?: string
  url?: string
  messId?: string | null
  notificationId?: string | null
  type?: string
}

interface NotificationClickData {
  url?: string
  messId?: string | null
  notificationId?: string | null
  type?: string
}

const TRUSTED_ORIGINS = new Set([
  self.location.origin,
  'https://www.nexmess.shop',
  'https://nexmess.shop',
])

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function resolveSafeSwUrl(rawUrl?: string | null): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '/dashboard'
  const trimmed = rawUrl.trim()
  if (/^\/(?!\/)/.test(trimmed)) return trimmed.slice(0, 300)
  try {
    const parsed = new URL(trimmed)
    if (TRUSTED_ORIGINS.has(parsed.origin)) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`.slice(0, 300) || '/dashboard'
    }
  } catch {
    // Fallback to safe route below
  }
  return '/dashboard'
}

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload: PushNotificationPayload
  try {
    payload = event.data.json() as PushNotificationPayload
  } catch {
    const fallbackText = event.data.text()
    payload = { title: 'NexMess', body: fallbackText }
  }

  const title = (payload.title || 'NexMess').trim() || 'NexMess'
  const safeUrl = resolveSafeSwUrl(payload.url)
  const notificationId =
    typeof payload.notificationId === 'string' && UUID_RE.test(payload.notificationId)
      ? payload.notificationId
      : null
  const messId =
    typeof payload.messId === 'string' && UUID_RE.test(payload.messId) ? payload.messId : null
  const type = typeof payload.type === 'string' ? payload.type : 'system'

  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: notificationId ? `nexmess-notif-${notificationId}` : `nexmess-${type}-${Date.now()}`,
      data: {
        url: safeUrl,
        messId,
        notificationId,
        type,
      } satisfies NotificationClickData,
    })
  )
})

async function notifyExistingClient(
  client: WindowClient,
  targetPath: string,
  messId: string | null,
  notificationId: string | null
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    let settled = false
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        resolve(false)
      }
    }, 180)

    try {
      const channel = new MessageChannel()
      channel.port1.onmessage = (msgEvent) => {
        if (!settled && msgEvent.data?.ack) {
          settled = true
          clearTimeout(timer)
          resolve(true)
        }
      }
      client.postMessage(
        {
          type: 'NEXMESS_NOTIFICATION_CLICK',
          url: targetPath,
          messId,
          notificationId,
        },
        [channel.port2]
      )
    } catch {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        resolve(false)
      }
    }
  })
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const rawData = (event.notification.data ?? {}) as NotificationClickData
  const targetPath = resolveSafeSwUrl(rawData.url)
  const messId =
    typeof rawData.messId === 'string' && UUID_RE.test(rawData.messId) ? rawData.messId : null
  const notificationId =
    typeof rawData.notificationId === 'string' && UUID_RE.test(rawData.notificationId)
      ? rawData.notificationId
      : null

  const targetUrlObj = new URL(targetPath, self.location.origin)
  if (messId && !targetUrlObj.searchParams.has('mess')) {
    targetUrlObj.searchParams.set('mess', messId)
  }
  if (notificationId && !targetUrlObj.searchParams.has('notif')) {
    targetUrlObj.searchParams.set('notif', notificationId)
  }
  const fullTargetUrl = targetUrlObj.href

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const sameOriginClients = clientList.filter((c) => c.url.startsWith(self.location.origin))
      const existing =
        sameOriginClients.find((c) => c.focused) ||
        sameOriginClients.find((c) => c.visibilityState === 'visible') ||
        sameOriginClients[0]

      if (existing) {
        if ('focus' in existing) {
          await existing.focus().catch(() => undefined)
        }

        const handledBySpa = await notifyExistingClient(existing, targetPath, messId, notificationId)
        if (handledBySpa) return

        if ('navigate' in existing) {
          try {
            const navigated = await existing.navigate(fullTargetUrl)
            if (navigated && 'focus' in navigated) {
              await navigated.focus().catch(() => undefined)
            }
            return
          } catch {
            // Fall through to openWindow if navigate fails
          }
        }
      }

      await self.clients.openWindow(fullTargetUrl)
    })()
  )
})
