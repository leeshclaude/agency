// Vercel serverless function — sends admin notification email via Resend
// when a new member signs up. Called from SignUpPage after successful auth.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Email service not configured' })
  }

  const { full_name, instagram_handle, instagram_followers, location_city, location_state, email } = req.body

  const html = `
    <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #302820;">
      <div style="background: #c9a99a; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; color: #fff; font-size: 20px;">New member request 🌸</h1>
      </div>
      <div style="background: #faf8f6; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #ece4dc; border-top: none;">
        <p style="margin: 0 0 20px; color: #6e5e4f;">Someone new has requested to join The Mama Edit. Head to your admin dashboard to approve or deny them.</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #b09d8a; font-size: 13px; width: 140px;">Name</td><td style="padding: 8px 0; font-weight: 500;">${full_name}</td></tr>
          <tr><td style="padding: 8px 0; color: #b09d8a; font-size: 13px;">Instagram</td><td style="padding: 8px 0; font-weight: 500;">${instagram_handle}</td></tr>
          <tr><td style="padding: 8px 0; color: #b09d8a; font-size: 13px;">Followers</td><td style="padding: 8px 0; font-weight: 500;">${Number(instagram_followers).toLocaleString()}</td></tr>
          <tr><td style="padding: 8px 0; color: #b09d8a; font-size: 13px;">Location</td><td style="padding: 8px 0; font-weight: 500;">${location_city}, ${location_state}</td></tr>
          <tr><td style="padding: 8px 0; color: #b09d8a; font-size: 13px;">Email</td><td style="padding: 8px 0; font-weight: 500;">${email}</td></tr>
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
      subject: `New member request: ${full_name}`,
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
