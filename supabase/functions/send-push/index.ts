// Supabase Edge Function — send Web Push notification to a user
// Deploy: supabase functions deploy send-push
// Secrets required (set via: supabase secrets set KEY=value):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT

import webPush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2'

const ALLOWED_ORIGINS = new Set([
  'https://www.nexmess.shop',
  'https://nexmess.shop',
  'http://localhost:5173',
  'http://localhost:4173',
])

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  const customOrigin = Deno.env.get('ALLOWED_ORIGIN')
  const allowOrigin =
    origin && (ALLOWED_ORIGINS.has(origin) || (customOrigin && origin === customOrigin))
      ? origin
      : 'https://www.nexmess.shop'
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret',
    'Content-Type': 'application/json',
    Vary: 'Origin',
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

function resolveSafePushUrl(rawUrl?: string | null): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '/dashboard'
  const trimmed = rawUrl.trim()
  if (/^\/(?!\/)/.test(trimmed)) return trimmed.slice(0, 200)
  try {
    const parsed = new URL(trimmed)
    if (ALLOWED_ORIGINS.has(parsed.origin)) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`.slice(0, 200) || '/dashboard'
    }
  } catch {
    // Fallback to safe route below
  }
  return '/dashboard'
}

// ─── In-Memory Sliding Window Rate Limiter ───
const PUSH_WINDOW_MS = 3 * 60 * 1000 // 3 minutes
const MAX_PUSH_PER_WINDOW = 30 // max 30 pushes per caller per 3m
const pushRateMap = new Map<string, { count: number; windowStart: number }>()

function checkPushRateLimit(rateKey: string): boolean {
  const now = Date.now()
  const record = pushRateMap.get(rateKey)

  if (!record || now - record.windowStart > PUSH_WINDOW_MS) {
    pushRateMap.set(rateKey, { count: 1, windowStart: now })
    return true
  }

  if (record.count >= MAX_PUSH_PER_WINDOW) {
    return false
  }

  record.count += 1
  return true
}

Deno.serve(async (req) => {
  const CORS = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  try {
    const subject = Deno.env.get('VAPID_SUBJECT')
    const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')

    if (!subject || !publicKey || !privateKey) {
      console.error('[send-push] Missing VAPID secrets')
      return new Response(JSON.stringify({ error: 'Push notification service unavailable' }), {
        status: 503,
        headers: CORS,
      })
    }

    webPush.setVapidDetails(subject, publicKey, privateKey)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const internalPushSecret = Deno.env.get('INTERNAL_PUSH_SECRET') ?? ''

    if (!supabaseUrl || !serviceRoleKey || !supabaseAnonKey) {
      console.error('[send-push] Missing Supabase environment variables')
      return new Response(JSON.stringify({ error: 'Internal configuration error' }), {
        status: 500,
        headers: CORS,
      })
    }

    let body: {
      notification_id?: string
      user_id: string
      mess_id?: string | null
      type?: string
      title: string
      body?: string
      url?: string
    }
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: CORS,
      })
    }

    const {
      notification_id: rawNotificationId,
      user_id,
      mess_id: rawMessId,
      type: rawType,
      title: rawTitle,
      body: rawMsgBody,
      url: rawUrl,
    } = body

    if (!user_id || typeof user_id !== 'string' || !UUID_REGEX.test(user_id)) {
      return new Response(JSON.stringify({ error: 'Valid user_id is required' }), {
        status: 400,
        headers: CORS,
      })
    }

    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const providedInternalSecret = req.headers.get('x-internal-secret') ?? ''
    const isServiceRole = timingSafeEqual(token, serviceRoleKey)
    const isInternalTrigger = Boolean(
      internalPushSecret && timingSafeEqual(providedInternalSecret, internalPushSecret)
    )

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    let callerUserId: string | null = null
    let verifiedNotificationId: string | null =
      typeof rawNotificationId === 'string' && UUID_REGEX.test(rawNotificationId)
        ? rawNotificationId
        : null
    let effectiveTitle = typeof rawTitle === 'string' ? rawTitle : ''
    let effectiveBody = typeof rawMsgBody === 'string' ? rawMsgBody : ''
    let effectiveUrl = typeof rawUrl === 'string' ? rawUrl : '/dashboard'
    let effectiveMessId: string | null =
      typeof rawMessId === 'string' && UUID_REGEX.test(rawMessId) ? rawMessId : null
    let effectiveType = typeof rawType === 'string' ? rawType : 'system'

    if (!isServiceRole && !isInternalTrigger) {
      if (authHeader) {
        const userClient = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } },
        })
        const {
          data: { user: authUser },
        } = await userClient.auth.getUser()
        if (authUser) {
          callerUserId = authUser.id
        }
      }

      if (callerUserId) {
        // Verify authenticated user shares an approved mess with target user_id (or targets self)
        if (callerUserId !== user_id) {
          const { data: callerMesses } = await supabase
            .from('mess_members')
            .select('mess_id')
            .eq('user_id', callerUserId)
            .eq('status', 'approved')

          const callerMessIds = (callerMesses || []).map((m) => m.mess_id)
          let sharesMess = false
          if (callerMessIds.length > 0) {
            const { data: shared } = await supabase
              .from('mess_members')
              .select('mess_id')
              .eq('user_id', user_id)
              .eq('status', 'approved')
              .in('mess_id', callerMessIds)
              .limit(1)
            sharesMess = Boolean(shared && shared.length > 0)
          }

          if (!sharesMess) {
            return new Response(
              JSON.stringify({ error: 'Forbidden: target user is outside your mess' }),
              { status: 403, headers: CORS }
            )
          }
        }
      } else if (verifiedNotificationId) {
        // Internal DB trigger path: verify the notification row exists in public.notifications,
        // is recent (<= 5 min), and hasn't been dispatched yet; claim it atomically and use DB fields.
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
        const { data: claimed, error: claimErr } = await supabase
          .from('notifications')
          .update({ push_dispatched_at: new Date().toISOString() })
          .eq('id', verifiedNotificationId)
          .eq('user_id', user_id)
          .is('push_dispatched_at', null)
          .gte('created_at', fiveMinutesAgo)
          .select('id, title, body, url, mess_id, type')
          .maybeSingle()

        if (claimErr) {
          console.error('[send-push] Notification claim failed:', claimErr)
          return new Response(JSON.stringify({ error: 'Failed to verify notification' }), {
            status: 500,
            headers: CORS,
          })
        }

        if (!claimed) {
          return new Response(
            JSON.stringify({ sent: 0, skipped: 'notification missing, expired, or already dispatched' }),
            { headers: CORS }
          )
        }

        effectiveTitle = claimed.title || effectiveTitle
        effectiveBody = claimed.body || ''
        effectiveUrl = claimed.url || '/dashboard'
        effectiveMessId = claimed.mess_id || effectiveMessId
        effectiveType = claimed.type || effectiveType
      } else {
        return new Response(JSON.stringify({ error: 'Unauthorized caller' }), {
          status: 401,
          headers: CORS,
        })
      }
    } else if (verifiedNotificationId) {
      // Idempotency claim when invoked by service_role / internal trigger secret
      const { data: claimed } = await supabase
        .from('notifications')
        .update({ push_dispatched_at: new Date().toISOString() })
        .eq('id', verifiedNotificationId)
        .eq('user_id', user_id)
        .is('push_dispatched_at', null)
        .select('id, title, body, url, mess_id, type')
        .maybeSingle()

      if (!claimed) {
        return new Response(JSON.stringify({ sent: 0, skipped: 'already dispatched' }), {
          headers: CORS,
        })
      }
      effectiveTitle = claimed.title || effectiveTitle
      effectiveBody = claimed.body || ''
      effectiveUrl = claimed.url || '/dashboard'
      effectiveMessId = claimed.mess_id || effectiveMessId
      effectiveType = claimed.type || effectiveType
    }

    if (!effectiveTitle || typeof effectiveTitle !== 'string') {
      return new Response(JSON.stringify({ error: 'Valid title is required' }), {
        status: 400,
        headers: CORS,
      })
    }

    // Rate Limiting Check (keyed by caller identity so attackers cannot lock out a victim)
    const rateKey = callerUserId ? `caller:${callerUserId}` : `internal:${user_id}`
    if (!checkPushRateLimit(rateKey)) {
      return new Response(
        JSON.stringify({ error: 'Push notification rate limit exceeded. Please wait a few minutes.' }),
        {
          status: 429,
          headers: { ...CORS, 'Retry-After': '180' },
        }
      )
    }

    // Sanitize length and enforce safe same-origin relative URLs
    const cleanTitle = effectiveTitle.slice(0, 120)
    const cleanBody = (effectiveBody || '').slice(0, 500)
    const cleanUrl = resolveSafePushUrl(effectiveUrl)

    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', user_id)

    if (error) {
      console.error('[send-push] Database error fetching subscriptions:', error)
      return new Response(JSON.stringify({ error: 'Failed to retrieve recipient subscriptions' }), {
        status: 500,
        headers: CORS,
      })
    }

    if (!subs?.length) {
      return new Response(JSON.stringify({ sent: 0, skipped: 'no subscriptions' }), {
        headers: CORS,
      })
    }

    const payload = JSON.stringify({
      title: cleanTitle,
      body: cleanBody,
      url: cleanUrl,
      messId: effectiveMessId,
      notificationId: verifiedNotificationId,
      type: effectiveType,
    })

    const results = await Promise.allSettled(
      subs.map((sub) =>
        webPush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: 86400, urgency: 'high' }
        )
      )
    )

    // Clean up expired (410 Gone / 404 Not Found) subscriptions
    const expiredEndpoints = subs
      .filter((_, i) => {
        const r = results[i]
        if (r.status !== 'rejected') return false
        const statusCode = (r.reason as { statusCode?: number })?.statusCode
        return statusCode === 410 || statusCode === 404
      })
      .map((s) => s.endpoint)

    if (expiredEndpoints.length) {
      await supabase.from('push_subscriptions').delete().in('endpoint', expiredEndpoints)
    }

    const sent = results.filter((r) => r.status === 'fulfilled').length

    return new Response(JSON.stringify({ sent, total: subs.length }), { headers: CORS })
  } catch (err: unknown) {
    console.error('[send-push] Error:', err)
    return new Response(JSON.stringify({ error: 'Failed to send notification' }), {
      status: 500,
      headers: CORS,
    })
  }
})
