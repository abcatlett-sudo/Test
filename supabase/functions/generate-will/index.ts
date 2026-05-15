import Anthropic       from 'https://esm.sh/@anthropic-ai/sdk@0.27.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '' })

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')         ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── helpers ────────────────────────────────────────────────────

function ordinal(n: number): string {
  const s = ['th','st','nd','rd'], v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function formatDob(iso: string): string {
  if (!iso) return '[date of birth]'
  const d = new Date(iso + 'T00:00:00Z')
  const months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December']
  return `${ordinal(d.getUTCDate())} day of ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

function caps(name: string): string {
  return (name || '').toUpperCase()
}

function inheritanceClause(age: string, custom?: string): string {
  switch (age) {
    case '18':
      return 'The whole of their share shall vest in them upon attaining the age of eighteen years.'
    case '21':
      return 'The whole of their share shall vest in them upon attaining the age of twenty-one years.'
    case '25':
      return 'The whole of their share shall vest in them upon attaining the age of twenty-five years.'
    case 'staged':
      return '(a) One half of their share shall vest in them upon attaining the age of twenty-one years; and\n     (b) The remaining half shall vest in them upon attaining the age of twenty-five years.'
    case 'custom':
      return custom || 'As specified by the testator.'
    default:
      return 'The whole of their share shall vest in them upon attaining the age of eighteen years.'
  }
}

// ─── will builder ───────────────────────────────────────────────

function buildPrompt(
  productType: 'single' | 'mirror',
  testatorKey: 'primary' | 'partner',
  r: Record<string, any>,
): string {

  // ── testator details
  const isPrimary   = testatorKey === 'primary'
  const tName       = isPrimary ? r.your_full_name       : r.partner_full_name
  const tDob        = isPrimary ? r.your_dob             : r.partner_dob
  const tAddress    = isPrimary ? r.your_address         : (r.partner_address || r.your_address)
  const spouseName  = isPrimary ? r.partner_full_name    : r.your_full_name

  // ── children
  const childCount = parseInt(r.children_count || 0)
  let childrenList = ''
  for (let i = 0; i < childCount; i++) {
    const cn = r[`child_${i}_name`]  || ''
    const cd = r[`child_${i}_dob`]   || ''
    if (cn) childrenList += `  ${caps(cn)} born ${formatDob(cd)}\n`
  }

  // ── executors (mirror)
  let executorClause = ''
  if (productType === 'mirror') {
    const survivingKey   = isPrimary ? 'executor_surviving_yes'   : 'partner_executor_surviving_yes'
    const survivingOther = isPrimary ? r.executor_surviving_other : r.partner_executor_surviving_other
    if (r[survivingKey] === 'no' && survivingOther) {
      executorClause = `(a) ${survivingOther} (if they survive me by twenty-eight days and are willing to act); or\n` +
        `(b) If they are unable or unwilling to act, I appoint:\n` +
        `    ${caps(r.executor1_name || '')} of ${r.executor1_address || ''}; and\n` +
        `    ${caps(r.executor2_name || '')} of ${r.executor2_address || ''}\n` +
        `to be my Executors and Trustees jointly.`
    } else {
      executorClause = `(a) My spouse, ${caps(spouseName)} (if they survive me by twenty-eight days); or\n` +
        `(b) If my spouse does not survive me by twenty-eight days, I appoint:\n` +
        `    ${caps(r.executor1_name || '')} of ${r.executor1_address || ''}; and\n` +
        `    ${caps(r.executor2_name || '')} of ${r.executor2_address || ''}\n` +
        `to be my Executors and Trustees jointly.`
    }
  } else {
    executorClause = `${caps(r.executor1_name || '')} of ${r.executor1_address || ''}; and\n` +
      `    ${caps(r.executor2_name || '')} of ${r.executor2_address || ''}\n` +
      `to be my Executors and Trustees jointly.`
  }

  // ── guardian clause
  const hasGuardian          = r.guardian_name && childCount > 0
  const hasSecondaryGuardian = hasGuardian && r.secondary_guardian_name
  const guardianClause = hasGuardian
    ? `2.1 If ${productType === 'mirror' ? `my spouse does not survive me` : `I pass away`}, I appoint ${caps(r.guardian_name)} of ${r.guardian_address}, to be the guardian of any of my children who are under the age of eighteen years at my death.\n\n` +
      (hasSecondaryGuardian
        ? `2.2 If ${caps(r.guardian_name)} is unable or unwilling to act as guardian, I appoint ${caps(r.secondary_guardian_name)} of ${r.secondary_guardian_address} as substitute guardian in their place.`
        : `2.2 If ${caps(r.guardian_name)} is unable or unwilling to act as guardian, the guardianship shall be determined by the court.`)
    : `2.1 No guardian is appointed as no minor children are named in this will.`

  // ── funeral (mirror wills use separate keys per testator)
  const funeral = isPrimary
    ? (r.funeral_wishes         || 'I have no specific funeral wishes.')
    : (r.partner_funeral_wishes || 'I have no specific funeral wishes.')

  // ── specific gifts (per-testator for mirror wills)
  const giftsYesKey    = isPrimary ? 'specific_gifts_yes'     : 'partner_specific_gifts_yes'
  const giftsDetails   = isPrimary ? r.specific_gifts_details : r.partner_specific_gifts_details
  const hasGifts       = r[giftsYesKey] === 'yes' && giftsDetails
  const giftsClause    = hasGifts
    ? `SPECIFIC GIFTS\n\n` +
      `I give the following specific gifts:\n${giftsDetails}\n\n` +
      `If any specific beneficiary named in this clause shall predecease me, the gift to them shall fall into the residuary estate.`
    : ''

  // ── under-18 trust reference (appended to children disposition clauses)
  const under18Notice = `\n\n(d) Where any child has not attained the age of eighteen years at the date of my death, my Trustees shall hold that child's share on trust in accordance with the Trust for Children provisions set out below.`

  // ── disposition
  let dispositionClause = ''
  let secondaryClause = ''

  if (productType === 'mirror') {
    const primaryWish = r.primary_wish_yes !== 'no'
    dispositionClause = primaryWish
      ? `If my spouse, ${caps(spouseName)}, survives me by twenty-eight days, I give the whole of my estate (including any property over which I have a general power of appointment) to them absolutely.`
      : `Primary Estate Disposition: ${r.primary_wish_custom || 'To be determined.'}`

    // Mirror secondary — children or custom
    const spouseRef = `my spouse`
    if (r.secondary_equal !== 'no' && childCount > 0) {
      secondaryClause =
        `If ${spouseRef} does not survive me by twenty-eight days, I give the whole of my estate to my Trustees to hold upon the following trusts:\n\n` +
        `(a) My Trustees shall divide my estate into as many equal shares as there are children of mine living at my death, and hold one such share for each child upon the terms set out below.\n\n` +
        `(b) The children of mine living at my death are:\n${childrenList}\n` +
        `(c) If any child of mine has died before me but leaving a child or children living at my death, such child or children shall take by substitution and if more than one in equal shares the share which their parent would have taken had they survived me.` +
        under18Notice
    } else if (r.secondary_equal === 'no' && r.secondary_custom) {
      secondaryClause = `If ${spouseRef} does not survive me by twenty-eight days: ${r.secondary_custom}`
    } else if (childCount > 0) {
      secondaryClause =
        `If ${spouseRef} does not survive me by twenty-eight days, I give the whole of my estate to my Trustees to hold in equal shares for my children:\n${childrenList}` +
        under18Notice
    }

  } else {
    // Single will — children as primary beneficiaries
    if (r.primary_beneficiary_type === 'children' && childCount > 0) {
      dispositionClause =
        `I give the whole of my estate to my Trustees to hold upon the following trusts:\n\n` +
        `(a) My Trustees shall divide my estate into as many equal shares as there are children of mine living at my death, and hold one such share for each child upon the terms set out below.\n\n` +
        `(b) The children of mine living at my death are:\n${childrenList}\n` +
        `(c) If any child of mine has died before me but leaving a child or children living at my death, such child or children shall take by substitution and if more than one in equal shares the share which their parent would have taken had they survived me.` +
        under18Notice
      secondaryClause = '' // children are already primary — no secondary needed

    } else {
      // Single will — named primary beneficiary
      dispositionClause = `I give the whole of my estate to ${caps(r.beneficiary_name || '')} of ${r.beneficiary_address || ''} absolutely, provided they survive me by twenty-eight days.`

      const namedParty = r.beneficiary_name || 'my primary beneficiary'
      if (r.secondary_equal !== 'no' && childCount > 0) {
        secondaryClause =
          `If ${namedParty} does not survive me by twenty-eight days, I give the whole of my estate to my Trustees to hold upon the following trusts:\n\n` +
          `(a) My Trustees shall divide my estate into as many equal shares as there are children of mine living at my death, and hold one such share for each child upon the terms set out below.\n\n` +
          `(b) The children of mine living at my death are:\n${childrenList}\n` +
          `(c) If any child of mine has died before me but leaving a child or children living at my death, such child or children shall take by substitution and if more than one in equal shares the share which their parent would have taken had they survived me.` +
          under18Notice
      } else if (r.secondary_equal === 'no' && r.secondary_custom) {
        secondaryClause = `If ${namedParty} does not survive me by twenty-eight days: ${r.secondary_custom}`
      } else if (childCount > 0) {
        secondaryClause =
          `If ${namedParty} does not survive me by twenty-eight days, I give the whole of my estate to my Trustees to hold in equal shares for my children:\n${childrenList}` +
          under18Notice
      }
    }
  }

  // ── trust for children
  const hasTrust = childCount > 0
  const vestingText = inheritanceClause(r.inheritance_age, r.inheritance_age_custom)

  // ── business interests
  const hasBusiness = r.business_interests_yes === 'yes'

  // ── exclusions (per-testator for mirror wills)
  const exclusionsYesKey  = isPrimary ? 'exclusions_yes'     : 'partner_exclusions_yes'
  const exclusionsDetails = isPrimary ? r.exclusions_details : r.partner_exclusions_details
  const hasExclusions     = r[exclusionsYesKey] === 'yes' && exclusionsDetails

  // ── pronoun helper
  const pronoun = 'their'
  const pronoun2 = 'them'

  return `You are a professional will drafting assistant. Using the structure and boilerplate below, produce a complete, properly formatted Last Will and Testament.

RULES:
- Keep all boilerplate text EXACTLY word for word — do not paraphrase
- Insert the customer data exactly where shown
- Number all clauses sequentially — if a clause is omitted, renumber all following clauses
- Format names of named parties in CAPITALS throughout — always use the full name exactly as provided, never shorten, abbreviate, or omit any part of it
- Use "their/them" as gender-neutral pronouns for the testator
- Wrap every piece of customer-specific data in **double asterisks**: full names, dates of birth, addresses, specific gift details, business interests, exclusion details, and any other data taken from the questionnaire
- ALWAYS write addresses on a single line separated by commas — NEVER break an address across multiple lines
- Return ONLY the completed will document — no commentary, no preamble

---

LAST WILL AND TESTAMENT
OF ${caps(tName)}

I, ${caps(tName)}, of ${tAddress || '[address]'}, born on the ${formatDob(tDob)}, hereby revoke all former wills and testamentary dispositions made by me and declare this to be my last will.

1. APPOINTMENT OF EXECUTORS AND TRUSTEES

1.1 I appoint as my Executors and Trustees:
${executorClause}

1.2 In this will, my Executors and Trustees are together called "my Trustees" and the term includes any substituted or additional trustees.

2. APPOINTMENT OF GUARDIANS

${guardianClause}

3. FUNERAL WISHES

3.1 ${funeral}
3.2 I request that my Executors give effect to this wish, but I acknowledge that this expression of my wishes is not binding upon them.

4. PAYMENT OF DEBTS AND EXPENSES

4.1 My Trustees shall pay my funeral and testamentary expenses and debts out of my estate.

${hasGifts ? '5. ' + giftsClause + '\n\n' : ''}[NEXT_CLAUSE]. DISPOSITION OF ESTATE

[NEXT_CLAUSE].1 Gift to ${productType === 'mirror' ? 'Spouse' : 'Primary Beneficiary'}
${dispositionClause}

${secondaryClause ? `[NEXT_CLAUSE].2 ${productType === 'mirror' ? 'Gift to Children (if spouse does not survive)' : 'Gift if Primary Beneficiary does not survive'}\n${secondaryClause}` : ''}

${hasTrust ? `[NEXT_CLAUSE]. TRUST FOR CHILDREN

[NEXT_CLAUSE].1 Vesting Ages
Each child\'s share shall be held upon trust for that child and shall vest in ${pronoun2} as follows:
${vestingText}

[NEXT_CLAUSE].2 Maintenance and Advancement
Until a child becomes entitled to their share absolutely, my Trustees may apply the income and capital of that child\'s share for their maintenance, education, advancement, or benefit.

[NEXT_CLAUSE].3 Accumulation of Income
Any income not so applied shall be accumulated and added to capital.

[NEXT_CLAUSE].4 Death Before Vesting
If any child dies before becoming entitled to their whole share, that share or the part of it not already vested shall be held for the children of that deceased child who attain eighteen years and if more than one in equal shares, but if there are no such children then that share shall be divided equally among my other children (or their children by substitution as provided above).

` : ''}${hasBusiness ? `[NEXT_CLAUSE]. BUSINESS INTERESTS

[NEXT_CLAUSE].1 My Trustees shall have full power to manage, continue, or dispose of any business interests forming part of my estate in such manner as they think fit, with the objective of managing such interests in the most tax-efficient manner possible.

[NEXT_CLAUSE].2 My Trustees may retain any business interests for such period as they think fit and shall not be liable for any loss arising from the retention or management of such business interests provided they have acted in good faith.

` : ''}${hasExclusions ? `[NEXT_CLAUSE]. EXCLUSIONS

[NEXT_CLAUSE].1 I specifically exclude the following person(s) from benefiting in any way from my estate, whether under the terms of this will or on an intestacy: ${exclusionsDetails}

` : ''}[NEXT_CLAUSE]. GENERAL ADMINISTRATIVE PROVISIONS

[NEXT_CLAUSE].1 Investment Powers
My Trustees shall have the same full and unrestricted powers of investing and transposing investments in all respects as if they were absolutely entitled beneficially.

[NEXT_CLAUSE].2 Appropriation
My Trustees may appropriate any part of my estate in its actual state of investment in or towards satisfaction of any legacy or share without the consent of any person and may determine the value of such appropriation.

[NEXT_CLAUSE].3 Insurance
My Trustees may insure any property forming part of my estate against any risk and pay the premiums out of income or capital.

[NEXT_CLAUSE].4 Professional Trustees
Any Trustee being a solicitor or other person engaged in any profession or business may charge and be paid all usual professional and business charges for work done by them or their firm.

[NEXT_CLAUSE].5 Delegation
My Trustees shall have power to delegate any of their functions in accordance with the provisions of the Trustee Act 2000.

[NEXT_CLAUSE].6 Statutory Powers
My Trustees shall have all the powers conferred by the Trustee Act 2000 and any other relevant legislation.

[NEXT_CLAUSE]. DECLARATIONS

[NEXT_CLAUSE].1 I declare that I am of sound mind, memory, and understanding.
[NEXT_CLAUSE].2 I declare that I make this will voluntarily and without any undue influence or pressure from any person.
[NEXT_CLAUSE].3 I declare that I understand the nature and effect of this will and the extent of my property.

[NEXT_CLAUSE]. ATTESTATION CLAUSE

I sign this will on the _____ day of _______________ 20_____.

Signed by ${caps(tName)} as their last will and testament, in our presence, and then by us in theirs:

Signature of Testator: _________________________________
${caps(tName)}

FIRST WITNESS
Signature: _________________________________
Full Name: _________________________________
Address: _________________________________
Occupation: _________________________________
Date: _________________________________

SECOND WITNESS
Signature: _________________________________
Full Name: _________________________________
Address: _________________________________
Occupation: _________________________________
Date: _________________________________

---

Now produce the complete will above, replacing all [NEXT_CLAUSE] placeholders with correct sequential clause numbers, and inserting all customer data exactly as provided. Return only the finished document, followed exactly by this next steps page word for word:

=== NEXT STEPS PAGE ===

IMPORTANT — NEXT STEPS TO MAKE YOUR WILL LEGAL

Your will has been prepared in accordance with the Wills Act 1837. However, it is not yet legally valid. You must complete the following steps before this document takes effect.

STEP 1 — PRINT YOUR WILL
Print all pages of this document. Do not alter or annotate any part of the will after printing.

STEP 2 — SIGN YOUR WILL
Sign at the bottom of the last page in the presence of both witnesses at the same time. Use your usual signature.

STEP 3 — YOUR WITNESSES MUST SIGN
Both witnesses must sign the will in your presence and in the presence of each other. They must be:
- Aged 18 or over
- Not named as a beneficiary in the will
- Not married to or in a civil partnership with a beneficiary

STEP 4 — STORE YOUR WILL SAFELY
Keep the original in a secure location — a fireproof safe, solicitor's storage, or the Probate Registry. Tell your executor where it is kept.

STEP 5 — TELL YOUR EXECUTOR
Inform your appointed executor that they are named in your will and where the document is stored.

---

Wills Assured provides a guided will writing service. This document has been prepared based on the information you provided. We recommend reviewing your will every 3–5 years or following any significant life event such as marriage, divorce, birth of a child, or a significant change in assets.

For support, contact us at hello@willsassured.co.uk`
}

// ─── main handler ────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    // Verify JWT and get user
    const authHeader = req.headers.get('Authorization') ?? ''
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorised' }), { status: 401, headers: cors })
    }

    // Fetch will responses
    const { data: willResponse, error: fetchError } = await supabase
      .from('will_responses')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (fetchError || !willResponse) {
      return new Response(JSON.stringify({ error: 'Questionnaire not found' }), { status: 404, headers: cors })
    }

    const r           = willResponse.responses as Record<string, any>
    const productType = willResponse.product_type as 'single' | 'mirror'
    const testatorsToGenerate: ('primary' | 'partner')[] =
      productType === 'mirror' ? ['primary', 'partner'] : ['primary']

    const results: { testator_key: string; id: string }[] = []

    for (const testatorKey of testatorsToGenerate) {
      const prompt = buildPrompt(productType, testatorKey, r)

      const message = await anthropic.messages.create({
        model:      'claude-sonnet-4-6',
        max_tokens: 4096,
        messages:   [{ role: 'user', content: prompt }],
      })

      const willText = (message.content[0] as { type: string; text: string }).text

      // Upsert into generated_wills
      const { data: inserted, error: insertError } = await supabase
        .from('generated_wills')
        .upsert({
          user_id:      user.id,
          product_type: productType,
          testator_key: testatorKey,
          will_text:    willText,
        }, { onConflict: 'user_id,product_type,testator_key' })
        .select('id')
        .single()

      if (insertError) throw new Error(insertError.message)
      results.push({ testator_key: testatorKey, id: inserted.id })
    }

    return new Response(JSON.stringify({ success: true, wills: results }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('generate-will error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
