import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')             ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

async function sendReminderEmail(to: string, firstName: string, expiresAt: Date, daysLeft: number) {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    console.log(`[REMINDERS] Would email ${to} — ${daysLeft} days remaining`)
    return
  }

  const expiryStr    = expiresAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const dashboardUrl = 'https://www.willsassured.co.uk/dashboard.html'
  const isUrgent     = daysLeft <= 7
  const subject      = isUrgent
    ? `Your Wills Assured editing window closes in ${daysLeft} days`
    : `Your Wills Assured editing window closes in ${daysLeft} days`

  const emailRes = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    'Wills Assured <noreply@willsassured.co.uk>',
      to:      [to],
      subject,
      html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background-color:#F4F3FF;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F3FF;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(108,71,255,0.10);">
          <tr>
            <td style="background:linear-gradient(135deg,#7C4DFF,#00C4A7);padding:32px 40px;">
              <p style="margin:0;font-size:1.4rem;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Wills Assured</p>
              <p style="margin:6px 0 0;font-size:0.85rem;color:rgba(255,255,255,0.75);">Removing the barriers to will writing for everyone</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 32px;">
              <h1 style="margin:0 0 8px;font-size:1.3rem;font-weight:700;color:#0F0E17;">
                Hi ${firstName}, your editing window is closing soon
              </h1>
              <p style="margin:0 0 24px;font-size:0.95rem;color:#6B6880;line-height:1.6;">
                Your 24-month will editing period expires on <strong>${expiryStr}</strong>.
              </p>
              <p style="margin:0 0 24px;font-size:0.95rem;color:#6B6880;line-height:1.6;">
                After this date you'll still be able to view and download your will — but to make any further edits you'll need to renew your account for <strong>£9.99</strong>.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="border-radius:50px;background:#7C4DFF;">
                    <a href="${dashboardUrl}" style="display:inline-block;padding:14px 32px;font-size:0.95rem;font-weight:600;color:#ffffff;text-decoration:none;border-radius:50px;white-space:nowrap;">
                      Log in to renew &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:0.85rem;color:#6B6880;line-height:1.6;">
                If you don't need to make any changes, you don't need to do anything — your will document remains safely stored and downloadable.
              </p>
            </td>
          </tr>
          <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #E8E7F5;margin:0;"/></td></tr>
          <tr>
            <td style="padding:24px 40px 32px;">
              <p style="margin:0;font-size:0.8rem;color:#6B6880;line-height:1.6;">
                &copy; 2026 Wills Assured. All rights reserved.<br/>
                Questions? Contact us at <a href="mailto:hello@willsassured.co.uk" style="color:#7C4DFF;">hello@willsassured.co.uk</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    }),
  })

  if (!emailRes.ok) {
    const body = await emailRes.text()
    console.error(`[REMINDERS] Email failed for ${to} (${emailRes.status}):`, body)
  } else {
    console.log(`[REMINDERS] Sent ${daysLeft}-day reminder to ${to}`)
  }
}

Deno.serve(async (req) => {
  try {
    const now          = new Date()
    const results: string[] = []

    // Query purchases in the 30-day and 7-day reminder windows
    for (const daysTarget of [30, 7]) {
      const windowStart = new Date(now.getTime() + (daysTarget - 1) * 24 * 60 * 60 * 1000)
      const windowEnd   = new Date(now.getTime() + (daysTarget + 1) * 24 * 60 * 60 * 1000)

      const { data: purchases, error } = await supabase
        .from('purchases')
        .select('id, email, user_id, expires_at')
        .in('status', ['paid', 'renewal'])
        .gte('expires_at', windowStart.toISOString())
        .lte('expires_at', windowEnd.toISOString())

      if (error) {
        console.error(`[REMINDERS] Query error for ${daysTarget}-day window:`, error)
        continue
      }

      for (const purchase of purchases ?? []) {
        let firstName = 'there'

        if (purchase.user_id) {
          const { data: { user } } = await supabase.auth.admin.getUserById(purchase.user_id)
          if (user?.user_metadata?.full_name) {
            firstName = user.user_metadata.full_name.split(' ')[0]
          }
        }

        await sendReminderEmail(
          purchase.email,
          firstName,
          new Date(purchase.expires_at),
          daysTarget,
        )
        results.push(`${purchase.email} (${daysTarget}d)`)
      }
    }

    return new Response(JSON.stringify({ sent: results.length, results }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('[REMINDERS] Error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
