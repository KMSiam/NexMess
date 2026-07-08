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
      <div style="font-family:Inter,system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:32px">
          <div style="background:#4A6D56;border-radius:10px;width:40px;height:40px;display:flex;align-items:center;justify-content:center">
            <span style="color:white;font-weight:700;font-size:18px">N</span>
          </div>
          <span style="font-size:20px;font-weight:700;color:#1a1a1a">NexMess Support</span>
        </div>
        
        <h2 style="font-size:20px;font-weight:600;color:#1a1a1a;margin:0 0 24px">New Support Ticket Received</h2>
        
        <div style="background:#f9fafb;border-radius:12px;padding:24px;margin-bottom:24px;">
          <p style="margin:0 0 12px;font-size:14px;color:#6b7280">
            <strong>From:</strong> <span style="color:#111827">${name}</span>
          </p>
          <p style="margin:0 0 12px;font-size:14px;color:#6b7280">
            <strong>Reply-To:</strong> <a href="mailto:${email}" style="color:#4A6D56;text-decoration:none">${email}</a>
          </p>
          <div style="margin-top:24px;padding-top:24px;border-top:1px solid #e5e7eb;">
            <p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#9ca3af;font-weight:600">Message</p>
            <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;white-space:pre-wrap;">${message}</p>
          </div>
        </div>
        
        <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
          Submitted at: ${new Date(record.created_at || new Date()).toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}
        </p>
      </div>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'NexMess <support@nexmess.shop>', // Resend testing domain (or update to custom domain)
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
