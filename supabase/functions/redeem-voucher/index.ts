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

    const { code, productType } = await req.json()
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

    // Check product type matches basket
    if (productType && voucher.product_type !== productType) {
      const voucherLabel = voucher.product_type === 'mirror' ? 'Mirror Wills' : 'Single Will'
      const basketLabel  = productType === 'mirror' ? 'Mirror Wills' : 'Single Will'
      return new Response(JSON.stringify({ error: `This is a ${voucherLabel} voucher and cannot be used for a ${basketLabel}.` }), { status: 409, headers: cors })
    }

    // Check uses remaining
    if (voucher.use_count >= voucher.max_uses) {
      return new Response(JSON.stringify({ error: 'This voucher has no remaining uses.' }), { status: 409, headers: cors })
    }

    if (new Date(voucher.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'This voucher has expired.' }), { status: 410, headers: cors })
    }

    // Check user doesn't already have an active will purchase
    const { data: existing } = await supabase
      .from('purchases')
      .select('id')
      .in('status', ['paid', 'renewal'])
      .eq('email', user.email!)
      .maybeSingle()

    if (existing) {
      return new Response(JSON.stringify({ error: 'Your account already has an active will product.' }), { status: 409, headers: cors })
    }

    // Atomic increment — optimistic lock: only updates if use_count hasn't
    // changed since we read it, guarding against concurrent redemptions.
    const { data: updated, error: updateError } = await supabase
      .from('vouchers')
      .update({ use_count: voucher.use_count + 1 })
      .eq('id', voucher.id)
      .eq('use_count', voucher.use_count)
      .select('id')
      .maybeSingle()

    if (updateError) throw new Error(updateError.message)

    if (!updated) {
      return new Response(JSON.stringify({ error: 'This voucher has just been fully redeemed. Please contact us if you need help.' }), { status: 409, headers: cors })
    }

    const expiresAt = new Date()
    expiresAt.setMonth(expiresAt.getMonth() + 24)

    // Create purchase record for this user
    const { error: purchaseError } = await supabase.from('purchases').insert({
      stripe_session_id: `voucher-${voucher.code}-${user.id.slice(0, 8)}`,
      email:             user.email,
      user_id:           user.id,
      product_id:        voucher.product_type,
      amount:            voucher.product_type === 'mirror' ? 2999 : 1999,
      status:            'paid',
      expires_at:        expiresAt.toISOString(),
    })
    if (purchaseError) throw new Error(purchaseError.message)

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
