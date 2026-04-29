import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')             ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    // Verify JWT
    const authHeader = req.headers.get('Authorization') ?? ''
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorised' }), { status: 401, headers: cors })
    }

    const { code } = await req.json()
    if (!code) {
      return new Response(JSON.stringify({ error: 'Voucher code is required' }), { status: 400, headers: cors })
    }

    // Look up voucher
    const { data: voucher, error: lookupError } = await supabase
      .from('vouchers')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .maybeSingle()

    if (lookupError) throw new Error(lookupError.message)

    if (!voucher) {
      return new Response(JSON.stringify({ error: 'Voucher code not found. Please check and try again.' }), { status: 404, headers: cors })
    }

    if (voucher.status === 'redeemed') {
      return new Response(JSON.stringify({ error: 'This voucher has already been redeemed.' }), { status: 409, headers: cors })
    }

    if (new Date(voucher.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'This voucher has expired.' }), { status: 410, headers: cors })
    }

    // Check user doesn't already have a purchase for this product type
    const { data: existing } = await supabase
      .from('purchases')
      .select('id')
      .eq('status', 'paid')
      .maybeSingle()

    if (existing) {
      return new Response(JSON.stringify({ error: 'Your account already has an active will product.' }), { status: 409, headers: cors })
    }

    // Create purchase record
    const { error: purchaseError } = await supabase.from('purchases').insert({
      stripe_session_id: `voucher-${voucher.code}`,
      email:             user.email,
      product_id:        voucher.product_type,
      amount:            voucher.product_type === 'mirror' ? 2999 : 1999,
      status:            'paid',
    })
    if (purchaseError) throw new Error(purchaseError.message)

    // Mark voucher as redeemed
    const { error: updateError } = await supabase
      .from('vouchers')
      .update({ status: 'redeemed', redeemed_by: user.id, redeemed_at: new Date().toISOString() })
      .eq('id', voucher.id)
    if (updateError) throw new Error(updateError.message)

    return new Response(JSON.stringify({ success: true, product_type: voucher.product_type }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('redeem-voucher error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
