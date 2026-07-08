'use server'

import { auth } from '@clerk/nextjs/server'
import { sql } from '@/lib/db'
import { getDbUserId } from '@/actions/profile'
import type { Notification } from '@/types/database'

async function getCurrentUserId(): Promise<string> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')
  return getDbUserId(userId)
}

/**
 * Fetch latest 20 notifications for the current user
 */
export async function getNotifications(): Promise<Notification[]> {
  const userId = await getCurrentUserId()
  const rows = await sql`
    SELECT * FROM notifications
    WHERE user_id = ${userId}::uuid
    ORDER BY created_at DESC
    LIMIT 20
  `
  return rows as Notification[]
}

/**
 * Mark a single notification as read
 */
export async function markNotificationRead(id: string): Promise<void> {
  const userId = await getCurrentUserId()
  await sql`
    UPDATE notifications
    SET is_read = true
    WHERE id = ${id}::uuid AND user_id = ${userId}::uuid
  `
}

/**
 * Mark all notifications as read for the current user
 */
export async function markAllNotificationsRead(): Promise<void> {
  const userId = await getCurrentUserId()
  await sql`
    UPDATE notifications
    SET is_read = true
    WHERE user_id = ${userId}::uuid AND is_read = false
  `
}

/**
 * Delete a notification
 */
export async function deleteNotification(id: string): Promise<void> {
  const userId = await getCurrentUserId()
  await sql`
    DELETE FROM notifications
    WHERE id = ${id}::uuid AND user_id = ${userId}::uuid
  `
}
