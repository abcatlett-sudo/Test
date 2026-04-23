import Stripe from 'https://esm.sh/stripe@14?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
})

// Service role client — bypasses RLS so the webhook can write freely
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

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
    const session = event.data.object as Stripe.Checkout.Session
    const email   = session.customer_email ?? session.customer_details?.email ?? ''

    const { error } = await supabase.from('purchases').insert({
      stripe_session_id: session.id,
      email:             email.toLowerCase(),
      product_id:        session.metadata?.productId ?? 'unknown',
      amount:            session.amount_total ?? 0,
      status:            'paid',
    })

    if (error) console.error('Failed to record purchase:', error)
    else console.log(`Purchase recorded for ${email}`)
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
