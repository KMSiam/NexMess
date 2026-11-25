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

function resolveSafeSwUrl(rawUrl?: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '/dashboard'
  const trimmed = rawUrl.trim()
  if (/^\/(?!\/)/.test(trimmed)) return trimmed.slice(0, 200)
  try {
    const parsed = new URL(trimmed)
    if (parsed.origin === self.location.origin) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`.slice(0, 200)
    }
  } catch {
    // Fallback to safe route below
  }
  return '/dashboard'
}

self.addEventListener('push', (event) => {
  if (!event.data) return
  const payload = event.data.json() as { title: string; body: string; url?: string }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      data: { url: resolveSafeSwUrl(payload.url) },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = resolveSafeSwUrl(event.notification.data?.url as string | undefined)
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const existing = clientList.find((c) => c.url.startsWith(self.location.origin))
      if (existing && 'focus' in existing) return existing.focus()
      return self.clients.openWindow(url)
    })
  )
})
