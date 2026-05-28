import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')             ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function generateCode(prefix: string): string {
  const seg = () => Array.from({ length: 4 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('')
  return `${prefix}-${seg()}-${seg()}`
}

async function sendVoucherEmail(to: string, code: string, productType: string, clientName: string): Promise<void> {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    console.log(`[CORPORATE-VOUCHER] ${code} → ${to}`)
    return
  }

  const productLabel = productType === 'mirror' ? 'Mirror Wills' : 'Single Will'
  const redeemUrl    = `https://www.willsassured.co.uk/redeem.html?code=${code}`

  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    'Wills Assured <noreply@willsassured.co.uk>',
      to:      [to],
      subject: `Your ${clientName} Employee Benefit — Will Voucher Inside`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background-color:#F0F4F3;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F0F4F3;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 16px rgba(0,106,78,0.10);">

          <tr>
            <td style="background:#006A4E;padding:28px 40px;">
              <p style="margin:0;font-size:1.1rem;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">${clientName}</p>
              <p style="margin:4px 0 0;font-size:0.8rem;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:0.08em;">Employee Benefits</p>
            </td>
          </tr>

          <tr>
            <td style="padding:36px 40px 28px;">
              <h1 style="margin:0 0 8px;font-size:1.2rem;font-weight:700;color:#0F0E17;">Your ${productLabel} Voucher</h1>
              <p style="margin:0 0 24px;font-size:0.92rem;color:#555;line-height:1.6;">
                As part of your employee benefits, your will writing is completely covered. Your personal voucher code is below — head to <strong>willsassured.co.uk</strong> to create your will at no cost to you.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background:#E8F5F1;border:2px solid #006A4E;border-radius:8px;padding:24px;text-align:center;">
                    <p style="margin:0 0 8px;font-size:0.75rem;color:#006A4E;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;">Your Voucher Code</p>
                    <p style="margin:0;font-size:1.9rem;font-weight:800;letter-spacing:0.12em;color:#006A4E;">${code}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 20px;font-size:0.88rem;color:#555;line-height:1.6;">
                To use your voucher, visit <a href="${redeemUrl}" style="color:#006A4E;font-weight:600;">willsassured.co.uk/redeem</a>, enter the code above, and follow the guided questionnaire to complete your will.
              </p>

              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="background:#006A4E;border-radius:6px;padding:14px 32px;">
                    <a href="${redeemUrl}" style="color:#ffffff;font-size:0.9rem;font-weight:700;text-decoration:none;">Redeem Your Voucher →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background:#F9F9F9;border-top:1px solid #eee;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:0.75rem;color:#999;">
                This voucher was issued as part of the ${clientName} employee benefits programme.<br/>
                Powered by <a href="https://www.willsassured.co.uk" style="color:#006A4E;">Wills Assured</a> &mdash; UK online will writing from £19.99.
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

  if (!res.ok) {
    const body = await res.text()
    console.error(`[CORPORATE-VOUCHER] Resend failed for ${to} (${res.status}):`, body)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { email, productType, clientSlug } = await req.json()

    if (!email || !productType) {
      return new Response(JSON.stringify({ error: 'Email and product type are required' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    if (!['single', 'mirror'].includes(productType)) {
      return new Response(JSON.stringify({ error: 'Invalid product type' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const slug = (typeof clientSlug === 'string' && clientSlug.length > 0) ? clientSlug : 'lloyds'

    // Look up active corporate client
    const { data: client, error: clientError } = await supabase
      .from('corporate_clients')
      .select('id, name, code_prefix')
      .eq('slug', slug)
      .eq('active', true)
      .maybeSingle()

    if (clientError) throw new Error(clientError.message)
    if (!client) {
      return new Response(JSON.stringify({ error: 'Corporate benefit programme not found' }), {
        status: 404, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const normEmail = email.toLowerCase().trim()

    // Check for existing redemption (one voucher per person per client)
    const { data: existing, error: existingError } = await supabase
      .from('corporate_redemptions')
      .select('code, product_type')
      .eq('client_id', client.id)
      .eq('email', normEmail)
      .maybeSingle()

    if (existingError) throw new Error(existingError.message)

    if (existing) {
      await sendVoucherEmail(normEmail, existing.code, existing.product_type, client.name)
      return new Response(JSON.stringify({ success: true, existing: true, code: existing.code }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Generate new voucher code
    const code = generateCode(client.code_prefix ?? 'CORP')
    const expiresAt = new Date()
    expiresAt.setFullYear(expiresAt.getFullYear() + 2)

    // Insert into retail vouchers table so existing redeem flow works unchanged
    const { error: voucherError } = await supabase.from('vouchers').insert({
      code,
      product_type:    productType,
      purchaser_email: normEmail,
      use_count:       0,
      max_uses:        1,
      expires_at:      expiresAt.toISOString(),
    })
    if (voucherError) throw new Error(voucherError.message)

    // Log corporate redemption
    const { error: redemptionError } = await supabase.from('corporate_redemptions').insert({
      client_id:    client.id,
      email:        normEmail,
      product_type: productType,
      code,
    })
    if (redemptionError) throw new Error(redemptionError.message)

    await sendVoucherEmail(normEmail, code, productType, client.name)

    return new Response(JSON.stringify({ success: true, existing: false, code }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('claim-corporate-voucher error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
