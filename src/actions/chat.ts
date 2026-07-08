'use server'

import { auth } from '@clerk/nextjs/server'
import { sql } from '@/lib/db'
import { pusherServer, getMessChannel, EVENTS } from '@/lib/pusher'
import type { ChatMessage } from '@/types/database'
import { getDbUserId } from '@/actions/profile'

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
 * Fetch the latest N chat messages for a mess (with sender profiles)
 */
export async function getChatMessages(
  messId: string,
  limit = 50,
  beforeId?: string
): Promise<ChatMessage[]> {
  const userId = await getCurrentUserId()
  await verifyMember(userId, messId)

  let rows
  if (beforeId) {
    // Cursor-based pagination
    const cursor = await sql`SELECT created_at FROM chat_messages WHERE id = ${beforeId}::uuid LIMIT 1`
    const cursorTime = cursor[0]?.created_at as string
    rows = await sql`
      SELECT cm.*, row_to_json(p) as profiles
      FROM chat_messages cm
      LEFT JOIN profiles p ON p.id = cm.sender_id
      WHERE cm.mess_id = ${messId}::uuid
        AND cm.created_at < ${cursorTime}::timestamptz
      ORDER BY cm.created_at DESC
      LIMIT ${limit}
    `
  } else {
    rows = await sql`
      SELECT cm.*, row_to_json(p) as profiles
      FROM chat_messages cm
      LEFT JOIN profiles p ON p.id = cm.sender_id
      WHERE cm.mess_id = ${messId}::uuid
      ORDER BY cm.created_at DESC
      LIMIT ${limit}
    `
  }

  return (rows as ChatMessage[]).reverse()
}

/**
 * Send a chat message
 */
export async function sendChatMessage(
  messId: string,
  text: string,
  messageType: 'text' | 'image' | 'system' = 'text'
): Promise<ChatMessage> {
  const userId = await getCurrentUserId()
  await verifyMember(userId, messId)

  const rows = await sql`
    INSERT INTO chat_messages (mess_id, sender_id, text, message_type, created_at)
    VALUES (${messId}::uuid, ${userId}::uuid, ${text}, ${messageType}, now())
    RETURNING *
  `
  const msg = rows[0] as ChatMessage

  // Broadcast to all mess members via Pusher
  await pusherServer.trigger(getMessChannel(messId), EVENTS.CHAT_MESSAGE, {
    ...msg,
    table: 'chat_messages',
  })

  return msg
}

/**
 * Delete a chat message (own messages only, unless manager)
 */
export async function deleteChatMessage(messId: string, messageId: string): Promise<void> {
  const userId = await getCurrentUserId()
  const role = await verifyMember(userId, messId)

  if (role === 'manager') {
    await sql`DELETE FROM chat_messages WHERE id = ${messageId}::uuid AND mess_id = ${messId}::uuid`
  } else {
    await sql`DELETE FROM chat_messages WHERE id = ${messageId}::uuid AND sender_id = ${userId}::uuid`
  }

  await pusherServer.trigger(getMessChannel(messId), EVENTS.DB_CHANGE, { table: 'chat_messages' })
}

/**
 * Add or toggle a reaction to a chat message
 */
export async function toggleChatReaction(
  messId: string,
  messageId: string,
  emoji: string
): Promise<void> {
  const userId = await getCurrentUserId()
  await verifyMember(userId, messId)

  const existing = await sql`
    SELECT id FROM chat_reactions
    WHERE message_id = ${messageId}::uuid AND user_id = ${userId}::uuid AND emoji = ${emoji}
    LIMIT 1
  `

  if (existing[0]) {
    await sql`DELETE FROM chat_reactions WHERE id = ${existing[0].id}::uuid`
  } else {
    await sql`
      INSERT INTO chat_reactions (message_id, user_id, emoji)
      VALUES (${messageId}::uuid, ${userId}::uuid, ${emoji})
      ON CONFLICT (message_id, user_id, emoji) DO NOTHING
    `
  }

  await pusherServer.trigger(getMessChannel(messId), EVENTS.DB_CHANGE, { table: 'chat_reactions' })
}

export async function getChatReactions(messId: string, messageIds: string[]): Promise<any[]> {
  const userId = await getCurrentUserId()
  await verifyMember(userId, messId)

  if (messageIds.length === 0) return []

  const rows = await sql`
    SELECT * FROM chat_reactions
    WHERE message_id = ANY(${messageIds}::uuid[])
  `
  return rows as any[]
}
