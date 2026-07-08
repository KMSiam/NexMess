'use server'

import { auth } from '@clerk/nextjs/server'
import { sql } from '@/lib/db'
import { pusherServer, getMessChannel, EVENTS } from '@/lib/pusher'
import { getDbUserId } from '@/actions/profile'
import { addDaysDhaka, dhakaToday } from '@/lib/utils'
import { generateDailyAIUpdate } from '@/actions/marketAssistant'

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
 * Fetch market schedules for a date range
 */
export async function getMarketSchedules(messId: string, startDate: string, endDate: string) {
  const userId = await getCurrentUserId()
  await verifyMember(userId, messId)

  const rows = await sql`
    SELECT ms.*, row_to_json(p) as profiles
    FROM market_schedules ms
    LEFT JOIN profiles p ON p.id = ms.user_id
    WHERE ms.mess_id = ${messId}::uuid
      AND ms.assigned_date >= ${startDate}::date
      AND ms.assigned_date <= ${endDate}::date
    ORDER BY ms.assigned_date ASC
  `
  return rows as any[]
}

/**
 * Assign bazaar duties (upsert)
 */
export async function assignMarketDuties(
  messId: string,
  assignments: { user_id: string; assigned_date: string }[]
) {
  const userId = await getCurrentUserId()
  const role = await verifyMember(userId, messId)
  if (role !== 'manager') throw new Error('Only managers can assign duties')

  for (const assign of assignments) {
    await sql`
      INSERT INTO market_schedules (mess_id, user_id, assigned_date)
      VALUES (${messId}::uuid, ${assign.user_id}::uuid, ${assign.assigned_date}::date)
      ON CONFLICT (mess_id, user_id, assigned_date) DO NOTHING
    `
  }

  await pusherServer.trigger(getMessChannel(messId), EVENTS.DB_CHANGE, { table: 'market_schedules' })
}

/**
 * Delete a market duty assignment
 */
export async function deleteMarketDuty(messId: string, scheduleId: string) {
  const userId = await getCurrentUserId()
  const role = await verifyMember(userId, messId)
  if (role !== 'manager') throw new Error('Only managers can delete assignments')

  await sql`
    DELETE FROM market_schedules
    WHERE id = ${scheduleId}::uuid AND mess_id = ${messId}::uuid
  `

  await pusherServer.trigger(getMessChannel(messId), EVENTS.DB_CHANGE, { table: 'market_schedules' })
}

/**
 * Auto-assign next week duties round-robin
 */
export async function autoAssignMarketDuties(messId: string, startOfWeekDate: string) {
  const userId = await getCurrentUserId()
  const role = await verifyMember(userId, messId)
  if (role !== 'manager') throw new Error('Only managers can assign duties')

  // Get approved members
  const members = await sql`
    SELECT user_id FROM mess_members
    WHERE mess_id = ${messId}::uuid AND status = 'approved'
    ORDER BY created_at ASC
  `
  if (members.length === 0) return

  // Run round-robin over the 7 days of the week starting at startOfWeekDate
  for (let i = 0; i < 7; i++) {
    const assignedDate = addDaysDhaka(startOfWeekDate, i)
    const memberId = members[i % members.length].user_id

    await sql`
      INSERT INTO market_schedules (mess_id, user_id, assigned_date)
      VALUES (${messId}::uuid, ${memberId}::uuid, ${assignedDate}::date)
      ON CONFLICT (mess_id, user_id, assigned_date) DO NOTHING
    `
  }

  await pusherServer.trigger(getMessChannel(messId), EVENTS.DB_CHANGE, { table: 'market_schedules' })
}

/**
 * Daily background check for daily AI report and push notifications
 */
export async function runDailyBazaarChecks(messId: string) {
  const userId = await getCurrentUserId()
  await verifyMember(userId, messId)

  const todayStr = dhakaToday()

  // 1. Daily Push Reminder Check
  const todaySchedule = await sql`
    SELECT user_id FROM market_schedules
    WHERE mess_id = ${messId}::uuid
      AND assigned_date = ${todayStr}::date
    LIMIT 1
  `

  if (todaySchedule[0]?.user_id) {
    const assigneeId = todaySchedule[0].user_id

    const loggedReminder = await sql`
      SELECT id FROM bazaar_reminders_log
      WHERE mess_id = ${messId}::uuid
        AND assigned_date = ${todayStr}::date
      LIMIT 1
    `

    if (loggedReminder.length === 0) {
      // Log the reminder
      await sql`
        INSERT INTO bazaar_reminders_log (mess_id, assigned_date, sent_to)
        VALUES (${messId}::uuid, ${todayStr}::date, ${assigneeId}::uuid)
      `

      // Insert notification
      await sql`
        INSERT INTO notifications (user_id, mess_id, type, title, body, created_at)
        VALUES (
          ${assigneeId}::uuid, ${messId}::uuid,
          'market_reminder',
          'Bazaar Duty Reminder 🛒',
          'You are scheduled for bazaar duty today. Don''t forget to check the meals and buy the groceries!',
          now()
        )
      `

      // Trigger bell update via Pusher
      await pusherServer.trigger(getMessChannel(messId), EVENTS.DB_CHANGE, { table: 'notifications' })
    }
  }

  // 2. Daily AI Price Report Check
  const startOfDayIso = todayStr + 'T00:00:00.000Z'
  const existingReport = await sql`
    SELECT id FROM market_chat_messages
    WHERE mess_id = ${messId}::uuid
      AND is_daily_update = true
      AND created_at >= ${startOfDayIso}::timestamptz
    LIMIT 1
  `

  if (existingReport.length === 0) {
    // Generate daily update asynchronously
    void generateDailyAIUpdate(messId, todayStr)
  }
}


/**
 * Fetch weekly meal routine
 */
export async function getMealRoutines(messId: string) {
  const userId = await getCurrentUserId()
  await verifyMember(userId, messId)

  const rows = await sql`
    SELECT day_of_week, lunch, dinner FROM meal_routines
    WHERE mess_id = ${messId}::uuid
    ORDER BY day_of_week ASC
  `
  return rows as any[]
}

/**
 * Save weekly meal routine
 */
export async function saveMealRoutines(
  messId: string,
  routines: { day_of_week: number; lunch: string; dinner: string }[]
) {
  const userId = await getCurrentUserId()
  const role = await verifyMember(userId, messId)
  if (role !== 'manager') throw new Error('Only managers can update meal routine')

  for (const r of routines) {
    await sql`
      INSERT INTO meal_routines (mess_id, day_of_week, lunch, dinner, updated_by, updated_at)
      VALUES (
        ${messId}::uuid, ${r.day_of_week},
        ${r.lunch.trim()}, ${r.dinner.trim()},
        ${userId}::uuid, now()
      )
      ON CONFLICT (mess_id, day_of_week) DO UPDATE
      SET
        lunch = EXCLUDED.lunch,
        dinner = EXCLUDED.dinner,
        updated_by = EXCLUDED.updated_by,
        updated_at = EXCLUDED.updated_at
    `
  }

  await pusherServer.trigger(getMessChannel(messId), EVENTS.DB_CHANGE, { table: 'meal_routines' })
}
