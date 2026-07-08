'use server'

import { auth } from '@clerk/nextjs/server'
import { sql } from '@/lib/db'
import { getDbUserId } from '@/actions/profile'
import { pusherServer, getMessChannel, EVENTS } from '@/lib/pusher'

async function getCurrentUserId(): Promise<string> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')
  return getDbUserId(userId)
}

async function verifyManager(userId: string, messId: string): Promise<void> {
  const rows = await sql`
    SELECT role FROM mess_members
    WHERE user_id = ${userId}::uuid AND mess_id = ${messId}::uuid AND status = 'approved' AND role = 'manager'
    LIMIT 1
  `
  if (!rows[0]) throw new Error('Access denied — manager privileges required')
}

/**
 * Save a notice (deactivates existing ones)
 */
export async function saveNotice(messId: string, message: string, existingNoticeId?: string): Promise<void> {
  const userId = await getCurrentUserId()
  await verifyManager(userId, messId)

  if (existingNoticeId) {
    await sql`
      UPDATE notices
      SET is_active = false
      WHERE id = ${existingNoticeId}::uuid
    `
  } else {
    // Hard check to deactivate all notices for this mess
    await sql`
      UPDATE notices
      SET is_active = false
      WHERE mess_id = ${messId}::uuid AND is_active = true
    `
  }

  await sql`
    INSERT INTO notices (mess_id, message, created_by, is_active, created_at)
    VALUES (${messId}::uuid, ${message}, ${userId}::uuid, true, now())
  `

  await pusherServer.trigger(getMessChannel(messId), EVENTS.DB_CHANGE, { table: 'notices' })
}

/**
 * Deactivate notice
 */
export async function dismissNotice(noticeId: string): Promise<void> {
  const userId = await getCurrentUserId()

  // Find notice to verify mess manager
  const notice = await sql`SELECT mess_id FROM notices WHERE id = ${noticeId}::uuid LIMIT 1`
  if (!notice[0]) throw new Error('Notice not found')
  const messId = notice[0].mess_id

  await verifyManager(userId, messId)

  await sql`
    UPDATE notices
    SET is_active = false
    WHERE id = ${noticeId}::uuid
  `

  await pusherServer.trigger(getMessChannel(messId), EVENTS.DB_CHANGE, { table: 'notices' })
}

/**
 * Add emergency contact
 */
export async function addEmergencyContact(messId: string, name: string, phone: string): Promise<void> {
  const userId = await getCurrentUserId()
  await verifyManager(userId, messId)

  await sql`
    INSERT INTO emergency_contacts (mess_id, name, phone, created_at)
    VALUES (${messId}::uuid, ${name}, ${phone}, now())
  `

  await pusherServer.trigger(getMessChannel(messId), EVENTS.DB_CHANGE, { table: 'emergency_contacts' })
}

/**
 * Delete emergency contact
 */
export async function deleteEmergencyContact(ecId: string): Promise<void> {
  const userId = await getCurrentUserId()

  const contact = await sql`SELECT mess_id FROM emergency_contacts WHERE id = ${ecId}::uuid LIMIT 1`
  if (!contact[0]) throw new Error('Contact not found')
  const messId = contact[0].mess_id

  await verifyManager(userId, messId)

  await sql`
    DELETE FROM emergency_contacts
    WHERE id = ${ecId}::uuid
  `

  await pusherServer.trigger(getMessChannel(messId), EVENTS.DB_CHANGE, { table: 'emergency_contacts' })
}
