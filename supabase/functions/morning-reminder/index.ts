// Supabase Edge Function — Morning Bazaar Reminder (Cron-triggered)
// Deploy: supabase functions deploy morning-reminder
// Triggered by pg_cron at 7:00 AM BST (1:00 AM UTC) daily
// No auth required — uses service role key + a secret cron token for security

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
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
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

Deno.serve(async (req) => {
  const CORS = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const cronSecret = Deno.env.get('CRON_SECRET') ?? ''

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }

    const authToken = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    const providedCronSecret = req.headers.get('x-cron-secret') ?? ''
    const isServiceCaller = timingSafeEqual(authToken, serviceRoleKey)
    const isCronCaller = Boolean(cronSecret && timingSafeEqual(providedCronSecret, cronSecret))

    if (!isServiceCaller && !isCronCaller) {
      return new Response(JSON.stringify({ error: 'Unauthorized cron invocation' }), {
        status: 401,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Today's date in BST (UTC+6)
    const now = new Date()
    const bstOffset = 6 * 60 * 60 * 1000
    const bstDate = new Date(now.getTime() + bstOffset)
    const todayStr = bstDate.toISOString().split('T')[0]

    console.log(`[morning-reminder] Running for date: ${todayStr}`)

    // ─── 1. Generate Daily AI Report for ALL active messes ───
    // Fetch all distinct messes that have at least one approved member
    const { data: activeMesses, error: messErr } = await supabase
      .from('mess_members')
      .select('mess_id')
      .eq('status', 'approved')

    if (messErr) {
      console.error('Failed to fetch active messes:', messErr)
    }

    // Deduplicate mess IDs
    const uniqueMessIds = [...new Set(activeMesses?.map((m) => m.mess_id) || [])]
    let reportCount = 0

    for (const messId of uniqueMessIds) {
      try {
        // Check if daily report already exists for this mess today
        const startOfDayIso = todayStr + 'T00:00:00.000Z'
        const { data: existingReport } = await supabase
          .from('market_chat_messages')
          .select('id')
          .eq('mess_id', messId)
          .eq('is_daily_update', true)
          .gte('created_at', startOfDayIso)
          .limit(1)

        if (existingReport && existingReport.length > 0) {
          console.log(`[morning-reminder] Daily report already exists for mess ${messId}, skipping`)
          continue
        }

        // Call market-assistant to generate daily update (using service role key)
        const functionUrl = `${supabaseUrl}/functions/v1/market-assistant`
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${serviceRoleKey}`,
            apikey: serviceRoleKey,
          },
          body: JSON.stringify({
            mess_id: messId,
            action: 'generate_daily_update',
            date_str: todayStr,
          }),
        })

        if (response.ok) {
          reportCount++
          console.log(`[morning-reminder] Daily report generated for mess ${messId}`)
        } else {
          const errText = await response.text()
          console.warn(`[morning-reminder] Failed to generate report for mess ${messId}:`, errText)
        }
      } catch (err) {
        console.error(`[morning-reminder] Error generating report for mess ${messId}:`, err)
      }
    }

    console.log(`[morning-reminder] Generated ${reportCount} daily reports`)

    // ─── 2. Send Push Notifications to Bazaar Duty Assignees ───
    const { data: todaySchedules, error: schedErr } = await supabase
      .from('market_schedules')
      .select('id, mess_id, user_id, assigned_date, profiles(username), messes:mess_id(name)')
      .eq('assigned_date', todayStr)

    if (schedErr) {
      console.error('Failed to fetch schedules:', schedErr)
      throw new Error(schedErr.message)
    }

    if (!todaySchedules || todaySchedules.length === 0) {
      console.log('[morning-reminder] No bazaar schedules for today. Done.')
      return new Response(JSON.stringify({ sent: 0, reports: reportCount, message: 'No schedules today' }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    let sentCount = 0
    let skippedCount = 0

    for (const schedule of todaySchedules) {
      const { mess_id, user_id } = schedule
      const username = (schedule.profiles as any)?.username || 'Member'
      const messName = (schedule.messes as any)?.name || 'your mess'

      // Check if reminder was already sent today for this mess
      const { data: existingLog } = await supabase
        .from('bazaar_reminders_log')
        .select('id')
        .eq('mess_id', mess_id)
        .eq('assigned_date', todayStr)
        .limit(1)

      if (existingLog && existingLog.length > 0) {
        skippedCount++
        continue
      }

      // Log the reminder first (prevents duplicates in concurrent runs)
      const { error: logErr } = await supabase.from('bazaar_reminders_log').insert({
        mess_id,
        assigned_date: todayStr,
        sent_to: user_id,
      })

      if (logErr) {
        // Likely a unique constraint violation — already sent
        console.warn(`[morning-reminder] Log insert failed for mess ${mess_id}:`, logErr.message)
        skippedCount++
        continue
      }

      // Insert notification with URL (triggers push via existing pg trigger)
      await supabase.from('notifications').insert({
        user_id,
        mess_id,
        type: 'bazaar_reminder',
        title: '🛒 Bazaar Duty Today!',
        body: `Good morning ${username}! You're on bazaar duty for ${messName} today. Check NexMessAI for today's shopping list & prices.`,
        url: '/nexmess-ai',
      })

      sentCount++
      console.log(`[morning-reminder] Sent to ${username} (${user_id}) for mess ${mess_id}`)
    }

    const result = {
      date: todayStr,
      total_schedules: todaySchedules.length,
      sent: sentCount,
      skipped: skippedCount,
      reports: reportCount,
    }

    console.log('[morning-reminder] Done:', result)

    return new Response(JSON.stringify(result), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('[morning-reminder] Internal Error:', err)
    return new Response(JSON.stringify({ error: 'Failed to complete morning reminder run.' }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})

