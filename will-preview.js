// ================================================================
// WILL-PREVIEW.JS — Fetches and renders a generated will document
// ================================================================

async function initWillPreview() {
  const container = document.getElementById('willDocument')
  if (!container) return

  const { data: { user } } = await sb.auth.getUser()
  if (!user) { window.location.href = 'login.html'; return }

  const params      = new URLSearchParams(window.location.search)
  const willId      = params.get('id')
  const testatorKey = params.get('testator') || 'primary'

  let query = _sb
    .from('generated_wills')
    .select('will_text, testator_key, product_type')
    .eq('user_id', user.id)

  if (willId) {
    query = query.eq('id', willId)
  } else {
    query = query.eq('testator_key', testatorKey)
  }

  const { data, error } = await query.maybeSingle()

  if (error || !data) {
    container.innerHTML = `
      <div style="text-align:center;padding:60px 0;color:var(--muted);">
        <p>Will not found. <a href="dashboard.html" style="color:var(--primary)">Return to dashboard &rarr;</a></p>
      </div>`
    return
  }

  // Set page title
  document.title = data.testator_key === 'partner'
    ? "Partner's Will — Wills Assured"
    : "Your Will — Wills Assured"

  // Render the will text as formatted HTML
  container.innerHTML = `<div class="will-brand-header">WillsAssured.co.uk</div>` + formatWillText(data.will_text)
}

function formatWillText(text) {
  if (!text) return ''

  // Split into will body and next steps page
  const parts       = text.split('=== NEXT STEPS PAGE ===')
  const willBody    = parts[0]
  const nextSteps   = parts[1] || ''

  return formatWillBody(willBody) + (nextSteps ? formatNextSteps(nextSteps) : '')
}

function formatNextSteps(text) {
  const lines = text.trim().split('\n')
  let html = '<div class="will-next-steps-page">'
  html += '<div class="will-next-steps-inner">'

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) { html += '<div class="will-spacer"></div>'; continue }
    if (trimmed.startsWith('IMPORTANT —') || trimmed.startsWith('IMPORTANT-')) {
      html += `<h2 class="will-next-steps-title">${trimmed}</h2>`
    } else if (trimmed.startsWith('STEP ')) {
      html += `<h3 class="will-next-steps-step">${trimmed}</h3>`
    } else if (trimmed.startsWith('- ')) {
      html += `<p class="will-next-steps-bullet">&#8226; ${trimmed.slice(2)}</p>`
    } else if (trimmed === '---') {
      html += '<hr class="will-next-steps-rule"/>'
    } else if (trimmed.startsWith('Wills Assured provides')) {
      html += `<p class="will-next-steps-footer">${trimmed}</p>`
    } else if (trimmed.startsWith('For support')) {
      html += `<p class="will-next-steps-footer">${trimmed}</p>`
    } else {
      html += `<p class="will-next-steps-para">${trimmed}</p>`
    }
  }

  html += '</div></div>'
  return html
}

function formatWillBody(text) {
  let html     = ''
  let inAttest = false
  let firstClause = true

  // Bold any **customer data** markers from Claude
  function applyBold(str) {
    return str.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) {
      html += '<div class="will-spacer"></div>'
      continue
    }

    // Document title lines (first two non-empty lines)
    if (trimmed === 'LAST WILL AND TESTAMENT') {
      html += `<h1 class="will-doc-title">${trimmed}</h1>`
      continue
    }
    if (trimmed.startsWith('OF ') && i < 5) {
      html += `<h1 class="will-doc-title">${applyBold(trimmed)}</h1>`
      html += '<div class="will-title-rule"></div>'
      continue
    }

    // Opening paragraph (I, NAME, of...)
    if (trimmed.startsWith('I, ') && trimmed.includes('hereby revoke')) {
      html += `<p class="will-opening">${applyBold(trimmed)}</p>`
      continue
    }

    // Main clause headings (e.g. "1. APPOINTMENT OF EXECUTORS")
    if (/^\d+\.\s+[A-Z]/.test(trimmed)) {
      if (!firstClause) html += '<hr class="will-section-rule">'
      html += `<h2 class="will-clause-heading">${trimmed}</h2>`
      firstClause = false
      continue
    }

    // Sub-clause headings (e.g. "1.1 I appoint...")
    if (/^\d+\.\d+\s/.test(trimmed)) {
      html += `<p class="will-subclause"><strong>${trimmed.match(/^\d+\.\d+/)[0]}</strong> ${applyBold(trimmed.replace(/^\d+\.\d+\s/, ''))}</p>`
      continue
    }

    // Lettered sub-items
    if (/^\([a-z]\)/.test(trimmed)) {
      html += `<p class="will-subitem">${applyBold(trimmed)}</p>`
      continue
    }

    // Indented names/addresses (lines starting with spaces/bullet in original)
    if (line.startsWith('  ') || line.startsWith('\t')) {
      html += `<p class="will-indented">${applyBold(trimmed)}</p>`
      continue
    }

    // Attestation section
    if (trimmed.startsWith('I sign this will') || trimmed.startsWith('IN WITNESS whereof')) {
      inAttest = true
      html += `<p class="will-attest">${applyBold(trimmed)}</p>`
      continue
    }

    if (inAttest) {
      if (trimmed.includes('_____')) {
        html += `<p class="will-signature-line">${applyBold(trimmed)}</p>`
      } else if (trimmed === 'FIRST WITNESS' || trimmed === 'SECOND WITNESS') {
        html += `<h3 class="will-witness-heading">${trimmed}</h3>`
      } else {
        html += `<p class="will-attest">${applyBold(trimmed)}</p>`
      }
      continue
    }

    // Default paragraph
    html += `<p class="will-para">${applyBold(trimmed)}</p>`
  }

  return html
}

const _sb = window.supabase
  ? window.supabase.createClient(
      'https://fgyqumgvmllhiqdmgrfc.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZneXF1bWd2bWxsaGlxZG1ncmZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5MzQ1NDYsImV4cCI6MjA5MjUxMDU0Nn0.GwQsnXsraNegEqdYASRwagOxMgyAZg2iNXzP3Syqii8'
    )
  : null

initWillPreview()
