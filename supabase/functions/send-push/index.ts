// Supabase Edge Function — send Web Push notification to a user
// Deploy: supabase functions deploy send-push
// Secrets required (set via: supabase secrets set KEY=value):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT

import webPush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── In-Memory Sliding Window Rate Limiter ───
const PUSH_WINDOW_MS = 3 * 60 * 1000 // 3 minutes
const MAX_PUSH_PER_WINDOW = 30 // max 30 pushes per user per 3m
const pushRateMap = new Map<string, { count: number; windowStart: number }>()

function checkPushRateLimit(userId: string): boolean {
  const now = Date.now()
  const record = pushRateMap.get(userId)

  if (!record || now - record.windowStart > PUSH_WINDOW_MS) {
    pushRateMap.set(userId, { count: 1, windowStart: now })
    return true
  }

  if (record.count >= MAX_PUSH_PER_WINDOW) {
    return false
  }

  record.count += 1
  return true
}

Deno.serve(async (req) => {
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
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[send-push] Missing Supabase environment variables')
      return new Response(JSON.stringify({ error: 'Internal configuration error' }), {
        status: 500,
        headers: CORS,
      })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

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

    // Rate Limiting Check
    if (!checkPushRateLimit(user_id)) {
      return new Response(
        JSON.stringify({ error: 'Push notification rate limit exceeded. Please wait a few minutes.' }),
        {
          status: 429,
          headers: { ...CORS, 'Content-Type': 'application/json', 'Retry-After': '180' },
        }
      )
    }

    // Sanitize length
    const cleanTitle = title.slice(0, 120)
    const cleanBody = (msgBody || '').slice(0, 500)
    const cleanUrl = url && url.startsWith('/') ? url.slice(0, 200) : '/dashboard'

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
