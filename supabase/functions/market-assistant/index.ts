// Supabase Edge Function — AI Market Assistant with Gemini Search Grounding
// Deploy: supabase functions deploy market-assistant
// Secrets required:
//   GEMINI_API_KEY (Google AI Studio Gemini API key)

import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChatHistoryItem {
  text: string
  is_ai: boolean
}

interface RequestBody {
  mess_id: string
  message?: string
  action?: 'chat' | 'generate_daily_update'
  date_str?: string // YYYY-MM-DD local date from client
  history?: ChatHistoryItem[]
}

Deno.serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiKey) {
      throw new Error('Missing GEMINI_API_KEY environment variable/secret.')
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // Initialize Supabase Client with caller auth JWT
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    // Detect if caller is using the service role key (e.g. morning-reminder cron)
    const token = authHeader.replace('Bearer ', '')
    const isServiceRole = token === serviceRoleKey

    let user: { id: string } | null = null

    if (!isServiceRole) {
      // Standard user auth flow
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      })

      // Verify user JWT and retrieve profile
      const {
        data: { user: authUser },
        error: authError,
      } = await userClient.auth.getUser()
      if (authError || !authUser) {
        return new Response(JSON.stringify({ error: 'Unauthorized user token' }), {
          status: 401,
          headers: { ...CORS, 'Content-Type': 'application/json' },
        })
      }
      user = authUser
    }

    // Parse Request Body
    let body: RequestBody
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const { mess_id, message, action = 'chat', date_str, history = [] } = body
    if (!mess_id) {
      return new Response(JSON.stringify({ error: 'mess_id is required' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // Create Service Role client to bypass RLS and fetch context securely
    const serviceSupabase = createClient(supabaseUrl, serviceRoleKey)

    // Verify the user is an approved member of this mess (skip for service role / daily updates)
    if (!isServiceRole && action !== 'generate_daily_update') {
      const { data: membership, error: memberError } = await serviceSupabase
        .from('mess_members')
        .select('role')
        .eq('mess_id', mess_id)
        .eq('user_id', user!.id)
        .eq('status', 'approved')
        .single()

      if (memberError || !membership) {
        return new Response(
          JSON.stringify({ error: 'User is not an approved member of this mess' }),
          {
            status: 403,
            headers: { ...CORS, 'Content-Type': 'application/json' },
          }
        )
      }
    }

    // Fetch Mess Location & Info
    const { data: mess, error: messErr } = await serviceSupabase
      .from('messes')
      .select('name, location')
      .eq('id', mess_id)
      .single()

    if (messErr || !mess) {
      return new Response(JSON.stringify({ error: 'Mess not found' }), {
        status: 404,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // Handle Empty Location Guard
    const location = mess.location?.trim() || ''
    if (!location) {
      const warningText = `Hello! I noticed that the **Mess Location** is not set yet. 
Please ask your Mess Manager to configure the location in **Settings > Mess Details** so I can retrieve live local grocery prices and give tailored market reports for your area.`

      // Save empty location warning message to chat table for daily updates
      if (action === 'generate_daily_update') {
        await serviceSupabase.from('market_chat_messages').insert({
          mess_id,
          text: warningText,
          is_ai: true,
          is_daily_update: true,
        })
      }

      return new Response(JSON.stringify({ text: warningText }), {
        status: 200,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // Fetch context data (Meals count, expenses context, schedules)
    const targetDate = date_str || new Date().toISOString().split('T')[0]

    // Today's Meals
    const { data: meals } = await serviceSupabase
      .from('meals')
      .select('lunch, dinner, guest_lunch, guest_dinner')
      .eq('mess_id', mess_id)
      .eq('date', targetDate)

    let activeLunchCount = 0
    let activeDinnerCount = 0
    if (meals) {
      meals.forEach((m) => {
        if (m.lunch) activeLunchCount += 1
        if (m.dinner) activeDinnerCount += 1
        activeLunchCount += m.guest_lunch || 0
        activeDinnerCount += m.guest_dinner || 0
      })
    }

    // Total approved members for per-capita context
    const { count: totalMembers } = await serviceSupabase
      .from('mess_members')
      .select('*', { count: 'exact', head: true })
      .eq('mess_id', mess_id)
      .eq('status', 'approved')

    // Monthly spending total (current month)
    const monthStart = targetDate.substring(0, 7) + '-01' // YYYY-MM-01
    const { data: monthlyExpenses } = await serviceSupabase
      .from('expenses')
      .select('amount')
      .eq('mess_id', mess_id)
      .gte('date', monthStart)
      .lte('date', targetDate)

    const monthlyTotal = monthlyExpenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0

    // Fetch today's meal routine (cooking menu)
    const [yr, mo, dy] = targetDate.split('-').map(Number)
    const localDate = new Date(yr, mo - 1, dy)
    const jsDay = localDate.getDay()
    const mappedDow = (jsDay + 1) % 7 // JS: 0=Sun -> our mapping: 0=Sat, 1=Sun, 2=Mon...

    const { data: routine } = await serviceSupabase
      .from('meal_routines')
      .select('lunch, dinner')
      .eq('mess_id', mess_id)
      .eq('day_of_week', mappedDow)
      .maybeSingle()

    const todayLunch = routine?.lunch || ''
    const todayDinner = routine?.dinner || ''
    const routineText =
      todayLunch || todayDinner
        ? `Lunch: ${todayLunch || 'Not set'} | Dinner: ${todayDinner || 'Not set'}`
        : 'No routine set for today.'

    // Recent Expenses (last 15 for better budget pattern analysis)
    const { data: expenses } = await serviceSupabase
      .from('expenses')
      .select('amount, category, description, date')
      .eq('mess_id', mess_id)
      .order('date', { ascending: false })
      .limit(15)

    // Bazaar Schedule (next 5 duties)
    const { data: schedules } = await serviceSupabase
      .from('market_schedules')
      .select('assigned_date, profiles(username)')
      .eq('mess_id', mess_id)
      .gte('assigned_date', targetDate)
      .order('assigned_date', { ascending: true })
      .limit(5)

    const scheduleList =
      schedules
        ?.map((s: any) => `${s.assigned_date}: ${s.profiles?.username || 'Unassigned'}`)
        .join('\n') || 'No upcoming duties scheduled.'

    const expensesList =
      expenses
        ?.map(
          (e) => `- ${e.date}: ${e.category || 'General'} - ${e.amount} (${e.description || ''})`
        )
        .join('\n') || 'No recent expenses logged.'

    // Construct Context details for Gemini System prompt
    const messContextPrompt = `
You are "NexMessAI" — the smart bazaar assistant for mess "${mess.name}" at "${location}".
Date: ${targetDate} | Members: ${totalMembers || '?'} | Monthly Spend So Far: ${monthlyTotal}

📋 TODAY'S MENU: ${routineText}
🍽️ MEALS: Lunch ${activeLunchCount} pax | Dinner ${activeDinnerCount} pax

📅 BAZAAR SCHEDULE:
${scheduleList}

💸 RECENT EXPENSES:
${expensesList}

═══ RESPONSE STYLE RULES (CRITICAL) ═══
• Be SHORT & PUNCHY. Members should read your answer in under 30 seconds.
• Use tables for prices (| Item | Price | Qty | Cost |). Never write prices as paragraphs.
• Use bold for key numbers, emojis for sections, bullet points for lists.
• No filler phrases like "Certainly!", "Of course!", "Let me help you with that". Jump straight to the answer.
• Max 3-4 short sections per response. No wall of text.
• End with a one-line "💡 Tip:" when useful.

═══ OPERATIONAL RULES ═══
1. READ-ONLY advisor. Cannot edit data. Guide members to the correct app page instead.
2. Use Google Search grounding for live local prices at "${location}".
3. Currency: Use local format (e.g., ৳ for Bangladesh, ₹ for India, $ for US).
4. Quantity estimation guide: ~100g rice/person, ~120-150g protein/person, ~80g vegetables/person, ~15ml oil/person.
5. For shopping lists, prioritize today's menu ingredients (Lunch: "${todayLunch || 'TBD'}", Dinner: "${todayDinner || 'TBD'}") for ${activeLunchCount} lunch + ${activeDinnerCount} dinner pax.
6. If monthly spending looks high, add a brief ⚠️ budget warning.
`

    // Construct Gemini API Payload
    let contentsPayload: any[] = []

    if (action === 'generate_daily_update') {
      // Prompt for daily update — short, structured bulletin
      contentsPayload = [
        {
          role: 'user',
          parts: [
            {
              text: `Daily bazaar briefing for ${location}. Keep it SHORT (under 200 words).

Format exactly like this:
🍳 **Today's Menu** — one line for lunch & dinner
📊 **Price Check** — table of key ingredients for today's recipes + staples (rice, oil, onion). Use | Item | ৳/kg | columns.
🛒 **Shopping List** — quantities needed for ${activeLunchCount} lunch + ${activeDinnerCount} dinner pax, with estimated total cost.
💡 **Tip** — one money-saving tip for today.

No intros, no filler. Straight to the data.`,
            },
          ],
        },
      ]
    } else {
      // Standard chat: load history and append current message
      history.forEach((h) => {
        contentsPayload.push({
          role: h.is_ai ? 'model' : 'user',
          parts: [{ text: h.text }],
        })
      })

      contentsPayload.push({
        role: 'user',
        parts: [{ text: message || '' }],
      })
    }

    // Call Gemini API with Search Grounding (try paid/grounded first)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`

    let responseText = ''
    let isGrounded = true

    try {
      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: contentsPayload,
          systemInstruction: {
            parts: [{ text: messContextPrompt }],
          },
          tools: [{ google_search: {} }],
        }),
      })

      if (!response.ok) {
        const errText = await response.text()
        console.warn(
          'Search Grounding API call returned non-200. Status:',
          response.status,
          errText
        )
        // Check if it's billing or credit exhaustion or search tool block
        if (
          response.status === 429 ||
          response.status === 403 ||
          errText.includes('RESOURCE_EXHAUSTED') ||
          errText.includes('billing') ||
          errText.includes('prepayment') ||
          errText.includes('credits')
        ) {
          console.warn(
            'Search Grounding failed or billing depleted. Retrying without search grounding...'
          )
          isGrounded = false
        } else {
          throw new Error(`Gemini API returned status ${response.status}: ${errText}`)
        }
      } else {
        const resultJson = await response.json()
        const candidate = resultJson.candidates?.[0]
        responseText = candidate?.content?.parts?.[0]?.text || ''
      }
    } catch (e) {
      console.error('Initial grounded call failed:', e)
      isGrounded = false
    }

    // Fallback: If grounded search failed (due to 429/credits/no-billing), retry without the search tool
    if (!isGrounded || !responseText) {
      console.warn('Executing fallback Gemini call without search grounding...')
      const fallbackResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: contentsPayload,
          systemInstruction: {
            parts: [
              {
                text:
                  messContextPrompt +
                  '\n\nADDITIONAL INFO:\nLive Google Search is currently disabled or key credits are depleted. Fall back to your general knowledge or estimate typical local prices for this region. Add a short warning notice at the very end of your response stating that live search is disabled and billing setup is required.',
              },
            ],
          },
        }),
      })

      if (!fallbackResponse.ok) {
        const errText = await fallbackResponse.text()
        console.error('Gemini Fallback API Error details:', errText)
        throw new Error(`Gemini API returned status ${fallbackResponse.status}: ${errText}`)
      }

      const resultJson = await fallbackResponse.json()
      const candidate = resultJson.candidates?.[0]
      responseText =
        candidate?.content?.parts?.[0]?.text ||
        'I was unable to retrieve price reports right now. Please check your Gemini API Studio billing/prepayment credits.'

      // Append a clear footer warning to the response if not already present
      if (!responseText.includes('Live search is disabled')) {
        responseText +=
          '\n\n*(Notice: Live Google Search is disabled due to depleted API prepayment credits. Showing estimates based on general market trends.)*'
      }
    }

    // Insert user question and AI response into database (shared chat logs)
    if (action === 'generate_daily_update') {
      await serviceSupabase.from('market_chat_messages').insert({
        mess_id,
        text: responseText,
        is_ai: true,
        is_daily_update: true,
      })
    } else {
      // For chat action: only save AI message (user message was inserted by client)
      if (message) {
        await serviceSupabase.from('market_chat_messages').insert(
          { mess_id, text: responseText, is_ai: true }
        )
      }
    }

    return new Response(JSON.stringify({ text: responseText }), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('Market Assistant Error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
