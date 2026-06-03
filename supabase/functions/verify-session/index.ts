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

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    // Verify user JWT
    const authHeader = req.headers.get('Authorization') ?? ''
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorised' }), { status: 401, headers: cors })
    }

    const { sessionId } = await req.json()
    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Session ID is required' }), { status: 400, headers: cors })
    }

    // Retrieve session from Stripe
    let session: Stripe.Checkout.Session
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId)
    } catch {
      return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404, headers: cors })
    }

    // Verify payment was successful
    if (session.payment_status !== 'paid') {
      return new Response(JSON.stringify({ error: 'Payment not completed' }), { status: 402, headers: cors })
    }

    const email     = (session.customer_email ?? session.customer_details?.email ?? '').toLowerCase()
    const productId = session.metadata?.productId ?? 'unknown'
    const isRenewal = productId === 'renewal'
    const expiresAt = addMonths(new Date(), 24)

    // Renewal: update existing purchase rather than inserting a new row
    if (isRenewal) {
      const { data: origPurchase } = await supabase
        .from('purchases')
        .select('id, renewal_count')
        .eq('status', 'paid')
        .or(`user_id.eq.${user.id},email.eq.${email}`)
        .maybeSingle()

      if (origPurchase) {
        await supabase.from('purchases').update({
          expires_at:    expiresAt.toISOString(),
          renewal_count: (origPurchase.renewal_count || 0) + 1,
          user_id:       user.id,
        }).eq('id', origPurchase.id)

        // Only log if webhook hasn't already done so
        const { data: existingRenewal } = await supabase
          .from('renewals')
          .select('id')
          .eq('stripe_session_id', session.id)
          .maybeSingle()

        if (!existingRenewal) {
          await supabase.from('renewals').insert({
            purchase_id:       origPurchase.id,
            email,
            renewed_at:        new Date().toISOString(),
            expires_at:        expiresAt.toISOString(),
            amount:            session.amount_total ?? 0,
            stripe_session_id: session.id,
          })
        }
        console.log(`[verify-session] Renewal linked for ${email}`)
      }

      return new Response(JSON.stringify({ success: true, product_type: 'renewal' }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Regular purchase — check if already exists for this session
    const { data: existing } = await supabase
      .from('purchases')
      .select('id, product_id, user_id')
      .eq('stripe_session_id', session.id)
      .maybeSingle()

    if (existing) {
      if (!existing.user_id) {
        await supabase.from('purchases').update({ user_id: user.id }).eq('id', existing.id)
      }
      return new Response(JSON.stringify({ success: true, product_type: existing.product_id }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Create missing purchase record
    const { error: insertError } = await supabase.from('purchases').insert({
      stripe_session_id: session.id,
      email,
      user_id:    user.id,
      product_id: productId,
      amount:     session.amount_total ?? 0,
      status:     'paid',
      expires_at: expiresAt.toISOString(),
    })

    if (insertError) throw new Error(insertError.message)

    console.log(`[verify-session] Recovered purchase for ${email} — ${productId}`)

    return new Response(JSON.stringify({ success: true, product_type: productId }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('[verify-session] Error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
