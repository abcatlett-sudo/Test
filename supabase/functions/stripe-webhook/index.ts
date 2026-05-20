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
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type':  'application/json',
    },
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

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7C4DFF,#00C4A7);padding:32px 40px;">
              <p style="margin:0;font-size:1.4rem;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Wills Assured</p>
              <p style="margin:6px 0 0;font-size:0.85rem;color:rgba(255,255,255,0.75);">Removing the barriers to will writing for everyone</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h1 style="margin:0 0 8px;font-size:1.3rem;font-weight:700;color:#0F0E17;">Your ${productLabel}</h1>
              <p style="margin:0 0 24px;font-size:0.95rem;color:#6B6880;line-height:1.6;">
                Thank you for your purchase. Your voucher code is below — share it with the recipient so they can create their will at <strong>willsassured.co.uk</strong>.
              </p>

              <!-- Voucher code box -->
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

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:50px;background:#7C4DFF;">
                    <a href="${redeemUrl}" style="display:inline-block;padding:14px 32px;font-size:0.95rem;font-weight:600;color:#ffffff;text-decoration:none;border-radius:50px;">
                      Redeem Your Voucher &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;font-size:0.82rem;color:#6B6880;line-height:1.6;">
                The recipient can redeem this voucher at checkout on willsassured.co.uk — simply add a will to the basket, apply the code, and create a free account to get started.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid #E8E7F5;margin:0;"/>
            </td>
          </tr>

          <!-- Footer -->
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
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type':  'application/json',
    },
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

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7C4DFF,#00C4A7);padding:32px 40px;">
              <p style="margin:0;font-size:1.4rem;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Wills Assured</p>
              <p style="margin:6px 0 0;font-size:0.85rem;color:rgba(255,255,255,0.75);">Removing the barriers to will writing for everyone</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <div style="width:56px;height:56px;background:linear-gradient(135deg,#7C4DFF,#00C4A7);border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:20px;">
                <span style="font-size:1.6rem;color:#fff;">&#10003;</span>
              </div>
              <h1 style="margin:0 0 8px;font-size:1.3rem;font-weight:700;color:#0F0E17;">Payment confirmed</h1>
              <p style="margin:0 0 24px;font-size:0.95rem;color:#6B6880;line-height:1.6;">
                Thank you — your payment of <strong>${amountStr}</strong> for a <strong>${productLabel}</strong> has been received successfully.
              </p>

              <p style="margin:0 0 24px;font-size:0.95rem;color:#6B6880;line-height:1.6;">
                Click the button below to set up your account and get started. This link works from any device, so keep this email safe in case you need to come back to it.
              </p>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="border-radius:50px;background:#7C4DFF;">
                    <a href="${setupUrl}" style="display:inline-block;padding:14px 32px;font-size:0.95rem;font-weight:600;color:#ffffff;text-decoration:none;border-radius:50px;">
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

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid #E8E7F5;margin:0;"/>
            </td>
          </tr>

          <!-- Footer -->
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

    // Record purchase
    const { error: purchaseError } = await supabase.from('purchases').insert({
      stripe_session_id: session.id,
      email,
      product_id: productId,
      amount:     session.amount_total ?? 0,
      status:     'paid',
    })
    if (purchaseError) console.error('Failed to record purchase:', purchaseError)
    else console.log(`Purchase recorded for ${email}`)

    // Send payment confirmation email for non-voucher purchases
    if (!isVoucher && !purchaseError) {
      await sendConfirmationEmail(email, productId, session.amount_total ?? 0, session.id)
    }

    // Generate voucher if applicable
    if (isVoucher) {
      const productType = productId.replace('voucher-', '') as 'single' | 'mirror'
      const code        = generateVoucherCode()
      const expiresAt   = new Date()
      expiresAt.setFullYear(expiresAt.getFullYear() + 1)

      const { error: voucherError } = await supabase.from('vouchers').insert({
        code,
        product_type:     productType,
        purchaser_email:  email,
        expires_at:       expiresAt.toISOString(),
        max_uses:         1,
      })

      if (voucherError) {
        console.error('Failed to create voucher:', voucherError)
      } else {
        console.log(`Voucher created: ${code} for ${email}`)
        await sendVoucherEmail(email, code, productType, expiresAt)
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
