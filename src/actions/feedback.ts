'use server'

import { sql } from '@/lib/db'

export async function sendFeedback(data: { name?: string; email?: string; message: string }): Promise<void> {
  if (!data.message.trim()) {
    throw new Error('Message is required')
  }

  // 1. Insert into database
  await sql`
    INSERT INTO user_feedback (name, email, message, created_at)
    VALUES (${data.name || null}, ${data.email || null}, ${data.message}, now())
  `

  // 2. Dispatch email notification via Resend REST API
  const apiKey = process.env.RESEND_API_KEY || 're_fA249LV1_6vm3VikrqVZByx5ChvMa2k2J'
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'NexMess Feedback <onboarding@resend.dev>',
        to: 'k.m.siam2019@gmail.com',
        subject: `New NexMess Support Request from ${data.name || 'Anonymous'}`,
        html: `
          <h3>New Support/Feedback Message</h3>
          <p><strong>Name:</strong> ${data.name || 'Anonymous'}</p>
          <p><strong>Email:</strong> ${data.email || 'None'}</p>
          <p><strong>Message:</strong></p>
          <blockquote style="background: #f4f4f5; border-left: 4px solid #d4d4d8; padding: 10px 15px; margin: 15px 0;">
            ${data.message.replace(/\n/g, '<br/>')}
          </blockquote>
          <p style="font-size: 11px; color: #71717a; margin-top: 30px;">Sent via NexMess Next.js Application Server.</p>
        `,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Failed to send email via Resend:', errText)
    }
  } catch (err) {
    console.error('Resend email dispatch error:', err)
  }
}
