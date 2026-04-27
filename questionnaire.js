// ================================================================
// QUESTIONNAIRE.JS — Mirror Will guided questionnaire
// One step at a time, auto-saved to Supabase on every advance.
// ================================================================

const PRODUCT_TYPE = 'mirror';

const SECTIONS = [
  { id: 'about',     label: 'About You & Your Partner' },
  { id: 'family',    label: 'Your Family'               },
  { id: 'wishes',    label: 'Your Wishes'               },
  { id: 'executors', label: 'Executors'                 },
  { id: 'estate',    label: 'Your Estate'               },
  { id: 'final',     label: 'Final Details'             },
];

const STEPS = [
  // ── SECTION 1: About You & Your Partner ─────────────────────
  {
    id: 'your_details',
    section: 'about',
    icon: '&#128100;',
    title: 'Your details',
    subtitle: 'These will appear on your will exactly as entered — please use your full legal name.',
    type: 'fields',
    fields: [
      { key: 'your_full_name', label: 'Full legal name', type: 'text',     placeholder: 'e.g. Jane Elizabeth Smith',        required: true  },
      { key: 'your_dob',       label: 'Date of birth',   type: 'date',     placeholder: '',                                 required: true  },
      { key: 'your_address',   label: 'Home address',    type: 'textarea', placeholder: 'Full address including postcode',  required: true  },
    ],
  },
  {
    id: 'partner_details',
    section: 'about',
    icon: '&#128145;',
    title: "Your partner's details",
    subtitle: 'These will appear on their will exactly as entered.',
    type: 'fields',
    fields: [
      { key: 'partner_full_name', label: 'Full legal name', type: 'text',     placeholder: 'e.g. David William Smith',         required: true  },
      { key: 'partner_dob',       label: 'Date of birth',   type: 'date',     placeholder: '',                                 required: true  },
      { key: 'partner_address',   label: 'Home address',    type: 'textarea', placeholder: 'Full address including postcode',  required: false, hint: 'Leave blank if the same as yours' },
    ],
  },
  {
    id: 'confirmation',
    section: 'about',
    icon: '&#9989;',
    title: 'A few important declarations',
    subtitle: 'These statements are required for your wills to be legally valid. Please confirm each one.',
    type: 'checkboxes',
    requireAll: true,
    options: [
      { key: 'confirm_over_18',    label: 'We are both over 18 years of age' },
      { key: 'confirm_sound_mind', label: 'We are both of sound mind and fully understand what we are signing' },
      { key: 'confirm_voluntary',  label: 'We are making these wills freely and voluntarily, without any pressure or coercion' },
      { key: 'confirm_partners',   label: 'We are partners — married, in a civil partnership, or cohabiting' },
    ],
  },
  // ── SECTION 2: Your Family ───────────────────────────────────
  {
    id: 'children',
    section: 'family',
    icon: '&#128106;',
    title: 'Do you have any children?',
    subtitle: 'Include all children — biological, adopted, or step-children you wish to include in your will.',
    type: 'children',
  },
  {
    id: 'guardians',
    section: 'family',
    icon: '&#128739;',
    title: 'Appointing guardians',
    subtitle: 'If you both passed away, who would you trust to care for your children? Guardians must be over 18.',
    type: 'fields',
    showIf: (r) => parseInt(r.children_count || 0) > 0,
    fields: [
      { key: 'guardian_name',    label: "Guardian's full name", type: 'text',     placeholder: 'e.g. Sarah Louise Jones',        required: true },
      { key: 'guardian_address', label: "Guardian's address",   type: 'textarea', placeholder: 'Full address including postcode', required: true },
    ],
  },
  // ── SECTION 3: Your Wishes ───────────────────────────────────
  {
    id: 'primary_wish',
    section: 'wishes',
    icon: '&#128140;',
    title: 'If one of you passes away first',
    subtitle: 'This is your primary wish — it sets out what happens when the first partner dies.',
    type: 'yesno_with_text',
    key: 'primary_wish_yes',
    yesLabel: 'Yes — everything passes to the surviving partner absolutely',
    noLabel:  'No — I have different wishes',
    textKey:        'primary_wish_custom',
    textLabel:      'Please describe your wishes',
    textPlaceholder:'Describe how you\'d like your estate to be divided...',
  },
  {
    id: 'secondary_wish',
    section: 'wishes',
    icon: '&#9878;&#65039;',
    title: 'If you both pass away',
    subtitle: 'This covers what happens if you both die at the same time, or within 28 days of each other.',
    type: 'secondary_wish',
  },
  {
    id: 'inheritance_age',
    section: 'wishes',
    icon: '&#127881;',
    title: 'At what age should your children inherit?',
    subtitle: 'Choose when your children should receive their inheritance. Delaying can provide important financial protection.',
    type: 'options',
    key: 'inheritance_age',
    required: true,
    options: [
      { value: '18',     label: '18 years old',         description: 'At the age of legal adulthood'       },
      { value: '21',     label: '21 years old',         description: 'A little more financial maturity'    },
      { value: '25',     label: '25 years old',         description: 'Greater financial responsibility'    },
      { value: 'staged', label: 'Staged',               description: 'Half at 21, the remainder at 25'     },
      { value: 'custom', label: 'Custom arrangement',   description: 'I\'d like to specify my own terms'   },
    ],
  },
  // ── SECTION 4: Executors ─────────────────────────────────────
  {
    id: 'executor_surviving',
    section: 'executors',
    icon: '&#128203;',
    title: 'Executor if one of you passes away',
    subtitle: 'An executor <span class="quest-info-icon" data-tip="An executor is the person legally responsible for carrying out the instructions in your will — settling debts, distributing assets, and handling the estate administration.">&#9432;</span> is the person who carries out the wishes in your will.',
    type: 'yesno',
    key: 'executor_surviving_yes',
    yesLabel: 'Yes — the surviving partner will be the executor',
    noLabel:  'No — I\'d like to appoint someone else',
  },
  {
    id: 'executor_both',
    section: 'executors',
    icon: '&#128101;',
    title: 'Executors if you both pass away',
    subtitle: 'You need two executors who are trustworthy, organised, and able to handle legal and financial matters. Ideally they should be under 70 and not benefit from the will.',
    type: 'executors',
  },
  // ── SECTION 5: Your Estate ───────────────────────────────────
  {
    id: 'net_assets',
    section: 'estate',
    icon: '&#127968;',
    title: 'Your net assets',
    subtitle: 'This covers everything you own — property, savings, investments, and personal possessions.',
    type: 'yesno_with_text',
    key: 'net_assets_yes',
    yesLabel: 'Yes — net assets pass to each other; if we both pass, equally to our children',
    noLabel:  'No — I have a different arrangement in mind',
    textKey:        'net_assets_custom',
    textLabel:      'Please describe your wishes',
    textPlaceholder:'Describe how you\'d like your net assets distributed...',
  },
  {
    id: 'business_interests',
    section: 'estate',
    icon: '&#128188;',
    title: 'Business interests',
    subtitle: 'If you own a business or hold business interests, this clause ensures they are handled in the most tax-efficient way.',
    type: 'yesno',
    key: 'business_interests_yes',
    yesLabel: 'Yes — business interests pass to each other, managed tax-efficiently by the executor',
    noLabel:  'No — we have no business interests, or have different wishes',
  },
  {
    id: 'specific_gifts',
    section: 'estate',
    icon: '&#127873;',
    title: 'Specific gifts or charitable donations',
    subtitle: 'Would you like to leave specific items — jewellery, artwork, a family heirloom — to particular people, or make a charitable donation?',
    type: 'yesno_with_text',
    key: 'specific_gifts_yes',
    showTextOn: 'yes',
    noFirst: true,
    yesLabel: 'Yes — I\'d like to leave specific gifts',
    noLabel:  'No specific gifts',
    textKey:        'specific_gifts_details',
    textLabel:      'Please describe the gifts or donations',
    textPlaceholder:'e.g. My grandmother\'s engagement ring to my daughter Emma...',
  },
  {
    id: 'exclusions',
    section: 'estate',
    icon: '&#128683;',
    title: 'Exclusions',
    subtitle: 'Is there anyone you specifically want to exclude from benefiting from your will? This is sometimes appropriate where there has been a family estrangement.',
    type: 'yesno_with_text',
    key: 'exclusions_yes',
    showTextOn: 'yes',
    noFirst: true,
    yesLabel: 'Yes — I want to exclude specific people',
    noLabel:  'No exclusions',
    textKey:        'exclusions_details',
    textLabel:      'Please name the person(s) you wish to exclude and the reason',
    textPlaceholder:'e.g. John Smith — estranged since 2015...',
  },
  // ── SECTION 6: Final Details ─────────────────────────────────
  {
    id: 'previous_wills',
    section: 'final',
    icon: '&#128196;',
    title: 'Revoking previous wills',
    subtitle: 'If you have an existing will, it\'s important to formally revoke it to ensure there is no ambiguity.',
    type: 'checkbox_confirm',
    key: 'previous_wills_confirmed',
    label: 'I confirm that this will revokes and replaces any and all previous wills I have made',
  },
  {
    id: 'funeral_wishes',
    section: 'final',
    icon: '&#127774;',
    title: 'Funeral wishes',
    subtitle: 'This is optional, but many people find it a comfort to leave clear guidance for their loved ones.',
    type: 'textarea_optional',
    key: 'funeral_wishes',
    placeholder: 'e.g. I would prefer cremation, with a small family gathering at a location of their choosing...',
  },
  {
    id: 'witnesses',
    section: 'final',
    icon: '&#9997;&#65039;',
    title: 'Signing your will',
    subtitle: 'Your will must be signed in the presence of two independent witnesses to be legally valid in England and Wales.',
    type: 'checkbox_confirm',
    key: 'witnesses_confirmed',
    label: 'I understand that I must sign my will in the presence of two independent witnesses who are: over 18, not named as beneficiaries in the will, and not related to any beneficiaries',
  },
];


// ================================================================
// STATE
// ================================================================

let currentStep = 0;
let responses   = {};
let responseId  = null;


// ================================================================
// HELPERS
// ================================================================

function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function getVisibleSteps() {
  return STEPS.filter(s => !s.showIf || s.showIf(responses));
}

function sectionLabel() {
  const steps = getVisibleSteps();
  const step  = steps[currentStep];
  return SECTIONS.find(s => s.id === step?.section)?.label || '';
}


// ================================================================
// INIT
// ================================================================

async function initQuestionnaire() {
  const main = document.getElementById('questMain');
  if (!main) return;

  const { data: { user } } = await sb.auth.getUser();
  if (!user) { window.location.href = 'login.html'; return; }

  const { data: existing } = await sb
    .from('will_responses')
    .select('*')
    .eq('user_id', user.id)
    .eq('product_type', PRODUCT_TYPE)
    .maybeSingle();

  if (existing) {
    responses   = existing.responses   || {};
    currentStep = existing.current_step || 0;
    responseId  = existing.id;
    // clamp in case steps shifted
    currentStep = Math.min(currentStep, getVisibleSteps().length - 1);
  }

  renderStep();
}


// ================================================================
// RENDER
// ================================================================

function renderStep() {
  const steps   = getVisibleSteps();
  const step    = steps[currentStep];
  const main    = document.getElementById('questMain');
  const pct     = Math.round((currentStep / steps.length) * 100);
  const isLast  = currentStep === steps.length - 1;

  document.getElementById('questProgressBar').style.width = pct + '%';
  document.getElementById('questProgressLabel').textContent =
    `${sectionLabel()} — Step ${currentStep + 1} of ${steps.length}`;

  const fieldHTML = buildStepHTML(step);

  main.innerHTML = `
    <div class="quest-card quest-card-enter">
      <div class="quest-section-tag">${esc(sectionLabel())}</div>
      <div class="quest-icon">${step.icon}</div>
      <h2 class="quest-title">${step.title}</h2>
      <p class="quest-subtitle">${step.subtitle}</p>
      <div class="quest-fields">${fieldHTML}</div>
      <div class="quest-nav-btns">
        ${currentStep > 0
          ? '<button class="btn btn-ghost" id="questBack">&#8592; Back</button>'
          : '<span></span>'}
        <button class="btn btn-primary" id="questNext">
          ${isLast ? 'Complete &#10003;' : 'Continue &#8594;'}
        </button>
      </div>
    </div>`;

  requestAnimationFrame(() =>
    main.querySelector('.quest-card')?.classList.add('quest-card-visible')
  );

  attachListeners(step);
}

function buildStepHTML(step) {
  switch (step.type) {
    case 'fields':          return step.fields.map(renderField).join('');
    case 'checkboxes':      return renderCheckboxes(step);
    case 'options':         return renderOptions(step);
    case 'yesno':           return renderYesNo(step);
    case 'yesno_with_text': return renderYesNoWithText(step);
    case 'children':        return renderChildren();
    case 'secondary_wish':  return renderSecondaryWish();
    case 'executors':       return renderExecutors();
    case 'checkbox_confirm':return renderCheckboxConfirm(step);
    case 'textarea_optional':return renderTextareaOptional(step);
    default:                return '';
  }
}

function renderField(f) {
  const val = esc(responses[f.key] || '');
  const input = f.type === 'textarea'
    ? `<textarea class="quest-input quest-textarea" name="${f.key}" placeholder="${esc(f.placeholder || '')}" rows="3">${val}</textarea>`
    : `<input class="quest-input" type="${f.type}" name="${f.key}" placeholder="${esc(f.placeholder || '')}" value="${val}" />`;
  return `
    <div class="quest-field">
      <label class="quest-label">${f.label}${!f.required ? ' <span class="quest-optional">Optional</span>' : ''}</label>
      ${f.hint ? `<p class="quest-hint">${f.hint}</p>` : ''}
      ${input}
    </div>`;
}

function renderCheckboxes(step) {
  return `<div class="quest-check-list">${step.options.map(o => `
    <label class="quest-check-item${responses[o.key] ? ' checked' : ''}">
      <input type="checkbox" name="${o.key}"${responses[o.key] ? ' checked' : ''} />
      <span class="quest-check-box"></span>
      <span class="quest-check-label">${o.label}</span>
    </label>`).join('')}</div>`;
}

function renderOptions(step) {
  return `<div class="quest-options-grid">${step.options.map(o => `
    <button class="quest-option${responses[step.key] === o.value ? ' selected' : ''}" data-key="${step.key}" data-value="${o.value}">
      <strong>${o.label}</strong>
      <span>${o.description}</span>
    </button>`).join('')}</div>`;
}

function renderYesNo(step) {
  return `<div class="quest-options-grid quest-yesno">${[
    { value: 'yes', label: step.yesLabel },
    { value: 'no',  label: step.noLabel  },
  ].map(o => `
    <button class="quest-option${responses[step.key] === o.value ? ' selected' : ''}" data-key="${step.key}" data-value="${o.value}">
      ${o.label}
    </button>`).join('')}</div>`;
}

function renderYesNoWithText(step) {
  const trigger  = step.showTextOn || 'no';
  const showText = responses[step.key] === trigger;
  return `
    <div class="quest-options-grid quest-yesno">${(step.noFirst
      ? [{ value: 'no', label: step.noLabel }, { value: 'yes', label: step.yesLabel }]
      : [{ value: 'yes', label: step.yesLabel }, { value: 'no', label: step.noLabel }]
    ).map(o => `
      <button class="quest-option${responses[step.key] === o.value ? ' selected' : ''}" data-key="${step.key}" data-value="${o.value}">
        ${o.label}
      </button>`).join('')}</div>
    <div class="quest-conditional${showText ? ' visible' : ''}" id="conditionalText" data-show-on="${trigger}">
      <div class="quest-field" style="margin-top:16px;">
        <label class="quest-label">${step.textLabel}</label>
        <textarea class="quest-input quest-textarea" name="${step.textKey}" placeholder="${esc(step.textPlaceholder)}" rows="4">${esc(responses[step.textKey] || '')}</textarea>
      </div>
    </div>`;
}

function renderChildren() {
  const count = parseInt(responses.children_count || 0);
  return `
    <div class="quest-field">
      <label class="quest-label">How many children do you have?</label>
      <div class="quest-counter">
        <button type="button" class="quest-counter-btn" id="childMinus">&#8722;</button>
        <span class="quest-counter-val" id="childCount">${count}</span>
        <button type="button" class="quest-counter-btn" id="childPlus">&#43;</button>
      </div>
    </div>
    <div id="childrenFields">${buildChildFields(count)}</div>`;
}

function buildChildFields(count) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `
      <div class="quest-child-row">
        <div class="quest-child-num">Child ${i + 1}</div>
        <div class="quest-field">
          <label class="quest-label">Full legal name</label>
          <input class="quest-input" type="text" name="child_${i}_name" value="${esc(responses[`child_${i}_name`] || '')}" placeholder="e.g. Oliver James Smith" />
        </div>
        <div class="quest-field">
          <label class="quest-label">Date of birth</label>
          <input class="quest-input" type="date" name="child_${i}_dob" value="${esc(responses[`child_${i}_dob`] || '')}" />
        </div>
      </div>`;
  }
  return html;
}

function renderSecondaryWish() {
  const count    = parseInt(responses.children_count || 0);
  const isCustom = responses.secondary_equal === 'no';

  const btns = `
    <div class="quest-options-grid quest-yesno">
      <button class="quest-option${!isCustom ? ' selected' : ''}" data-key="secondary_equal" data-value="yes">
        Yes — divided equally between all our children
      </button>
      <button class="quest-option${isCustom ? ' selected' : ''}" data-key="secondary_equal" data-value="no">
        No — I want to specify percentages
      </button>
    </div>`;

  let pctFields = '';
  if (count > 0) {
    for (let i = 0; i < count; i++) {
      const name = esc(responses[`child_${i}_name`] || `Child ${i + 1}`);
      const defaultPct = Math.floor(100 / count);
      pctFields += `
        <div class="quest-pct-row">
          <span class="quest-label">${name}</span>
          <div class="quest-pct-input-wrap">
            <input class="quest-input quest-pct-input" type="number" name="child_${i}_pct" min="0" max="100" value="${esc(String(responses[`child_${i}_pct`] ?? defaultPct))}" />
            <span class="quest-pct-symbol">%</span>
          </div>
        </div>`;
    }
  } else {
    pctFields = `<textarea class="quest-input quest-textarea" name="secondary_custom" placeholder="Describe how you'd like your estate divided if you both pass away..." rows="4">${esc(responses.secondary_custom || '')}</textarea>`;
  }

  return `${btns}
    <div class="quest-conditional${isCustom ? ' visible' : ''}" id="pctFields">
      <p class="quest-hint" style="margin-top:16px;">Percentages must add up to 100%</p>
      ${pctFields}
    </div>`;
}

function renderExecutors() {
  const exec = (num, prefix) => `
    <div class="quest-executor-card">
      <div class="quest-executor-num">Executor ${num}</div>
      ${[
        { key: `${prefix}_name`,         label: 'Full name',           type: 'text',     placeholder: num === 1 ? 'e.g. Robert James Brown'   : 'e.g. Carol Ann Williams', required: true },
        { key: `${prefix}_address`,      label: 'Address',             type: 'textarea', placeholder: 'Full address including postcode',                                    required: true },
        { key: `${prefix}_relationship`, label: 'Relationship to you', type: 'text',     placeholder: 'e.g. Brother, Friend, Solicitor',                                    required: true },
      ].map(renderField).join('')}
    </div>`;

  return `<div class="quest-executor-grid">${exec(1,'executor1')}${exec(2,'executor2')}</div>`;
}

function renderCheckboxConfirm(step) {
  return `
    <label class="quest-confirm-item${responses[step.key] ? ' checked' : ''}">
      <input type="checkbox" name="${step.key}"${responses[step.key] ? ' checked' : ''} />
      <span class="quest-check-box"></span>
      <span class="quest-check-label">${step.label}</span>
    </label>`;
}

function renderTextareaOptional(step) {
  return `
    <div class="quest-field">
      <label class="quest-label">Your wishes <span class="quest-optional">Optional</span></label>
      <textarea class="quest-input quest-textarea" name="${step.key}" placeholder="${esc(step.placeholder)}" rows="5">${esc(responses[step.key] || '')}</textarea>
    </div>`;
}


// ================================================================
// EVENT LISTENERS
// ================================================================

function attachListeners(step) {
  // Back
  document.getElementById('questBack')?.addEventListener('click', () => {
    collectInputValues();
    currentStep--;
    renderStep();
    window.scrollTo(0, 0);
  });

  // Next / Complete
  document.getElementById('questNext')?.addEventListener('click', async () => {
    collectInputValues();
    if (!validateStep(step)) return;
    await persistResponses();
    const steps = getVisibleSteps();
    if (currentStep < steps.length - 1) {
      currentStep++;
      renderStep();
      window.scrollTo(0, 0);
    } else {
      await completeQuestionnaire();
    }
  });

  // Option / Yes-No buttons
  document.querySelectorAll('.quest-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const key    = btn.dataset.key;
      const value  = btn.dataset.value;
      btn.closest('.quest-options-grid').querySelectorAll('.quest-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      responses[key] = value;

      const conditional = document.getElementById('conditionalText') || document.getElementById('pctFields');
      if (conditional) {
        const showOn = conditional.dataset.showOn || 'no';
        conditional.classList.toggle('visible', value === showOn);
      }
    });
  });

  // Checkboxes
  document.querySelectorAll('.quest-check-item input, .quest-confirm-item input').forEach(cb => {
    cb.addEventListener('change', () => {
      cb.closest('.quest-check-item, .quest-confirm-item')?.classList.toggle('checked', cb.checked);
      responses[cb.name] = cb.checked;
    });
  });

  // Children counter
  document.getElementById('childMinus')?.addEventListener('click', () => {
    collectInputValues();
    const n = Math.max(0, parseInt(responses.children_count || 0) - 1);
    responses.children_count = n;
    document.getElementById('childCount').textContent = n;
    document.getElementById('childrenFields').innerHTML = buildChildFields(n);
    bindInputListeners();
  });

  document.getElementById('childPlus')?.addEventListener('click', () => {
    collectInputValues();
    const n = Math.min(12, parseInt(responses.children_count || 0) + 1);
    responses.children_count = n;
    document.getElementById('childCount').textContent = n;
    document.getElementById('childrenFields').innerHTML = buildChildFields(n);
    bindInputListeners();
  });

  // Info icon tooltip
  document.querySelectorAll('.quest-info-icon').forEach(icon => {
    icon.addEventListener('mouseenter', () => {
      const tip = document.createElement('div');
      tip.className   = 'quest-tooltip';
      tip.textContent = icon.dataset.tip;
      icon.appendChild(tip);
    });
    icon.addEventListener('mouseleave', () => {
      icon.querySelector('.quest-tooltip')?.remove();
    });
  });

  bindInputListeners();
}

function bindInputListeners() {
  document.querySelectorAll('.quest-input, .quest-textarea').forEach(el => {
    el.addEventListener('input', () => {
      if (el.name) responses[el.name] = el.value;
      el.classList.remove('quest-input-error');
      el.parentNode.querySelector('.quest-error')?.remove();
    });
  });
}

function collectInputValues() {
  document.querySelectorAll('.quest-input, .quest-textarea').forEach(el => {
    if (el.name) responses[el.name] = el.value;
  });
}


// ================================================================
// VALIDATION
// ================================================================

function validateStep(step) {
  const nextBtn = document.getElementById('questNext');

  if (step.type === 'fields') {
    for (const f of step.fields) {
      if (f.required && !String(responses[f.key] || '').trim()) {
        showFieldError(f.key, `Please enter your ${f.label.toLowerCase()}`);
        shakeBtn(nextBtn);
        return false;
      }
    }
  }

  if (step.type === 'checkboxes' && step.requireAll) {
    const allChecked = step.options.every(o => responses[o.key]);
    if (!allChecked) { shakeBtn(nextBtn); return false; }
  }

  if (step.type === 'options' && step.required && !responses[step.key]) {
    shakeBtn(nextBtn); return false;
  }

  if ((step.type === 'yesno' || step.type === 'yesno_with_text') && !responses[step.key]) {
    shakeBtn(nextBtn); return false;
  }

  if (step.type === 'checkbox_confirm' && !responses[step.key]) {
    shakeBtn(nextBtn); return false;
  }

  if (step.type === 'executors') {
    const required = ['executor1_name','executor1_address','executor1_relationship',
                      'executor2_name','executor2_address','executor2_relationship'];
    for (const key of required) {
      if (!String(responses[key] || '').trim()) {
        showFieldError(key, 'This field is required');
        shakeBtn(nextBtn);
        return false;
      }
    }
  }

  return true;
}

function shakeBtn(btn) {
  if (!btn) return;
  btn.classList.add('shake');
  setTimeout(() => btn.classList.remove('shake'), 500);
}

function showFieldError(key, message) {
  const input = document.querySelector(`[name="${key}"]`);
  if (!input) return;
  input.classList.add('quest-input-error');
  if (!input.parentNode.querySelector('.quest-error')) {
    const err = document.createElement('p');
    err.className   = 'quest-error';
    err.textContent = message;
    input.parentNode.appendChild(err);
  }
}


// ================================================================
// PERSIST
// ================================================================

async function persistResponses() {
  const statusEl = document.getElementById('questSaveStatus');
  statusEl.textContent = 'Saving…';

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;

  const payload = {
    user_id:      user.id,
    product_type: PRODUCT_TYPE,
    responses,
    current_step: currentStep,
  };

  let err;
  if (responseId) {
    ({ error: err } = await sb.from('will_responses').update(payload).eq('id', responseId));
  } else {
    const { data, error } = await sb.from('will_responses').insert(payload).select().single();
    err = error;
    if (data) responseId = data.id;
  }

  statusEl.innerHTML = err ? 'Error saving' : 'Saved &#10003;';
  setTimeout(() => { statusEl.textContent = ''; }, 2500);
}

async function completeQuestionnaire() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;

  const payload = {
    user_id:      user.id,
    product_type: PRODUCT_TYPE,
    responses,
    current_step: currentStep,
    completed:    true,
  };

  if (responseId) {
    await sb.from('will_responses').update(payload).eq('id', responseId);
  } else {
    await sb.from('will_responses').insert(payload);
  }

  document.getElementById('questProgressBar').style.width = '100%';
  document.getElementById('questProgressLabel').textContent = 'All done!';

  const main = document.getElementById('questMain');
  main.innerHTML = `
    <div class="quest-card quest-complete quest-card-enter">
      <div class="quest-complete-icon">&#127881;</div>
      <h2>Your questionnaire is complete!</h2>
      <p>Thank you. Our team will now use your answers to prepare your mirror wills. We'll be in touch within 2 working days to confirm everything and arrange signing.</p>
      <a href="dashboard.html" class="btn btn-primary" style="margin-top:32px;">Return to Dashboard &rarr;</a>
    </div>`;

  requestAnimationFrame(() =>
    main.querySelector('.quest-card')?.classList.add('quest-card-visible')
  );
}


// ================================================================
// START
// ================================================================

initQuestionnaire();
