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

  await fetch('https://api.resend.com/emails', {
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
        <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;">
          <h1 style="font-size:1.4rem;color:#7C4DFF;margin-bottom:4px;">Wills Assured</h1>
          <h2 style="font-size:1.2rem;color:#0F0E17;margin-top:24px;">Your ${productLabel}</h2>
          <p style="color:#6B6880;">Thank you for your purchase. Here is your voucher code:</p>

          <div style="background:#F4F3FF;border:2px solid #7C4DFF;border-radius:12px;padding:24px;text-align:center;margin:28px 0;">
            <p style="margin:0 0 8px;font-size:0.85rem;color:#6B6880;letter-spacing:0.05em;">VOUCHER CODE</p>
            <p style="margin:0;font-size:2rem;font-weight:800;letter-spacing:0.12em;color:#7C4DFF;">${code}</p>
          </div>

          <p style="color:#6B6880;">This voucher covers one <strong>${productLabel}</strong> and is valid until <strong>${expiryStr}</strong>.</p>

          <a href="${redeemUrl}" style="display:inline-block;background:#7C4DFF;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;margin:8px 0 24px;">
            Redeem Your Voucher &rarr;
          </a>

          <p style="color:#6B6880;font-size:0.85rem;">The recipient will need to create a free account at willsassured.co.uk to redeem this code.</p>
          <p style="color:#6B6880;font-size:0.85rem;">If you have any questions, contact us at hello@willsassured.co.uk</p>
        </div>
      `,
    }),
  })
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
