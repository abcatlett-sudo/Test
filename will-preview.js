// ================================================================
// WILL-PREVIEW.JS — Fetches and renders a generated will document
// ================================================================

function buildPdfFilename(willText, isoDate) {
  // Extract testator name from the "OF JOHN MICHAEL SMITH" line
  const ofLine = (willText || '').split('\n').map(l => l.trim()).find(l => l.startsWith('OF '))
  const capsName = ofLine ? ofLine.replace(/^OF\s+/, '').trim() : ''

  // Convert JOHN MICHAEL SMITH → John_Michael_Smith
  const namePart = capsName
    ? capsName.split(/\s+/).map(w => w.charAt(0) + w.slice(1).toLowerCase()).join('_')
    : 'Will'

  // Format date as DDMMYYYY
  const d    = isoDate ? new Date(isoDate) : new Date()
  const dd   = String(d.getDate()).padStart(2, '0')
  const mm   = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()

  return `${namePart}_Will_${dd}${mm}${yyyy}`
}

async function initWillPreview() {
  const container = document.getElementById('willDocument')
  if (!container) return

  const { data: { user } } = await sb.auth.getUser()
  if (!user) { window.location.href = 'login.html'; return }

  const params      = new URLSearchParams(window.location.search)
  const willId      = params.get('id')
  const testatorKey = params.get('testator') || 'primary'

  let query = sb
    .from('generated_wills')
    .select('will_text, testator_key, product_type, created_at')
    .eq('user_id', user.id)

  if (willId) {
    query = query.eq('id', willId)
  } else {
    query = query.eq('testator_key', testatorKey)
  }

  const { data, error } = await query.maybeSingle()

  if (error || !data) {
    console.error('[will-preview] fetch error:', error)
    container.innerHTML = `
      <div style="text-align:center;padding:60px 0;color:var(--muted);">
        <p>Will not found. <a href="dashboard.html" style="color:var(--primary)">Return to dashboard &rarr;</a></p>
      </div>`
    return
  }

  // Build PDF filename: extract name from will text "OF JOHN MICHAEL SMITH" line
  const pdfFilename = buildPdfFilename(data.will_text, data.created_at)

  // Human-readable tab title
  document.title = data.testator_key === 'partner'
    ? "Partner's Will — Wills Assured"
    : "Your Will — Wills Assured"

  // Wire download button to set filename-as-title before print dialog opens
  const downloadBtn = document.querySelector('.will-download-btn')
  if (downloadBtn) {
    downloadBtn.onclick = () => {
      const humanTitle   = document.title
      document.title     = pdfFilename
      window.print()
      document.title     = humanTitle
    }
  }

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
  if (!text) return ''

  // Collapse any **...** markers that Claude wrapped across multiple lines
  // into a single line before splitting, so applyBold always finds a match
  text = text.replace(/\*\*([\s\S]+?)\*\*/g, (_, inner) =>
    `**${inner.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()}**`
  )

  const lines  = text.split('\n')
  let html     = ''
  let inAttest = false
  let firstClause = true

  // Escape HTML entities before inserting into innerHTML
  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  // Bold any **customer data** markers from Claude — escape first, then inject safe <strong> tags
  function applyBold(str) {
    return escapeHtml(str).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
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

    // Opening paragraph (I, NAME, of...) — may span multiple lines if address is multi-line
    if (trimmed.startsWith('I, ')) {
      let para = trimmed
      while (i + 1 < lines.length && !lines[i + 1].trim().startsWith('1.') && !lines[i + 1].trim().startsWith('I,') && lines[i + 1].trim() !== '') {
        if (para.includes('hereby revoke')) break
        i++
        para += ' ' + lines[i].trim()
      }
      html += `<p class="will-opening">${applyBold(para)}</p>`
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

initWillPreview()
