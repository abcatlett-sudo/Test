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
  container.innerHTML = `<div class="will-brand-header">Wills Assured</div>` + formatWillText(data.will_text)
}

function formatWillText(text) {
  if (!text) return ''

  const lines = text.split('\n')
  let html    = ''
  let inAttest = false

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
      html += `<h1 class="will-doc-title">${trimmed}</h1>`
      html += '<div class="will-title-rule"></div>'
      continue
    }

    // Opening paragraph (I, NAME, of...)
    if (trimmed.startsWith('I, ') && trimmed.includes('hereby revoke')) {
      html += `<p class="will-opening">${trimmed}</p>`
      continue
    }

    // Main clause headings (e.g. "1. APPOINTMENT OF EXECUTORS")
    if (/^\d+\.\s+[A-Z]/.test(trimmed)) {
      html += `<h2 class="will-clause-heading">${trimmed}</h2>`
      continue
    }

    // Sub-clause headings (e.g. "1.1 I appoint...")
    if (/^\d+\.\d+\s/.test(trimmed)) {
      html += `<p class="will-subclause"><strong>${trimmed.match(/^\d+\.\d+/)[0]}</strong> ${trimmed.replace(/^\d+\.\d+\s/, '')}</p>`
      continue
    }

    // Lettered sub-items
    if (/^\([a-z]\)/.test(trimmed)) {
      html += `<p class="will-subitem">${trimmed}</p>`
      continue
    }

    // Indented names/addresses (lines starting with spaces/bullet in original)
    if (line.startsWith('  ') || line.startsWith('\t')) {
      html += `<p class="will-indented">${trimmed}</p>`
      continue
    }

    // Attestation section
    if (trimmed.startsWith('IN WITNESS whereof')) {
      inAttest = true
      html += `<p class="will-attest">${trimmed}</p>`
      continue
    }

    if (inAttest) {
      if (trimmed.includes('_____')) {
        html += `<p class="will-signature-line">${trimmed}</p>`
      } else if (trimmed === 'FIRST WITNESS' || trimmed === 'SECOND WITNESS') {
        html += `<h3 class="will-witness-heading">${trimmed}</h3>`
      } else {
        html += `<p class="will-attest">${trimmed}</p>`
      }
      continue
    }

    // Default paragraph
    html += `<p class="will-para">${trimmed}</p>`
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
