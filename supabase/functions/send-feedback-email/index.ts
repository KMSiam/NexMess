// Supabase Edge Function — send email when feedback is submitted
// Deploy: supabase functions deploy send-feedback-email
// Secrets required: RESEND_API_KEY (set via supabase secrets set RESEND_API_KEY=your_key)

import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── In-Memory Rate Limiting ───
const FEEDBACK_WINDOW_MS = 10 * 60 * 1000 // 10 minutes
const MAX_FEEDBACKS_PER_WINDOW = 5 // max 5 submissions per 10m
const feedbackRateMap = new Map<string, { count: number; windowStart: number }>()

function checkFeedbackRateLimit(userId: string): boolean {
  const now = Date.now()
  const record = feedbackRateMap.get(userId)

  if (!record || now - record.windowStart > FEEDBACK_WINDOW_MS) {
    feedbackRateMap.set(userId, { count: 1, windowStart: now })
    return true
  }

  if (record.count >= MAX_FEEDBACKS_PER_WINDOW) {
    return false
  }

  record.count += 1
  return true
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser()

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized user token' }), {
        status: 401,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // Rate Limiting Check
    if (!checkFeedbackRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ error: 'Too many feedback requests. Please wait a few minutes before submitting again.' }),
        {
          status: 429,
          headers: { ...CORS, 'Content-Type': 'application/json' },
        }
      )
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      console.error('[send-feedback-email] Missing RESEND_API_KEY secret')
      return new Response(JSON.stringify({ error: 'Email service is temporarily unavailable.' }), {
        status: 503,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    let payload: any
    try {
      payload = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: CORS,
      })
    }

    // Check if it's a webhook payload
    const record = payload.type === 'INSERT' ? payload.record : payload

    if (!record || !record.message || typeof record.message !== 'string') {
      return new Response(JSON.stringify({ error: 'A valid message is required' }), {
        status: 400,
        headers: CORS,
      })
    }

    if (record.message.length < 5 || record.message.length > 3000) {
      return new Response(JSON.stringify({ error: 'Message must be between 5 and 3000 characters' }), {
        status: 400,
        headers: CORS,
      })
    }

    // Sanitize string inputs to prevent HTML injection in emails
    const sanitizeHtml = (str: string) =>
      str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')

    const rawName = record.name || 'Anonymous'
    const rawEmail = record.email || 'No email provided'
    const name = sanitizeHtml(String(rawName).slice(0, 100))
    const email = sanitizeHtml(String(rawEmail).slice(0, 150))
    const message = sanitizeHtml(String(record.message).slice(0, 3000))

    const htmlBody = `
      <div style="font-family:Inter,system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:32px">
          <div style="background:#4A6D56;border-radius:10px;width:40px;height:40px;display:flex;align-items:center;justify-content:center">
            <span style="color:white;font-weight:700;font-size:18px">N</span>
          </div>
          <span style="font-size:20px;font-weight:700;color:#1a1a1a">NexMess Support</span>
        </div>
        
        <h2 style="font-size:20px;font-weight:600;color:#1a1a1a;margin:0 0 24px">New Support Ticket Received</h2>
        
        <div style="background:#f9fafb;border-radius:12px;padding:24px;margin-bottom:24px;">
          <p style="margin:0 0 12px;font-size:14px;color:#6b7280">
            <strong>From:</strong> <span style="color:#111827">${name}</span>
          </p>
          <p style="margin:0 0 12px;font-size:14px;color:#6b7280">
            <strong>Reply-To:</strong> <a href="mailto:${email}" style="color:#4A6D56;text-decoration:none">${email}</a>
          </p>
          <div style="margin-top:24px;padding-top:24px;border-top:1px solid #e5e7eb;">
            <p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#9ca3af;font-weight:600">Message</p>
            <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;white-space:pre-wrap;">${message}</p>
          </div>
        </div>
        
        <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
          Submitted at: ${new Date(record.created_at || new Date()).toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}
        </p>
      </div>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'NexMess <support@nexmess.shop>',
        to: 'k.m.siam2019@gmail.com',
        subject: `New NexMess Feedback from ${name}`,
        html: htmlBody,
      }),
    })

    if (!res.ok) {
      const errRes = await res.text()
      console.error('[send-feedback-email] Resend API Error:', errRes)
      throw new Error('Failed to deliver email through external provider')
    }

    const data = await res.json()

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err: any) {
    console.error('[send-feedback-email] Error:', err)
    return new Response(JSON.stringify({ error: 'Failed to send feedback. Please try again later.' }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
