'use server'

import { auth } from '@clerk/nextjs/server'
import { sql } from '@/lib/db'
import { pusherServer, getMessChannel, EVENTS } from '@/lib/pusher'
import { getDbUserId } from '@/actions/profile'
import { dhakaToday } from '@/lib/utils'

async function getCurrentUserId(): Promise<string> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')
  return getDbUserId(userId)
}

async function verifyMember(userId: string, messId: string): Promise<'member' | 'manager'> {
  const rows = await sql`
    SELECT role FROM mess_members
    WHERE user_id = ${userId}::uuid AND mess_id = ${messId}::uuid AND status = 'approved'
    LIMIT 1
  `
  if (!rows[0]) throw new Error('Access denied')
  return rows[0].role as 'member' | 'manager'
}

/**
 * Fetch all market assistant messages
 */
export async function getMarketAssistantMessages(messId: string) {
  const userId = await getCurrentUserId()
  await verifyMember(userId, messId)

  const rows = await sql`
    SELECT mcm.*, row_to_json(p) as profiles
    FROM market_chat_messages mcm
    LEFT JOIN profiles p ON p.id = mcm.sender_id
    WHERE mcm.mess_id = ${messId}::uuid
    ORDER BY mcm.created_at ASC
  `
  return rows as any[]
}

/**
 * Call Gemini API with contextual grounding prompt
 */
async function callGemini(systemPrompt: string, contents: any[]): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY
  if (!geminiKey) {
    return '*(Error: GEMINI_API_KEY environment variable is not configured on this Next.js server. Please add it to .env.local to enable AI Market Assistant features.)*'
  }

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`

  try {
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        tools: [{ google_search: {} }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      // Fallback if search grounding tool fails due to billing/billing-prepay
      if (response.status === 429 || response.status === 403 || errText.includes('RESOURCE_EXHAUSTED') || errText.includes('billing')) {
        return await callGeminiFallback(systemPrompt, contents, geminiUrl)
      }
      throw new Error(`Gemini API returned status ${response.status}: ${errText}`)
    }

    const resultJson = await response.json()
    return resultJson.candidates?.[0]?.content?.parts?.[0]?.text || ''
  } catch (err: any) {
    console.error('Gemini grounding call failed, falling back...', err)
    return await callGeminiFallback(systemPrompt, contents, geminiUrl)
  }
}

async function callGeminiFallback(systemPrompt: string, contents: any[], geminiUrl: string): Promise<string> {
  try {
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [
            {
              text:
                systemPrompt +
                '\n\nADDITIONAL INFO:\nLive Google Search is currently disabled or key credits are depleted. Fall back to your general knowledge or estimate typical local grocery prices for this region. Add a short warning notice at the very end of your response stating that live search is disabled and billing setup is required.',
            },
          ],
        },
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Gemini API returned status ${response.status}: ${errText}`)
    }

    const resultJson = await response.json()
    let responseText = resultJson.candidates?.[0]?.content?.parts?.[0]?.text || ''

    if (!responseText.includes('Live search is disabled')) {
      responseText +=
        '\n\n*(Notice: Live Google Search is disabled due to depleted API credits. Showing estimates based on general market trends.)*'
    }

    return responseText;
  } catch (err: any) {
    console.error('Gemini fallback call failed', err)
    return 'I was unable to retrieve price reports right now. Please check your Gemini API Studio billing/prepayment credits.'
  }
}

/**
 * Helper to construct context prompt for Gemini
 */
async function buildMessContextPrompt(messId: string, messName: string, location: string, todayStr: string) {
  // Fetch today's meals counts
  const mealsCount = await sql`
    SELECT
      COALESCE(SUM(CASE WHEN lunch THEN 1 ELSE 0 END), 0) AS lunch_count,
      COALESCE(SUM(CASE WHEN dinner THEN 1 ELSE 0 END), 0) AS dinner_count,
      COALESCE(SUM(guest_lunch), 0) AS guest_lunch_count,
      COALESCE(SUM(guest_dinner), 0) AS guest_dinner_count
    FROM meals
    WHERE mess_id = ${messId}::uuid AND date = ${todayStr}::date
  `
  const activeLunchCount = Number(mealsCount[0]?.lunch_count || 0) + Number(mealsCount[0]?.guest_lunch_count || 0)
  const activeDinnerCount = Number(mealsCount[0]?.dinner_count || 0) + Number(mealsCount[0]?.guest_dinner_count || 0)

  // Fetch today's meal routines
  const _dhakaBase = new Date(todayStr + 'T00:00:00+06:00')
  const todayDow = (_dhakaBase.getUTCDay() + 1) % 7
  const routine = await sql`
    SELECT lunch, dinner FROM meal_routines
    WHERE mess_id = ${messId}::uuid AND day_of_week = ${todayDow}
    LIMIT 1
  `
  const todayLunch = routine[0]?.lunch || ''
  const todayDinner = routine[0]?.dinner || ''
  const routineText =
    todayLunch || todayDinner
      ? `Today's Meal Routine:\n- Lunch: ${todayLunch || 'Not scheduled'}\n- Dinner: ${todayDinner || 'Not scheduled'}`
      : "Today's Meal Routine: No routine set for today."

  // Fetch recent expenses
  const expenses = await sql`
    SELECT amount, category, description, date FROM expenses
    WHERE mess_id = ${messId}::uuid
    ORDER BY date DESC, created_at DESC
    LIMIT 8
  `
  const expensesList =
    expenses
      .map((e: any) => `- ${e.date}: ${e.category || 'General'} - ${e.amount} (${e.description || ''})`)
      .join('\n') || 'No recent expenses logged.'

  // Fetch bazaar schedules
  const schedules = await sql`
    SELECT ms.assigned_date, p.username FROM market_schedules ms
    LEFT JOIN profiles p ON p.id = ms.user_id
    WHERE ms.mess_id = ${messId}::uuid AND ms.assigned_date >= ${todayStr}::date
    ORDER BY ms.assigned_date ASC
    LIMIT 4
  `
  const scheduleList =
    schedules
      .map((s: any) => `${s.assigned_date}: ${s.username || 'Unassigned'}`)
      .join('\n') || 'No upcoming duties scheduled.'

  return `
You are "NexMessAI", a read-only smart bazaar coordinator and grocery price advisor.
You are helping members of the mess "${messName}" located at "${location}".
CURRENT DATE: ${todayStr}
MESS LOCATION: ${location}

TODAY'S MEAL ROUTINE (WHAT IS COOKING TODAY):
${routineText}

TODAY'S MEAL COUNTS:
- Lunch: ${activeLunchCount} meals (including guests)
- Dinner: ${activeDinnerCount} meals (including guests)

UPCOMING BAZAAR SCHEDULE:
${scheduleList}

RECENT BAZAAR EXPENSES:
${expensesList}

STRICT OPERATIONAL RULES:
1. You are a READ-ONLY advisor. You CANNOT insert expenses, change schedules, or alter any mess configurations. Do not offer to run database edits; instead, guide members on how to do it manually in their respective pages.
2. You MUST use your Google Search grounding tool to search for real-time local grocery prices, best deals, and price updates based in the location: "${location}".
3. Keep your answers concise, well-structured (with markdown and bold numbers), and practical. 
4. Always use the local currency symbol and format standard to the location (e.g., if in Bangladesh, use BDT or ৳; if in India, INR or ₹; if US, $).
5. If creating a shopping list, prioritize the raw ingredients needed for today's menu (Lunch: "${todayLunch || 'lunch'}", Dinner: "${todayDinner || 'dinner'}") based on today's meal counts (${activeLunchCount} lunch, ${activeDinnerCount} dinner). Estimate quantities.
`
}

/**
 * Send a message to the AI Assistant (Chat action)
 */
export async function sendMarketAssistantMessage(
  messId: string,
  message: string,
  history: { text: string; is_ai: boolean }[]
) {
  const userId = await getCurrentUserId()
  await verifyMember(userId, messId)

  const todayStr = dhakaToday()

  // Fetch Mess Location
  const messRows = await sql`SELECT name, location FROM messes WHERE id = ${messId}::uuid LIMIT 1`
  if (!messRows[0]) throw new Error('Mess not found')
  const mess = messRows[0]
  const location = mess.location?.trim() || ''

  if (!location) {
    const warningText = `Hello! I noticed that the **Mess Location** is not set yet. 
Please ask your Mess Manager to configure the location in **Settings > Mess Details** so I can retrieve live local grocery prices and give tailored market reports for your area.`

    await sql`
      INSERT INTO market_chat_messages (mess_id, sender_id, text, is_ai, is_daily_update, created_at)
      VALUES 
        (${messId}::uuid, ${userId}::uuid, ${message}, false, false, now()),
        (${messId}::uuid, null, ${warningText}, true, false, now())
    `
    await pusherServer.trigger(getMessChannel(messId), EVENTS.DB_CHANGE, { table: 'market_chat_messages' })
    return
  }

  // Insert user question
  await sql`
    INSERT INTO market_chat_messages (mess_id, sender_id, text, is_ai, is_daily_update, created_at)
    VALUES (${messId}::uuid, ${userId}::uuid, ${message}, false, false, now())
  `
  await pusherServer.trigger(getMessChannel(messId), EVENTS.DB_CHANGE, { table: 'market_chat_messages' })

  // Construct Gemini System instruction and call API
  const systemPrompt = await buildMessContextPrompt(messId, mess.name, location, todayStr)

  const contentsPayload: any[] = []
  history.forEach((h) => {
    contentsPayload.push({
      role: h.is_ai ? 'model' : 'user',
      parts: [{ text: h.text }],
    })
  })
  contentsPayload.push({
    role: 'user',
    parts: [{ text: message }],
  })

  const responseText = await callGemini(systemPrompt, contentsPayload)

  // Insert AI response
  await sql`
    INSERT INTO market_chat_messages (mess_id, sender_id, text, is_ai, is_daily_update, created_at)
    VALUES (${messId}::uuid, null, ${responseText}, true, false, now())
  `
  await pusherServer.trigger(getMessChannel(messId), EVENTS.DB_CHANGE, { table: 'market_chat_messages' })
}

/**
 * Generate daily AI update bulletin
 */
export async function generateDailyAIUpdate(messId: string, dateStr: string) {
  const userId = await getCurrentUserId()
  await verifyMember(userId, messId)

  // Fetch Mess Location
  const messRows = await sql`SELECT name, location FROM messes WHERE id = ${messId}::uuid LIMIT 1`
  if (!messRows[0]) throw new Error('Mess not found')
  const mess = messRows[0]
  const location = mess.location?.trim() || ''

  if (!location) {
    const warningText = `Hello! I noticed that the **Mess Location** is not set yet. 
Please ask your Mess Manager to configure the location in **Settings > Mess Details** so I can retrieve live local grocery prices and give tailored market reports for your area.`

    await sql`
      INSERT INTO market_chat_messages (mess_id, sender_id, text, is_ai, is_daily_update, created_at)
      VALUES (${messId}::uuid, null, ${warningText}, true, true, now())
    `
    await pusherServer.trigger(getMessChannel(messId), EVENTS.DB_CHANGE, { table: 'market_chat_messages' })
    return
  }

  // Construct Gemini payload
  const systemPrompt = await buildMessContextPrompt(messId, mess.name, location, dateStr)

  const contentsPayload = [
    {
      role: 'user',
      parts: [
        {
          text: `Generate today's market price report for essential groceries in ${location}. 
Include:
1. Today's Cooking Routine: Highlight today's Lunch & Dinner menus.
2. Daily Price Overview: Search and display current local prices for key raw ingredients needed to cook today's menu (e.g., if chicken is on the menu, prioritize chicken prices), plus general staples (rice, lentils, oil, potatoes, onion).
3. Best Value Deals: Highlight store choices/discounts in the area (using Google Search results).
4. Recommended Quantities & Cost: Estimate the quantities of raw ingredients needed based on today's meal counts for today's recipes, and provide a total estimated budget.

Format it as a clean daily bulletin.`,
        },
      ],
    },
  ]

  const responseText = await callGemini(systemPrompt, contentsPayload)

  await sql`
    INSERT INTO market_chat_messages (mess_id, sender_id, text, is_ai, is_daily_update, created_at)
    VALUES (${messId}::uuid, null, ${responseText}, true, true, now())
  `
  await pusherServer.trigger(getMessChannel(messId), EVENTS.DB_CHANGE, { table: 'market_chat_messages' })
}
