import Stripe from 'https://esm.sh/stripe@14?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

// ─── helpers ────────────────────────────────────────────────

function generateVoucherCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `WA-${seg()}-${seg()}`
}

async function sendVoucherEmail(to: string, code: string, productType: string, expiresAt: Date) {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    console.log(`[VOUCHER] Code generated: ${code} for ${to}`)
    return
  }

  const productLabel = productType === 'mirror' ? 'Mirror Wills Voucher' : 'Single Will Voucher'
  const expiryStr    = expiresAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const redeemUrl    = `https://www.willsassured.co.uk/redeem.html?code=${code}`

  const emailRes = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    'Wills Assured <noreply@willsassured.co.uk>',
      to:      [to],
      subject: `Your Wills Assured Voucher — ${code}`,
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
              <h1 style="margin:0 0 8px;font-size:1.3rem;font-weight:700;color:#0F0E17;">Your ${productLabel}</h1>
              <p style="margin:0 0 24px;font-size:0.95rem;color:#6B6880;line-height:1.6;">
                Thank you for your purchase. Your voucher code is below — share it with the recipient so they can create their will at <strong>willsassured.co.uk</strong>.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background:#F4F3FF;border:2px solid #7C4DFF;border-radius:12px;padding:24px;text-align:center;">
                    <p style="margin:0 0 8px;font-size:0.8rem;color:#6B6880;letter-spacing:0.08em;text-transform:uppercase;">Voucher Code</p>
                    <p style="margin:0;font-size:2rem;font-weight:800;letter-spacing:0.12em;color:#7C4DFF;">${code}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 24px;font-size:0.9rem;color:#6B6880;line-height:1.6;">
                This voucher covers one <strong>${productLabel}</strong> and is valid until <strong>${expiryStr}</strong>.
              </p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:50px;background:#7C4DFF;">
                    <a href="${redeemUrl}" style="display:inline-block;padding:14px 32px;font-size:0.95rem;font-weight:600;color:#ffffff;text-decoration:none;border-radius:50px;">
                      Redeem Your Voucher &rarr;
                    </a>
                  </td>
                </tr>
              </table>
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
    console.error(`[VOUCHER] Resend email failed for ${to} (${emailRes.status}):`, body)
  }
}

async function sendConfirmationEmail(to: string, productId: string, amount: number, sessionId: string) {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    console.log(`[CONFIRMATION] Payment confirmed for ${to} — ${productId}`)
    return
  }

  const productLabel = productId === 'mirror' ? 'Mirror Wills' : 'Single Will'
  const amountStr    = `£${(amount / 100).toFixed(2)}`
  const setupUrl     = `https://www.willsassured.co.uk/success.html?session_id=${sessionId}&type=${productId}`

  const emailRes = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    'Wills Assured <noreply@willsassured.co.uk>',
      to:      [to],
      subject: `Payment confirmed — your ${productLabel} is ready`,
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
              <h1 style="margin:0 0 8px;font-size:1.3rem;font-weight:700;color:#0F0E17;">Payment confirmed</h1>
              <p style="margin:0 0 24px;font-size:0.95rem;color:#6B6880;line-height:1.6;">
                Thank you — your payment of <strong>${amountStr}</strong> for a <strong>${productLabel}</strong> has been received successfully.
              </p>
              <p style="margin:0 0 24px;font-size:0.95rem;color:#6B6880;line-height:1.6;">
                Click the button below to set up your account and get started.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="border-radius:50px;background:#7C4DFF;">
                    <a href="${setupUrl}" style="display:inline-block;padding:14px 32px;font-size:0.95rem;font-weight:600;color:#ffffff;text-decoration:none;border-radius:50px;white-space:nowrap;">
                      Complete Account Setup &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:0.85rem;color:#6B6880;line-height:1.6;">
                If the button doesn't work, copy and paste this link into your browser:<br/>
                <a href="${setupUrl}" style="color:#7C4DFF;word-break:break-all;">${setupUrl}</a>
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
    console.error(`[CONFIRMATION] Resend email failed for ${to} (${emailRes.status}):`, body)
  }
}

async function sendRenewalConfirmationEmail(to: string, expiresAt: Date) {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    console.log(`[RENEWAL] Renewal confirmed for ${to}`)
    return
  }

  const expiryStr   = expiresAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const dashboardUrl = 'https://www.willsassured.co.uk/dashboard.html'

  const emailRes = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    'Wills Assured <noreply@willsassured.co.uk>',
      to:      [to],
      subject: 'Your Wills Assured account has been renewed',
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
              <h1 style="margin:0 0 8px;font-size:1.3rem;font-weight:700;color:#0F0E17;">Account renewed</h1>
              <p style="margin:0 0 24px;font-size:0.95rem;color:#6B6880;line-height:1.6;">
                Your payment of <strong>£9.99</strong> has been received and your account is now active for another 24 months.
              </p>
              <p style="margin:0 0 24px;font-size:0.95rem;color:#6B6880;line-height:1.6;">
                You can edit your will until <strong>${expiryStr}</strong>.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="border-radius:50px;background:#7C4DFF;">
                    <a href="${dashboardUrl}" style="display:inline-block;padding:14px 32px;font-size:0.95rem;font-weight:600;color:#ffffff;text-decoration:none;border-radius:50px;white-space:nowrap;">
                      Go to Dashboard &rarr;
                    </a>
                  </td>
                </tr>
              </table>
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
    console.error(`[RENEWAL] Resend email failed for ${to} (${emailRes.status}):`, body)
  }
}

// ─── main handler ────────────────────────────────────────────

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature') ?? ''
  const body      = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '',
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return new Response(`Webhook error: ${err.message}`, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session   = event.data.object as Stripe.Checkout.Session
    const email     = (session.customer_email ?? session.customer_details?.email ?? '').toLowerCase()
    const productId = session.metadata?.productId ?? 'unknown'
    const isVoucher = productId.startsWith('voucher-')
    const isRenewal = productId === 'renewal'
    const expiresAt = addMonths(new Date(), 24)

    if (isRenewal) {
      // Find existing paid purchase for this email and update it
      const { data: origPurchase, error: lookupError } = await supabase
        .from('purchases')
        .select('id, renewal_count')
        .eq('status', 'paid')
        .ilike('email', email)
        .maybeSingle()

      if (lookupError || !origPurchase) {
        console.error(`[RENEWAL] No original purchase found for ${email}:`, lookupError)
      } else {
        const { error: updateError } = await supabase
          .from('purchases')
          .update({
            expires_at:    expiresAt.toISOString(),
            renewal_count: (origPurchase.renewal_count || 0) + 1,
          })
          .eq('id', origPurchase.id)

        if (updateError) {
          console.error(`[RENEWAL] Failed to update purchase for ${email}:`, updateError)
        } else {
          await supabase.from('renewals').insert({
            purchase_id:       origPurchase.id,
            email,
            renewed_at:        new Date().toISOString(),
            expires_at:        expiresAt.toISOString(),
            amount:            session.amount_total ?? 0,
            stripe_session_id: session.id,
          })
          console.log(`[RENEWAL] Renewed for ${email} until ${expiresAt.toISOString()}`)
        }
      }
      await sendRenewalConfirmationEmail(email, expiresAt)

    } else {
      // Regular or voucher purchase — insert new row
      const { error: purchaseError } = await supabase.from('purchases').insert({
        stripe_session_id: session.id,
        email,
        product_id: productId,
        amount:     session.amount_total ?? 0,
        status:     'paid',
        expires_at: expiresAt.toISOString(),
      })
      if (purchaseError) console.error('Failed to record purchase:', purchaseError)
      else console.log(`Purchase recorded for ${email}`)

      if (!purchaseError && !isVoucher) {
        await sendConfirmationEmail(email, productId, session.amount_total ?? 0, session.id)
      }

      // Generate voucher if applicable
      if (isVoucher) {
        const productType = productId.replace('voucher-', '') as 'single' | 'mirror'
        const code        = generateVoucherCode()
        const voucherExp  = new Date()
        voucherExp.setFullYear(voucherExp.getFullYear() + 1)

        const { error: voucherError } = await supabase.from('vouchers').insert({
          code,
          product_type:    productType,
          purchaser_email: email,
          expires_at:      voucherExp.toISOString(),
          max_uses:        1,
        })

        if (voucherError) {
          console.error('Failed to create voucher:', voucherError)
        } else {
          console.log(`Voucher created: ${code} for ${email}`)
          await sendVoucherEmail(email, code, productType, voucherExp)
        }
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
