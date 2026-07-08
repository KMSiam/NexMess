'use server'

import { auth } from '@clerk/nextjs/server'
import { sql } from '@/lib/db'
import { pusherServer, getMessChannel, EVENTS } from '@/lib/pusher'
import type { Meal } from '@/types/database'
import { getDbUserId } from '@/actions/profile'

async function getCurrentUserId(): Promise<string> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')
  return getDbUserId(userId)
}

/**
 * Verify user is an approved member of the mess
 */
async function verifyMember(userId: string, messId: string): Promise<'member' | 'manager'> {
  const rows = await sql`
    SELECT role FROM mess_members
    WHERE user_id = ${userId}::uuid AND mess_id = ${messId}::uuid AND status = 'approved'
    LIMIT 1
  `
  if (!rows[0]) throw new Error('Access denied — not an approved member of this mess')
  return rows[0].role as 'member' | 'manager'
}

/**
 * Get all meals for a mess on a specific date range (e.g. current month)
 */
export async function getMeals(
  messId: string,
  startDate: string,
  endDate: string
): Promise<Meal[]> {
  const userId = await getCurrentUserId()
  await verifyMember(userId, messId)

  const rows = await sql`
    SELECT * FROM meals
    WHERE mess_id = ${messId}::uuid
      AND date BETWEEN ${startDate}::date AND ${endDate}::date
    ORDER BY date ASC
  `
  return rows as Meal[]
}

/**
 * Toggle lunch or dinner for the current user.
 * The DB trigger enforces cutoff times; managers can bypass.
 */
export async function upsertMeal(
  messId: string,
  date: string,
  lunch: boolean,
  dinner: boolean,
  guestLunch: number = 0,
  guestDinner: number = 0
): Promise<{ success: boolean; error?: string }> {
  const userId = await getCurrentUserId()
  const role = await verifyMember(userId, messId)

  try {
    if (role === 'manager') {
      // Manager bypass — calls the DB function that sets the bypass flag
      await sql`
        SELECT manager_upsert_meal(
          ${userId}::uuid, ${messId}::uuid, ${date}::date,
          ${lunch}, ${dinner}, ${guestLunch}, ${guestDinner}
        )
      `
    } else {
      // Regular member — trigger will enforce cutoff
      await sql`
        INSERT INTO meals (user_id, mess_id, date, lunch, dinner, guest_lunch, guest_dinner)
        VALUES (${userId}::uuid, ${messId}::uuid, ${date}::date, ${lunch}, ${dinner}, ${guestLunch}, ${guestDinner})
        ON CONFLICT (user_id, mess_id, date)
        DO UPDATE SET
          lunch        = EXCLUDED.lunch,
          dinner       = EXCLUDED.dinner,
          guest_lunch  = EXCLUDED.guest_lunch,
          guest_dinner = EXCLUDED.guest_dinner
      `
    }

    await pusherServer.trigger(getMessChannel(messId), EVENTS.DB_CHANGE, { table: 'meals' })
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update meal'
    // Return the friendly cutoff message to the client
    return { success: false, error: message }
  }
}

/**
 * Manager updates another member's meal (with bypass)
 */
export async function managerUpsertMeal(
  messId: string,
  memberId: string,
  date: string,
  lunch: boolean,
  dinner: boolean,
  guestLunch: number = 0,
  guestDinner: number = 0
): Promise<void> {
  const userId = await getCurrentUserId()
  const role = await verifyMember(userId, messId)
  if (role !== 'manager') throw new Error('Only managers can update other members\' meals')

  await sql`
    SELECT manager_upsert_meal(
      ${memberId}::uuid, ${messId}::uuid, ${date}::date,
      ${lunch}, ${dinner}, ${guestLunch}, ${guestDinner}
    )
  `

  await pusherServer.trigger(getMessChannel(messId), EVENTS.DB_CHANGE, { table: 'meals' })
}

/**
 * Get today's meal summary for the cook (all members' meals for today)
 */
export async function getTodayMealSummary(messId: string): Promise<{
  total_lunch: number
  total_dinner: number
  total_guest_lunch: number
  total_guest_dinner: number
}> {
  const userId = await getCurrentUserId()
  await verifyMember(userId, messId)

  const today = new Date().toISOString().split('T')[0]

  const rows = await sql`
    SELECT
      COALESCE(SUM(CASE WHEN lunch THEN 1 ELSE 0 END), 0) AS total_lunch,
      COALESCE(SUM(CASE WHEN dinner THEN 1 ELSE 0 END), 0) AS total_dinner,
      COALESCE(SUM(guest_lunch), 0) AS total_guest_lunch,
      COALESCE(SUM(guest_dinner), 0) AS total_guest_dinner
    FROM meals m
    JOIN mess_members mm ON mm.user_id = m.user_id AND mm.mess_id = m.mess_id
    WHERE m.mess_id = ${messId}::uuid
      AND m.date = ${today}::date
      AND mm.status = 'approved'
  `
  return rows[0] as { total_lunch: number; total_dinner: number; total_guest_lunch: number; total_guest_dinner: number }
}

/**
 * Fetch a single meal record for override prefilling
 */
export async function getSingleMeal(
  messId: string,
  userId: string,
  date: string
): Promise<Meal | null> {
  const currentUserId = await getCurrentUserId()
  await verifyMember(currentUserId, messId)

  const rows = await sql`
    SELECT * FROM meals
    WHERE mess_id = ${messId}::uuid
      AND user_id = ${userId}::uuid
      AND date = ${date}::date
    LIMIT 1
  `
  return (rows[0] as Meal) ?? null
}
