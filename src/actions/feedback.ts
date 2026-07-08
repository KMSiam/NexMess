'use server'

import { sql } from '@/lib/db'

export async function sendFeedback(data: { name?: string; email?: string; message: string }): Promise<void> {
  if (!data.message.trim()) {
    throw new Error('Message is required')
  }
  await sql`
    INSERT INTO user_feedback (name, email, message, created_at)
    VALUES (${data.name || null}, ${data.email || null}, ${data.message}, now())
  `
}
