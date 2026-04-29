import Stripe from 'https://esm.sh/stripe@14?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
})

const PRICES: Record<string, { name: string; amount: number }> = {
  single:          { name: 'Single Will',               amount: 1999  },
  mirror:          { name: 'Mirror Wills',               amount: 2999  },
  'voucher-single': { name: 'Single Will Voucher',       amount: 1999  },
  'voucher-mirror': { name: 'Mirror Wills Voucher',      amount: 2999  },
}

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { productId } = await req.json()
    const price = PRICES[productId]
    if (!price) throw new Error(`Invalid product ID: ${productId}`)

    const origin = req.headers.get('origin') ?? 'https://abcatlett-sudo.github.io'
    const base   = `${origin}/Test`

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'gbp',
          product_data: {
            name: price.name,
            description: 'Wills Assured — legally binding will, drafted by qualified solicitors',
          },
          unit_amount: price.amount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      billing_address_collection: 'auto',
      success_url: `${base}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${base}/basket.html`,
      metadata: { productId },
    })

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
