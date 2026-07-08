'use server'

import { auth } from '@clerk/nextjs/server'
import { sql } from '@/lib/db'
import { getDbUserId } from '@/actions/profile'

async function getCurrentUserId(): Promise<string> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')
  return getDbUserId(userId)
}

/**
 * Save/upsert a push subscription in the database
 */
export async function addPushSubscription(
  endpoint: string,
  p256dh: string,
  authKey: string
): Promise<void> {
  const userId = await getCurrentUserId()

  await sql`
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, updated_at)
    VALUES (${userId}::uuid, ${endpoint}, ${p256dh}, ${authKey}, now())
    ON CONFLICT (user_id, endpoint)
    DO UPDATE SET
      p256dh = EXCLUDED.p256dh,
      auth = EXCLUDED.auth,
      updated_at = now()
  `
}

/**
 * Remove a push subscription from the database
 */
export async function removePushSubscription(endpoint: string): Promise<void> {
  const userId = await getCurrentUserId()

  await sql`
    DELETE FROM push_subscriptions
    WHERE user_id = ${userId}::uuid AND endpoint = ${endpoint}
  `
}

/**
 * Check if the browser's push subscription exists in the database
 */
export async function checkPushSubscription(endpoint: string): Promise<boolean> {
  const userId = await getCurrentUserId()

  const rows = await sql`
    SELECT 1 FROM push_subscriptions
    WHERE user_id = ${userId}::uuid AND endpoint = ${endpoint}
    LIMIT 1
  `
  return rows.length > 0
}
