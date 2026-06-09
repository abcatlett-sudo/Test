import Stripe from 'https://esm.sh/stripe@14?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')             ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

const BASE_PRICES: Record<string, { name: string; amount: number }> = {
  single:           { name: 'Single Will',                      amount: 1999 },
  mirror:           { name: 'Mirror Wills',                     amount: 2999 },
  'voucher-single': { name: 'Single Will Voucher',              amount: 1999 },
  'voucher-mirror': { name: 'Mirror Wills Voucher',             amount: 2999 },
  renewal:          { name: 'Wills Assured — 24 Month Renewal', amount: 999  },
}

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { productId, customerEmail, voucherCode } = await req.json()
    const price = BASE_PRICES[productId]
    if (!price) throw new Error(`Invalid product ID: ${productId}`)

    let finalAmount            = price.amount
    let validatedVoucherCode: string | null = null

    // Apply discount voucher if provided
    if (voucherCode) {
      const normCode = String(voucherCode).trim().toUpperCase()

      const { data: voucher, error: vErr } = await supabase
        .from('vouchers')
        .select('use_count, max_uses, expires_at, product_type, discount_type, discount_value')
        .eq('code', normCode)
        .maybeSingle()

      if (vErr) throw new Error(vErr.message)

      if (!voucher) {
        return new Response(JSON.stringify({ error: 'Voucher code not found.' }), {
          status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }
      if (voucher.use_count >= voucher.max_uses) {
        return new Response(JSON.stringify({ error: 'This voucher has already been redeemed.' }), {
          status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }
      if (new Date(voucher.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: 'This voucher has expired.' }), {
          status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }
      // Discount vouchers only — free vouchers go through redeem-voucher
      if (!voucher.discount_type || voucher.discount_type === 'free') {
        return new Response(JSON.stringify({ error: 'This voucher cannot be applied at checkout. Please use the redeem page.' }), {
          status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }
      // Check product type match if voucher is product-specific
      if (voucher.product_type && voucher.product_type !== productId) {
        const vLabel = voucher.product_type === 'mirror' ? 'Mirror Wills' : 'Single Will'
        const pLabel = productId === 'mirror' ? 'Mirror Wills' : 'Single Will'
        return new Response(JSON.stringify({ error: `This voucher is for ${vLabel} and cannot be used for ${pLabel}.` }), {
          status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }

      if (voucher.discount_type === 'percentage') {
        finalAmount = Math.round(price.amount * (1 - (voucher.discount_value ?? 0) / 100))
      }

      validatedVoucherCode = normCode
    }

    const base = 'https://www.willsassured.co.uk'

    const metadata: Record<string, string> = { productId }
    if (validatedVoucherCode) metadata.voucherCode = validatedVoucherCode

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'gbp',
          product_data: {
            name: price.name,
            description: 'Wills Assured — simple, affordable, and accessible wills',
          },
          unit_amount: finalAmount,
        },
        quantity: 1,
      }],
      mode:                       'payment',
      billing_address_collection: 'auto',
      success_url: `${base}/success.html?session_id={CHECKOUT_SESSION_ID}&type=${productId}`,
      cancel_url:  productId === 'renewal' ? `${base}/dashboard.html` : `${base}/basket.html`,
      metadata,
    }

    if (customerEmail) sessionParams.customer_email = customerEmail

    const session = await stripe.checkout.sessions.create(sessionParams)

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
