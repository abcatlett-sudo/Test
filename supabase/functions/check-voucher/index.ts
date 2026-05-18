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
    const { code } = await req.json()
    if (!code) {
      return new Response(JSON.stringify({ valid: false, error: 'Voucher code is required' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const { data: voucher, error } = await supabase
      .from('vouchers')
      .select('use_count, max_uses, expires_at')
      .eq('code', code.trim().toUpperCase())
      .maybeSingle()

    if (error) throw new Error(error.message)

    if (!voucher) {
      return new Response(JSON.stringify({ valid: false, error: 'Voucher code not found. Please check and try again.' }), {
        status: 404, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    if (voucher.use_count >= voucher.max_uses) {
      return new Response(JSON.stringify({ valid: false, error: 'This voucher has already been redeemed.' }), {
        status: 409, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    if (new Date(voucher.expires_at) < new Date()) {
      return new Response(JSON.stringify({ valid: false, error: 'This voucher has expired.' }), {
        status: 410, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ valid: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ valid: false, error: err.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
