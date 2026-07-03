// Supabase Edge Function — send email when feedback is submitted
// Deploy: supabase functions deploy send-feedback-email
// Secrets required: RESEND_API_KEY (set via supabase secrets set RESEND_API_KEY=your_key)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      throw new Error('Missing RESEND_API_KEY secret')
    }

    const payload = await req.json()

    // Check if it's a webhook payload
    const record = payload.type === 'INSERT' ? payload.record : payload

    if (!record || !record.message) {
      return new Response(JSON.stringify({ error: 'Invalid payload, missing message' }), {
        status: 400,
        headers: CORS,
      })
    }

    const name = record.name || 'Anonymous'
    const email = record.email || 'No email provided'
    const message = record.message

    const htmlBody = `
      <h2>New Feedback Received</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Message:</strong></p>
      <blockquote style="background: #f9f9f9; padding: 15px; border-left: 5px solid #ccc;">
        ${message.replace(/\n/g, '<br>')}
      </blockquote>
      <p><small>Submitted at: ${record.created_at || new Date().toISOString()}</small></p>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'NexMess <onboarding@resend.dev>', // Resend testing domain (or update to custom domain)
        to: 'k.m.siam2019@gmail.com',
        subject: `New NexMess Feedback from ${name}`,
        html: htmlBody,
      }),
    })

    if (!res.ok) {
      const errRes = await res.text()
      console.error('Resend API Error:', errRes)
      throw new Error(`Failed to send email: ${errRes}`)
    }

    const data = await res.json()

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err: any) {
    console.error('Edge Function Error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
