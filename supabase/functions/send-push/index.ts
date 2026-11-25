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

    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const providedInternalSecret = req.headers.get('x-internal-secret') ?? ''
    const isServiceRole = timingSafeEqual(token, serviceRoleKey)
    const isInternalTrigger = Boolean(
      internalPushSecret && timingSafeEqual(providedInternalSecret, internalPushSecret)
    )

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    let callerUserId: string | null = null
    if (!isServiceRole && !isInternalTrigger) {
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
          status: 401,
          headers: CORS,
        })
      }
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      })
      const {
        data: { user: authUser },
        error: authError,
      } = await userClient.auth.getUser()

      if (authError || !authUser) {
        return new Response(JSON.stringify({ error: 'Unauthorized caller' }), {
          status: 401,
          headers: CORS,
        })
      }
      callerUserId = authUser.id
    }

    let body: { user_id: string; title: string; body?: string; url?: string }
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: CORS,
      })
    }

    const { user_id, title, body: msgBody, url } = body
    if (!user_id || typeof user_id !== 'string' || !title || typeof title !== 'string') {
      return new Response(JSON.stringify({ error: 'Valid user_id and title are required' }), {
        status: 400,
        headers: CORS,
      })
    }

    // Verify authenticated user shares an approved mess with target user_id (or targets self)
    if (callerUserId && callerUserId !== user_id) {
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
        return new Response(JSON.stringify({ error: 'Forbidden: target user is outside your mess' }), {
          status: 403,
          headers: CORS,
        })
      }
    }

    // Rate Limiting Check (keyed by caller identity so attackers cannot lock out a victim)
    const rateKey = callerUserId ? `caller:${callerUserId}` : `internal:${user_id}`
    if (!checkPushRateLimit(rateKey)) {
      return new Response(
        JSON.stringify({ error: 'Push notification rate limit exceeded. Please wait a few minutes.' }),
        {
          status: 429,
          headers: { ...CORS, 'Content-Type': 'application/json', 'Retry-After': '180' },
        }
      )
    }

    // Sanitize length and block protocol-relative (//evil.com) or external URLs
    const cleanTitle = title.slice(0, 120)
    const cleanBody = (msgBody || '').slice(0, 500)
    const cleanUrl =
      typeof url === 'string' && /^\/(?!\/)/.test(url.trim()) ? url.trim().slice(0, 200) : '/dashboard'

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

    const payload = JSON.stringify({ title: cleanTitle, body: cleanBody, url: cleanUrl })

    const results = await Promise.allSettled(
      subs.map((sub) =>
        webPush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
      )
    )

    // Clean up expired (410 Gone) subscriptions
    const expiredEndpoints = subs
      .filter((_, i) => {
        const r = results[i]
        return r.status === 'rejected' && (r.reason as { statusCode?: number })?.statusCode === 410
      })
      .map((s) => s.endpoint)

    if (expiredEndpoints.length) {
      await supabase.from('push_subscriptions').delete().in('endpoint', expiredEndpoints)
    }

    const sent = results.filter((r) => r.status === 'fulfilled').length

    return new Response(JSON.stringify({ sent, total: subs.length }), { headers: CORS })
  } catch (err: any) {
    console.error('[send-push] Error:', err)
    return new Response(JSON.stringify({ error: 'Failed to send notification' }), {
      status: 500,
      headers: CORS,
    })
  }
})
