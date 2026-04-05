// Vercel serverless function — sends a welcome email to a member when admin approves them.
// Called from AdminPage when the Approve button is clicked.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Email service not configured' })
  }

  const { full_name, instagram_handle, email } = req.body
  if (!email || !full_name) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const firstName = full_name.split(' ')[0]
  const handle = instagram_handle?.startsWith('@') ? instagram_handle : `@${instagram_handle}`
  const appUrl = process.env.VITE_APP_URL || 'https://agency-bice-omega.vercel.app'

  const html = `
    <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #302820;">
      <div style="background: #c9a99a; padding: 28px 24px; border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; color: #fff; font-size: 22px; font-weight: 600;">You're in! 🌸</h1>
        <p style="margin: 8px 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">Welcome to The Mama Edit</p>
      </div>
      <div style="background: #faf8f6; padding: 28px 24px; border-radius: 0 0 12px 12px; border: 1px solid #ece4dc; border-top: none;">
        <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #4e4238;">
          Hi ${firstName},
        </p>
        <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #4e4238;">
          We're so excited to have you join us. Your application has been approved and your account is now active — welcome to the community!
        </p>
        <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #4e4238;">
          Head into the app to introduce yourself in the chat, check out upcoming sessions, and start building your rate card.
        </p>
        <a href="${appUrl}" style="display: inline-block; background: #c9a99a; color: #fff; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px;">
          Open The Mama Edit →
        </a>
        <hr style="margin: 28px 0; border: none; border-top: 1px solid #ece4dc;" />
        <p style="margin: 0; font-size: 13px; color: #b09d8a; line-height: 1.5;">
          You signed up as <strong style="color: #6e5e4f;">${handle}</strong>. If you have any questions, just reply to this email.
        </p>
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
      to: email,
      subject: `You're approved, ${firstName}! Welcome to The Mama Edit 🌸`,
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
