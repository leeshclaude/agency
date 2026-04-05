// Vercel serverless function — sends admin notification email via Resend
// when a new member signs up. Called from SignUpPage after successful auth.

import { createClient } from '@supabase/supabase-js'

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verify the caller is an authenticated Supabase user
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const token = authHeader.slice(7)

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  )
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Email service not configured' })
  }

  const { full_name, instagram_handle, instagram_followers, location_city, location_state, email } = req.body

  // Escape all user-supplied values before inserting into HTML
  const safeName = escapeHtml(full_name)
  const safeHandle = escapeHtml(instagram_handle)
  const safeFollowers = escapeHtml(Number(instagram_followers).toLocaleString())
  const safeCity = escapeHtml(location_city)
  const safeState = escapeHtml(location_state)
  const safeEmail = escapeHtml(email)

  const html = `
    <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #302820;">
      <div style="background: #c9a99a; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; color: #fff; font-size: 20px;">New member request 🌸</h1>
      </div>
      <div style="background: #faf8f6; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #ece4dc; border-top: none;">
        <p style="margin: 0 0 20px; color: #6e5e4f;">Someone new has requested to join The Mama Edit. Head to your admin dashboard to approve or deny them.</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #b09d8a; font-size: 13px; width: 140px;">Name</td><td style="padding: 8px 0; font-weight: 500;">${safeName}</td></tr>
          <tr><td style="padding: 8px 0; color: #b09d8a; font-size: 13px;">Instagram</td><td style="padding: 8px 0; font-weight: 500;">${safeHandle}</td></tr>
          <tr><td style="padding: 8px 0; color: #b09d8a; font-size: 13px;">Followers</td><td style="padding: 8px 0; font-weight: 500;">${safeFollowers}</td></tr>
          <tr><td style="padding: 8px 0; color: #b09d8a; font-size: 13px;">Location</td><td style="padding: 8px 0; font-weight: 500;">${safeCity}, ${safeState}</td></tr>
          <tr><td style="padding: 8px 0; color: #b09d8a; font-size: 13px;">Email</td><td style="padding: 8px 0; font-weight: 500;">${safeEmail}</td></tr>
        </table>
        <a href="https://agency-bice-omega.vercel.app/admin" style="display: inline-block; margin-top: 24px; background: #c9a99a; color: #fff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 500;">
          Review in admin dashboard →
        </a>
      </div>
    </div>
  `

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'The Mama Edit <onboarding@resend.dev>',
      to: 'homewithleesh@gmail.com',
      subject: `New member request: ${safeName}`,
      html,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Resend error:', error)
    return res.status(500).json({ error: 'Failed to send email' })
  }

  return res.status(200).json({ ok: true })
}
