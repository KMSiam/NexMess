'use server'

import { auth } from '@clerk/nextjs/server'
import { sql } from '@/lib/db'
import { pusherServer, getMessChannel, EVENTS } from '@/lib/pusher'
import type { Mess, MessMember } from '@/types/database'
import { customAlphabet } from 'nanoid'
import { getDbUserId } from '@/actions/profile'

// Generate human-readable 6-char codes (no ambiguous chars)
const generateCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6)

async function getCurrentUserId(): Promise<string> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')
  return getDbUserId(userId)
}

/**
 * Fetch all messes the current user belongs to (approved + pending)
 */
export async function getUserMesses(): Promise<{
  messes: Mess[]
  pendingRequests: { mess_id: string; messes: Mess }[]
}> {
  const userId = await getCurrentUserId()

  const rows = await sql`
    SELECT mm.mess_id, mm.status, mm.role, row_to_json(m) as mess
    FROM mess_members mm
    JOIN messes m ON m.id = mm.mess_id
    WHERE mm.user_id = ${userId}::uuid
      AND mm.status IN ('approved', 'pending')
    ORDER BY mm.joined_at ASC
  `

  const messes: Mess[] = []
  const pendingRequests: { mess_id: string; messes: Mess }[] = []

  for (const row of rows) {
    const mess = row.mess as Mess
    if (row.status === 'approved') {
      messes.push(mess)
    } else {
      pendingRequests.push({ mess_id: row.mess_id as string, messes: mess })
    }
  }

  return { messes, pendingRequests }
}

/**
 * Fetch all members of a mess (with their profiles)
 */
export async function getMessMembers(messId: string): Promise<MessMember[]> {
  const userId = await getCurrentUserId()

  // Security: verify requester is approved member of this mess
  const access = await sql`
    SELECT 1 FROM mess_members
    WHERE mess_id = ${messId}::uuid AND user_id = ${userId}::uuid AND status = 'approved'
    LIMIT 1
  `
  if (!access[0]) throw new Error('Access denied')

  const rows = await sql`
    SELECT mm.*, row_to_json(p) as profiles
    FROM mess_members mm
    LEFT JOIN profiles p ON p.id = mm.user_id
    WHERE mm.mess_id = ${messId}::uuid
    ORDER BY mm.joined_at ASC
  `
  return rows as MessMember[]
}

/**
 * Create a new mess and make the current user the manager
 */
export async function createMess(name: string): Promise<Mess> {
  const userId = await getCurrentUserId()

  const code = generateCode()

  const messRows = await sql`
    INSERT INTO messes (name, unique_code, manager_id, created_at)
    VALUES (${name}, ${code}, ${userId}::uuid, now())
    RETURNING *
  `
  const mess = messRows[0] as Mess

  await sql`
    INSERT INTO mess_members (mess_id, user_id, status, role, joined_at)
    VALUES (${mess.id}::uuid, ${userId}::uuid, 'approved', 'manager', now())
  `

  return mess
}

/**
 * Join a mess by unique code — creates a pending membership request
 */
export async function joinMess(
  code: string
): Promise<{ success: boolean; error?: string }> {
  const userId = await getCurrentUserId()

  const messRows = await sql`
    SELECT * FROM messes WHERE unique_code = ${code.toUpperCase().trim()} AND is_active = true LIMIT 1
  `
  if (!messRows[0]) return { success: false, error: 'Mess not found. Check the code and try again.' }

  const mess = messRows[0] as Mess

  const existing = await sql`
    SELECT status FROM mess_members
    WHERE user_id = ${userId}::uuid AND mess_id = ${mess.id}::uuid
    LIMIT 1
  `
  if (existing[0]?.status === 'approved') return { success: false, error: 'You are already a member.' }
  if (existing[0]?.status === 'pending') return { success: false, error: 'You already have a pending request.' }

  await sql`
    INSERT INTO mess_members (mess_id, user_id, status, role, joined_at)
    VALUES (${mess.id}::uuid, ${userId}::uuid, 'pending', 'member', now())
    ON CONFLICT (mess_id, user_id) DO UPDATE SET status = 'pending', left_at = NULL
  `

  // Notify manager
  await sql`
    INSERT INTO notifications (user_id, mess_id, type, title, body, is_read)
    VALUES (
      ${mess.manager_id}::uuid, ${mess.id}::uuid,
      'join_request', 'New Join Request',
      'Someone wants to join your mess.',
      false
    )
  `

  return { success: true }
}

/**
 * Cancel a pending join request
 */
export async function cancelJoinRequest(messId: string): Promise<void> {
  const userId = await getCurrentUserId()
  await sql`
    DELETE FROM mess_members
    WHERE mess_id = ${messId}::uuid AND user_id = ${userId}::uuid AND status = 'pending'
  `
}

/**
 * Approve a member's join request (manager only)
 */
export async function approveMember(messId: string, memberId: string): Promise<void> {
  const userId = await getCurrentUserId()

  // Verify requester is manager
  const mgr = await sql`
    SELECT 1 FROM mess_members
    WHERE mess_id = ${messId}::uuid AND user_id = ${userId}::uuid AND role = 'manager' AND status = 'approved'
  `
  if (!mgr[0]) throw new Error('Only managers can approve members')

  await sql`
    UPDATE mess_members
    SET status = 'approved', joined_at = now()
    WHERE mess_id = ${messId}::uuid AND user_id = ${memberId}::uuid AND status = 'pending'
  `

  // Notify the member
  await sql`
    INSERT INTO notifications (user_id, mess_id, type, title, body, is_read)
    VALUES (
      ${memberId}::uuid, ${messId}::uuid,
      'join_approved', 'Join Request Approved',
      'Your request to join the mess has been approved.',
      false
    )
  `

  await pusherServer.trigger(getMessChannel(messId), EVENTS.DB_CHANGE, { table: 'mess_members' })
}

/**
 * Reject a member's join request (manager only)
 */
export async function rejectJoinRequest(messId: string, memberId: string): Promise<void> {
  const userId = await getCurrentUserId()

  const mgr = await sql`
    SELECT 1 FROM mess_members
    WHERE mess_id = ${messId}::uuid AND user_id = ${userId}::uuid AND role = 'manager' AND status = 'approved'
  `
  if (!mgr[0]) throw new Error('Only managers can reject requests')

  await sql`
    DELETE FROM mess_members
    WHERE mess_id = ${messId}::uuid AND user_id = ${memberId}::uuid AND status = 'pending'
  `

  // Notify the member
  await sql`
    INSERT INTO notifications (user_id, mess_id, type, title, body, is_read)
    VALUES (
      ${memberId}::uuid, ${messId}::uuid,
      'join_rejected', 'Join Request Rejected',
      'Your request to join the mess has been declined.',
      false
    )
  `

  await pusherServer.trigger(getMessChannel(messId), EVENTS.DB_CHANGE, { table: 'mess_members' })
}

/**
 * Remove/reject a member (manager only)
 */
export async function removeMember(messId: string, memberId: string): Promise<void> {
  const userId = await getCurrentUserId()

  const mgr = await sql`
    SELECT 1 FROM mess_members
    WHERE mess_id = ${messId}::uuid AND user_id = ${userId}::uuid AND role = 'manager' AND status = 'approved'
  `
  if (!mgr[0]) throw new Error('Only managers can remove members')

  await sql`
    UPDATE mess_members
    SET status = 'left', left_at = now()
    WHERE mess_id = ${messId}::uuid AND user_id = ${memberId}::uuid
  `

  await pusherServer.trigger(getMessChannel(messId), EVENTS.DB_CHANGE, { table: 'mess_members' })
}

/**
 * Update mess settings (manager only)
 */
export async function updateMess(messId: string, updates: Partial<Mess>): Promise<Mess> {
  const userId = await getCurrentUserId()

  const mgr = await sql`
    SELECT 1 FROM mess_members
    WHERE mess_id = ${messId}::uuid AND user_id = ${userId}::uuid AND role = 'manager' AND status = 'approved'
  `
  if (!mgr[0]) throw new Error('Only managers can update mess settings')

  const { name, location, rules_and_info, max_members } = updates

  const rows = await sql`
    UPDATE messes SET
      name           = COALESCE(${name ?? null}, name),
      location       = COALESCE(${location ?? null}, location),
      rules_and_info = COALESCE(${rules_and_info ?? null}, rules_and_info),
      max_members    = COALESCE(${max_members ?? null}, max_members)
    WHERE id = ${messId}::uuid
    RETURNING *
  `

  await pusherServer.trigger(getMessChannel(messId), EVENTS.DB_CHANGE, { table: 'messes' })
  return rows[0] as Mess
}

/**
 * Promote/Demote a member's role (manager only)
 */
export async function changeMemberRole(
  messId: string,
  memberId: string,
  role: 'member' | 'manager'
): Promise<void> {
  const userId = await getCurrentUserId()
  const currentRole = await sql`
    SELECT role FROM mess_members
    WHERE mess_id = ${messId}::uuid AND user_id = ${userId}::uuid AND status = 'approved'
    LIMIT 1
  `
  if (!currentRole[0] || currentRole[0].role !== 'manager') {
    throw new Error('Only managers can promote/demote members')
  }

  // Count managers in the mess
  const managers = await sql`
    SELECT user_id FROM mess_members
    WHERE mess_id = ${messId}::uuid AND role = 'manager' AND status = 'approved'
  `

  if (role === 'manager' && managers.length >= 3) {
    throw new Error('Maximum 3 managers allowed per mess')
  }
  if (role === 'member' && managers.length <= 1 && memberId === userId) {
    throw new Error('Cannot demote the last manager')
  }

  await sql`
    UPDATE mess_members
    SET role = ${role}
    WHERE mess_id = ${messId}::uuid AND user_id = ${memberId}::uuid
  `

  await pusherServer.trigger(getMessChannel(messId), EVENTS.DB_CHANGE, { table: 'mess_members' })
}

/**
 * Leave the current mess
 */
export async function leaveMess(messId: string): Promise<void> {
  const userId = await getCurrentUserId()

  const membership = await sql`
    SELECT role, status FROM mess_members
    WHERE mess_id = ${messId}::uuid AND user_id = ${userId}::uuid
    LIMIT 1
  `
  if (!membership[0] || membership[0].status !== 'approved') {
    throw new Error('You are not a member of this mess')
  }

  const role = membership[0].role

  if (role === 'manager') {
    const managers = await sql`
      SELECT user_id FROM mess_members
      WHERE mess_id = ${messId}::uuid AND role = 'manager' AND status = 'approved'
    `
    if (managers.length <= 1) {
      throw new Error('You are the only manager. Make someone else manager or delete the mess to leave.')
    }
  }

  await sql`
    UPDATE mess_members
    SET status = 'left', left_at = now()
    WHERE mess_id = ${messId}::uuid AND user_id = ${userId}::uuid
  `

  await pusherServer.trigger(getMessChannel(messId), EVENTS.DB_CHANGE, { table: 'mess_members' })
}

/**
 * Delete a mess permanently (manager only)
 */
export async function deleteMess(messId: string): Promise<void> {
  const userId = await getCurrentUserId()

  const mgr = await sql`
    SELECT 1 FROM mess_members
    WHERE mess_id = ${messId}::uuid AND user_id = ${userId}::uuid AND role = 'manager' AND status = 'approved'
    LIMIT 1
  `
  if (!mgr[0]) throw new Error('Only managers can delete a mess')

  await sql`
    DELETE FROM messes WHERE id = ${messId}::uuid
  `

  await pusherServer.trigger(getMessChannel(messId), EVENTS.DB_CHANGE, { table: 'messes' })
}
