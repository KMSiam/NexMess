import Pusher from 'pusher'
import PusherJS from 'pusher-js'

// ── Server-side Pusher (triggers events from Next.js Server Actions) ──────────
export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
})

// ── Client-side Pusher singleton ─────────────────────────────────────────────
let pusherClient: PusherJS | null = null

export function getPusherClient(): PusherJS {
  if (!pusherClient) {
    pusherClient = new PusherJS(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    })
  }
  return pusherClient
}

// Channel naming helpers
export const getMessChannel = (messId: string) => `mess-${messId}`
export const EVENTS = {
  DB_CHANGE: 'db-change',
  CHAT_MESSAGE: 'chat-message',
  NOTIFICATION: 'notification',
} as const
