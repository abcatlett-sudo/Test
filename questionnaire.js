// ================================================================
// QUESTIONNAIRE.JS — Will questionnaire (mirror & single)
// One step at a time, auto-saved to Supabase on every advance.
// ================================================================

const urlParams    = new URLSearchParams(window.location.search);
const PRODUCT_TYPE = urlParams.get('type') || 'mirror';

const GA_KEY = 'ak_mp6vfo7awnRTaj1zIBftyIbj5IIPq';

const MIRROR_SECTIONS = [
  { id: 'about',     label: 'About You & Your Partner' },
  { id: 'family',    label: 'Your Family'               },
  { id: 'wishes',    label: 'Your Wishes'               },
  { id: 'executors', label: 'Executors'                 },
  { id: 'estate',    label: 'Your Estate'               },
  { id: 'final',     label: 'Final Details'             },
];

const SINGLE_SECTIONS = [
  { id: 'about',     label: 'About You'     },
  { id: 'family',    label: 'Your Family'   },
  { id: 'wishes',    label: 'Your Wishes'   },
  { id: 'executors', label: 'Executors'     },
  { id: 'estate',    label: 'Your Estate'   },
  { id: 'final',     label: 'Final Details' },
];

const SECTIONS = PRODUCT_TYPE === 'single' ? SINGLE_SECTIONS : MIRROR_SECTIONS;

const MIRROR_STEPS = [
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
    icon: '&#128737;',
    title: 'Appointing guardians',
    subtitle: 'If you both passed away, who would you trust to care for your children? Guardians must be over 18.',
    type: 'guardians',
    showIf: (r) => {
      const count = parseInt(r.children_count || 0)
      if (count === 0) return false
      const today = new Date()
      for (let i = 0; i < count; i++) {
        const dob = r[`child_${i}_dob`]
        if (!dob) return true
        const birth = new Date(dob)
        const age = today.getFullYear() - birth.getFullYear() -
          (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0)
        if (age < 18) return true
      }
      return false
    },
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
    noLabel:  'No — we have different wishes',
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
    icon: '&#9203;',
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
    customTextKey:         'inheritance_age_custom',
    customTextPlaceholder: 'Describe your custom inheritance arrangement, e.g. one third at 21, one third at 25, the remainder at 30...',
  },
  // ── SECTION 4: Executors ─────────────────────────────────────
  {
    id: 'executor_surviving',
    section: 'executors',
    icon: '&#128203;',
    title: 'Executor if one of you passes away',
    subtitle: 'An executor <span class="quest-info-icon" data-tip="An executor is the person legally responsible for carrying out the instructions in your will — settling debts, distributing assets, and handling the estate administration.">&#9432;</span> is the person who carries out the wishes in your will.',
    type: 'dual_yesno_with_text',
    key:  'executor_surviving_yes',
    key2: 'partner_executor_surviving_yes',
    showTextOn: 'no',
    yesLabel: 'Yes — the surviving partner will be the executor',
    noLabel:  'No — I\'d like to appoint someone else',
    textKey:         'executor_surviving_other',
    textKey2:        'partner_executor_surviving_other',
    textLabel:       'Name and address of the person you\'d like to appoint',
    textPlaceholder: 'e.g. Jane Smith, 14 High Street, London EC1A 1BB (Sister)',
  },
  {
    id: 'executor_both',
    section: 'executors',
    icon: '&#128101;',
    title: 'Executors if you both pass away',
    subtitle: 'You can name one or two executors — the people responsible for carrying out your wishes. Naming two is recommended so there\'s always someone who can act. Choose people you trust, ideally under 70 and not named as beneficiaries in your will.',
    type: 'executors',
  },
  // ── SECTION 5: Your Estate ───────────────────────────────────
  {
    id: 'net_assets',
    section: 'estate',
    icon: '&#127968;',
    title: 'Your net assets',
    subtitle: 'This covers everything you own — property, savings, investments, and personal possessions.',
    type: 'dual_yesno_with_text',
    key:  'net_assets_yes',
    key2: 'partner_net_assets_yes',
    yesLabel: 'Yes — net assets pass to each other; if we both pass, equally to our children',
    noLabel:  'No — we have different arrangements in mind',
    textKey:         'net_assets_custom',
    textKey2:        'partner_net_assets_custom',
    textLabel:       'Please describe your wishes',
    textPlaceholder: 'Describe how you\'d like your net assets distributed...',
  },
  {
    id: 'business_interests',
    section: 'estate',
    icon: '&#128188;',
    title: 'Business interests',
    subtitle: 'If you own a business or hold business interests, this clause ensures they are handled in the most tax-efficient way by your executors.',
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
    type: 'dual_yesno_with_text',
    key:  'specific_gifts_yes',
    key2: 'partner_specific_gifts_yes',
    showTextOn: 'yes',
    noFirst: true,
    yesLabel: 'Yes — I\'d like to leave specific gifts',
    noLabel:  'No specific gifts',
    textKey:         'specific_gifts_details',
    textKey2:        'partner_specific_gifts_details',
    textLabel:       'Please describe the gifts or donations',
    textPlaceholder: 'e.g. My grandmother\'s engagement ring to my daughter Emma...',
  },
  {
    id: 'exclusions',
    section: 'estate',
    icon: '&#128683;',
    title: 'Exclusions',
    subtitle: 'Is there anyone you specifically want to exclude from benefiting from your will? This is sometimes appropriate where there has been a family estrangement.',
    type: 'dual_yesno_with_text',
    key:  'exclusions_yes',
    key2: 'partner_exclusions_yes',
    showTextOn: 'yes',
    noFirst: true,
    yesLabel: 'Yes — I want to exclude specific people',
    noLabel:  'No exclusions',
    textKey:         'exclusions_details',
    textKey2:        'partner_exclusions_details',
    textLabel:       'Please name the person(s) you wish to exclude and the reason',
    textPlaceholder: 'e.g. John Smith — estranged since 2015...',
  },
  // ── SECTION 6: Final Details ─────────────────────────────────
  {
    id: 'funeral_wishes',
    section: 'final',
    icon: '&#128538;',
    title: 'Funeral wishes',
    subtitle: 'Optional, but many people find it a comfort to leave clear guidance for their loved ones. Each set of wishes will only appear on the relevant will.',
    type: 'dual_textarea_optional',
    key: 'funeral_wishes',
    key2: 'partner_funeral_wishes',
    placeholder: 'e.g. I would prefer cremation, with a small family gathering at a location of their choosing...',
    placeholder2: 'e.g. They would prefer a burial, with a service at their local church...',
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

// ── SINGLE WILL STEPS ────────────────────────────────────────────
const SINGLE_STEPS = [
  // ── SECTION 1: About You ─────────────────────────────────────
  {
    id: 'your_details',
    section: 'about',
    icon: '&#128100;',
    title: 'Your details',
    subtitle: 'These will appear on your will exactly as entered — please use your full legal name.',
    type: 'fields',
    fields: [
      { key: 'your_full_name', label: 'Full legal name', type: 'text',     placeholder: 'e.g. Jane Elizabeth Smith',        required: true },
      { key: 'your_dob',       label: 'Date of birth',   type: 'date',     placeholder: '',                                 required: true },
      { key: 'your_address',   label: 'Home address',    type: 'textarea', placeholder: 'Full address including postcode',  required: true },
    ],
  },
  {
    id: 'confirmation',
    section: 'about',
    icon: '&#9989;',
    title: 'A few important declarations',
    subtitle: 'These statements are required for your will to be legally valid. Please confirm each one.',
    type: 'checkboxes',
    requireAll: true,
    options: [
      { key: 'confirm_over_18',    label: 'I am over 18 years of age' },
      { key: 'confirm_sound_mind', label: 'I am of sound mind and fully understand what I am signing' },
      { key: 'confirm_voluntary',  label: 'I am making this will freely and voluntarily, without any pressure or coercion' },
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
    icon: '&#128737;',
    title: 'Appointing guardians',
    subtitle: 'If you passed away, who would you trust to care for your children? Guardians must be over 18.',
    type: 'guardians',
    showIf: (r) => {
      const count = parseInt(r.children_count || 0)
      if (count === 0) return false
      const today = new Date()
      for (let i = 0; i < count; i++) {
        const dob = r[`child_${i}_dob`]
        if (!dob) return true
        const birth = new Date(dob)
        const age = today.getFullYear() - birth.getFullYear() -
          (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0)
        if (age < 18) return true
      }
      return false
    },
  },
  // ── SECTION 3: Your Wishes ───────────────────────────────────
  {
    id: 'primary_beneficiary_choice',
    section: 'wishes',
    title: 'Who should your estate pass to?',
    subtitle: 'You\'ve told us you have children. Choose who should be the main beneficiary of your estate.',
    type: 'options',
    key: 'primary_beneficiary_type',
    required: true,
    showIf: (r) => parseInt(r.children_count || 0) > 0,
    options: [
      { value: 'children', label: 'My children',    description: 'My estate passes to my children in equal shares' },
      { value: 'other',    label: 'Someone else',   description: 'I want to name a specific person as my primary beneficiary — my children would inherit if that person predeceases me' },
    ],
    inlineFields: {
      showOn: 'other',
      fields: [
        { key: 'beneficiary_name',         label: 'Full legal name',     type: 'text',     placeholder: 'e.g. James Robert Smith',        required: true },
        { key: 'beneficiary_relationship', label: 'Relationship to you', type: 'text',     placeholder: 'e.g. Son, Partner, Friend',       required: true },
        { key: 'beneficiary_address',      label: 'Address',             type: 'textarea', placeholder: 'Full address including postcode', required: true },
      ],
    },
  },
  {
    id: 'primary_beneficiary',
    section: 'wishes',
    icon: '&#128140;',
    title: 'Your primary beneficiary',
    subtitle: 'Who should inherit your entire estate if you pass away? Please provide their details below.',
    showIf: (r) => parseInt(r.children_count || 0) === 0,
    type: 'fields',
    fields: [
      { key: 'beneficiary_name',         label: 'Full legal name',     type: 'text',     placeholder: 'e.g. James Robert Smith',        required: true },
      { key: 'beneficiary_relationship', label: 'Relationship to you', type: 'text',     placeholder: 'e.g. Son, Partner, Friend',       required: true },
      { key: 'beneficiary_address',      label: 'Address',             type: 'textarea', placeholder: 'Full address including postcode', required: true },
    ],
  },
  {
    id: 'substitute_beneficiary',
    section: 'wishes',
    icon: '&#9878;&#65039;',
    title: 'If your primary beneficiary passes away before you',
    subtitle: 'In the event your primary beneficiary predeceases you, who should your estate pass to?',
    type: 'single_secondary_wish',
    showIf: (r) => parseInt(r.children_count || 0) === 0 || r.primary_beneficiary_type === 'other',
  },
  {
    id: 'inheritance_age',
    section: 'wishes',
    icon: '&#9203;',
    title: 'At what age should your children inherit?',
    subtitle: 'Choose when your children should receive their inheritance. Delaying can provide important financial protection.',
    type: 'options',
    key: 'inheritance_age',
    required: true,
    showIf: (r) => parseInt(r.children_count || 0) > 0,
    options: [
      { value: '18',     label: '18 years old',       description: 'At the age of legal adulthood'     },
      { value: '21',     label: '21 years old',       description: 'A little more financial maturity'  },
      { value: '25',     label: '25 years old',       description: 'Greater financial responsibility'  },
      { value: 'staged', label: 'Staged',             description: 'Half at 21, the remainder at 25'   },
      { value: 'custom', label: 'Custom arrangement', description: 'I\'d like to specify my own terms' },
    ],
    customTextKey:         'inheritance_age_custom',
    customTextPlaceholder: 'Describe your custom inheritance arrangement, e.g. one third at 21, one third at 25, the remainder at 30...',
  },
  // ── SECTION 4: Executors ─────────────────────────────────────
  {
    id: 'executor_both',
    section: 'executors',
    icon: '&#128203;',
    title: 'Your executor(s)',
    subtitle: 'An executor <span class="quest-info-icon" data-tip="An executor is the person legally responsible for carrying out the instructions in your will — settling debts, distributing assets, and handling the estate administration.">&#9432;</span> is the person who carries out the wishes in your will. It is good practice to name two.',
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
    showIf: (r) => r.primary_beneficiary_type !== 'children',
    yesLabel: 'Yes — net assets pass to my primary beneficiary; if they predecease me, equally to my children',
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
    subtitle: 'If you own a business or hold business interests, this clause ensures they are handled in the most tax-efficient way by your executors.',
    type: 'yesno',
    key: 'business_interests_yes',
    yesLabel: 'Yes — business interests pass to my primary beneficiary, managed tax-efficiently by the executor',
    noLabel:  'No — I have no business interests, or have different wishes',
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
    id: 'funeral_wishes',
    section: 'final',
    icon: '&#128538;',
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

const ACTIVE_STEPS = PRODUCT_TYPE === 'single' ? SINGLE_STEPS : MIRROR_STEPS;


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
  return ACTIVE_STEPS.filter(s => !s.showIf || s.showIf(responses));
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
// POSTCODE LOOKUP
// ================================================================

function postcodeWidget(targetName) {
  return `
    <div class="pc-lookup" data-target="${targetName}">
      <div class="pc-row">
        <input class="quest-input pc-input" type="text" placeholder="Enter postcode" autocomplete="off" maxlength="8" />
        <button type="button" class="btn btn-primary pc-btn">Find &rarr;</button>
      </div>
      <select class="quest-input pc-select" style="display:none;margin-top:8px;"></select>
      <p class="pc-note"></p>
    </div>`;
}

async function handlePostcodeLookup(widget) {
  const input    = widget.querySelector('.pc-input');
  const note     = widget.querySelector('.pc-note');
  const select   = widget.querySelector('.pc-select');
  const postcode = input.value.trim().toUpperCase();

  if (!postcode) { note.textContent = 'Please enter a postcode.'; return; }

  note.textContent = 'Searching…';
  select.style.display = 'none';

  try {
    const res  = await fetch(
      `https://api.ideal-postcodes.co.uk/v1/postcodes/${encodeURIComponent(postcode)}?api_key=${GA_KEY}`
    );
    const data = await res.json();

    if (data.code !== 2000) {
      if (data.code === 4040) {
        note.textContent = 'Postcode not found — please check and try again.';
      } else if (data.code === 4010) {
        note.textContent = 'API key error — please type your address below.';
      } else {
        note.textContent = 'Lookup error — please type your address below.';
      }
      return;
    }

    const suggestions = (data.result || []).map(a => {
      const parts = [a.line_1, a.line_2, a.line_3, a.post_town, a.county]
        .filter(p => p && p.trim());
      return { address: [...parts, a.postcode].join(', '), parts, postcode: a.postcode };
    });
    if (suggestions.length === 0) {
      note.textContent = 'No addresses found — please type your address below.';
      return;
    }
    note.textContent = `${suggestions.length} address${suggestions.length > 1 ? 'es' : ''} found — select one below.`;
    select.innerHTML = '<option value="">— Select your address —</option>' +
      suggestions.map((s, i) => `<option value="${i}">${s.address}</option>`).join('');
    select.style.display = 'block';

    select.onchange = () => {
      const idx = parseInt(select.value);
      if (isNaN(idx)) return;
      const s     = suggestions[idx];
      const parts = s.address.split(', ').map(p => p.trim()).filter(p => p);
      if (!parts.some(p => /^[A-Z]{1,2}\d/i.test(p))) parts.push(s.postcode);
      const formatted = parts.join('\n');
      const target = widget.closest('.quest-field')?.querySelector(`[name="${widget.dataset.target}"]`)
        || document.querySelector(`[name="${widget.dataset.target}"]`);
      if (target) {
        target.value = formatted;
        responses[widget.dataset.target] = formatted;
      }
    };
  } catch {
    note.textContent = 'Lookup failed — please type your address below.';
  }
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
    `Step ${currentStep + 1} of ${steps.length}`;

  const fieldHTML = buildStepHTML(step);

  main.innerHTML = `
    <div class="quest-card quest-card-enter">
      <div class="quest-section-tag">${esc(sectionLabel())}</div>
      <h2 class="quest-title">${step.title}</h2>
      <p class="quest-subtitle">${step.subtitle}</p>
      <div class="quest-fields">${fieldHTML}</div>
      <div class="quest-nav-btns">
        <div class="quest-nav-left">
          ${currentStep > 0
            ? '<button class="btn btn-ghost" id="questBack">&#8592; Back</button>'
            : '<span></span>'}
          ${currentStep > 0
            ? '<button class="btn btn-ghost" id="questRestart" style="margin-top:4px;">&#8592; Back to the beginning</button>'
            : '<span></span>'}
        </div>
        <button class="btn btn-primary" id="questNext">
          ${isLast ? 'Complete &#10003;' : 'Continue &#8594;'}
        </button>
      </div>
    </div>
    <p class="quest-revision-note">You can update any answer or selection at any time — and once you've seen how your will reads, simply return to your questionnaire to make the changes you need to.</p>`;

  requestAnimationFrame(() =>
    main.querySelector('.quest-card')?.classList.add('quest-card-visible')
  );

  attachListeners(step);
}

function renderGuardians() {
  const hasSecondary = responses.secondary_guardian_name || responses.show_secondary_guardian === 'yes';
  return `
    <div class="quest-field">
      <label class="quest-label">Guardian's full name</label>
      <input class="quest-input" type="text" name="guardian_name" placeholder="e.g. Sarah Louise Jones" value="${esc(responses.guardian_name || '')}" required />
    </div>
    <div class="quest-field" style="margin-top:12px;">
      <label class="quest-label">Guardian's address</label>
      ${postcodeWidget('guardian_address')}
      <textarea class="quest-input quest-textarea" name="guardian_address" placeholder="Full address including postcode" rows="3" required>${esc(responses.guardian_address || '')}</textarea>
    </div>
    <button type="button" id="addSecondaryGuardianBtn" class="btn btn-ghost" style="margin-top:14px;font-size:0.88rem;padding:8px 14px;">
      ${hasSecondary ? '&#9660; Secondary guardian added' : '&#43; Add a secondary guardian'}
    </button>
    <div id="secondaryGuardianPanel" class="quest-conditional${hasSecondary ? ' visible' : ''}" style="margin-top:10px;">
      <p class="quest-hint" style="margin-bottom:10px;">If the primary guardian has passed away, is unable or unwilling to act, this person will be appointed instead.</p>
      <div class="quest-field">
        <label class="quest-label">Secondary guardian's full name</label>
        <input class="quest-input" type="text" name="secondary_guardian_name" placeholder="e.g. Michael James Brown" value="${esc(responses.secondary_guardian_name || '')}" />
      </div>
      <div class="quest-field" style="margin-top:12px;">
        <label class="quest-label">Secondary guardian's address</label>
        ${postcodeWidget('secondary_guardian_address')}
        <textarea class="quest-input quest-textarea" name="secondary_guardian_address" placeholder="Full address including postcode" rows="3">${esc(responses.secondary_guardian_address || '')}</textarea>
      </div>
    </div>`;
}

function buildStepHTML(step) {
  switch (step.type) {
    case 'fields':          return step.fields.map(renderField).join('');
    case 'checkboxes':      return renderCheckboxes(step);
    case 'options':         return renderOptions(step);
    case 'yesno':           return renderYesNo(step);
    case 'yesno_with_text':      return renderYesNoWithText(step);
    case 'dual_yesno_with_text': return renderDualYesNoWithText(step);
    case 'children':             return renderChildren();
    case 'guardians':             return renderGuardians();
    case 'secondary_wish':        return renderSecondaryWish();
    case 'single_secondary_wish': return renderSingleSecondaryWish();
    case 'executors':       return renderExecutors();
    case 'checkbox_confirm':      return renderCheckboxConfirm(step);
    case 'dual_textarea_optional': return renderDualTextareaOptional(step);
    case 'textarea_optional':return renderTextareaOptional(step);
    default:                return '';
  }
}

function renderField(f) {
  const val      = esc(responses[f.key] || '');
  const isAddr   = f.type === 'textarea' && f.key.endsWith('_address');
  const input    = f.type === 'textarea'
    ? `<textarea class="quest-input quest-textarea" name="${f.key}" placeholder="${esc(f.placeholder || '')}" rows="3">${val}</textarea>`
    : `<input class="quest-input" type="${f.type}" name="${f.key}" placeholder="${esc(f.placeholder || '')}" value="${val}" />`;
  return `
    <div class="quest-field">
      <label class="quest-label">${f.label}${!f.required ? ' <span class="quest-optional">Optional</span>' : ''}</label>
      ${f.hint ? `<p class="quest-hint">${f.hint}</p>` : ''}
      ${isAddr ? postcodeWidget(f.key) : ''}
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
  let html = `<div class="quest-options-grid">${step.options.map(o => `
    <button class="quest-option${responses[step.key] === o.value ? ' selected' : ''}" data-key="${step.key}" data-value="${o.value}">
      <strong>${o.label}</strong>
      <span>${o.description}</span>
    </button>`).join('')}</div>`;
  if (step.customTextKey) {
    const isCustom = responses[step.key] === 'custom';
    html += `<div id="conditionalText" class="quest-conditional${isCustom ? ' visible' : ''}" data-show-on="custom">
      <textarea class="quest-input quest-textarea" name="${step.customTextKey}" placeholder="${step.customTextPlaceholder || ''}" rows="4">${esc(responses[step.customTextKey] || '')}</textarea>
    </div>`;
  }
  if (step.inlineFields) {
    const show = responses[step.key] === step.inlineFields.showOn;
    html += `<div class="quest-conditional${show ? ' visible' : ''}" data-for="${step.key}" data-show-on="${step.inlineFields.showOn}" style="margin-top:16px;">
      ${step.inlineFields.fields.map(renderField).join('')}
    </div>`;
  }
  return html;
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
        <p class="quest-textarea-tip">Tip: generate your will to see how this reads, then come back and tweak the wording until you're completely satisfied.</p>
      </div>
    </div>`;
}

function renderDualYesNoWithText(step) {
  const trigger   = step.showTextOn || 'no';
  const showText1 = responses[step.key]  === trigger;
  const showText2 = responses[step.key2] === trigger;
  const opts = step.noFirst
    ? [{ value: 'no', label: step.noLabel }, { value: 'yes', label: step.yesLabel }]
    : [{ value: 'yes', label: step.yesLabel }, { value: 'no', label: step.noLabel }];
  return `
    <div class="quest-dual-section">
      <h4 class="quest-dual-heading">Your wishes</h4>
      <div class="quest-options-grid quest-yesno">${opts.map(o => `
        <button class="quest-option${responses[step.key] === o.value ? ' selected' : ''}" data-key="${step.key}" data-value="${o.value}">
          ${o.label}
        </button>`).join('')}</div>
      <div class="quest-conditional${showText1 ? ' visible' : ''}" data-for="${step.key}" data-show-on="${trigger}">
        <div class="quest-field" style="margin-top:16px;">
          <label class="quest-label">${step.textLabel}</label>
          <textarea class="quest-input quest-textarea" name="${step.textKey}" placeholder="${esc(step.textPlaceholder)}" rows="4">${esc(responses[step.textKey] || '')}</textarea>
          <p class="quest-textarea-tip">Tip: generate your will to see how this reads, then come back and tweak the wording until you're completely satisfied.</p>
        </div>
      </div>
    </div>
    <div class="quest-dual-section" style="margin-top:24px;">
      <h4 class="quest-dual-heading">Your partner's wishes</h4>
      <div class="quest-options-grid quest-yesno">${opts.map(o => `
        <button class="quest-option${responses[step.key2] === o.value ? ' selected' : ''}" data-key="${step.key2}" data-value="${o.value}">
          ${o.label}
        </button>`).join('')}</div>
      <div class="quest-conditional${showText2 ? ' visible' : ''}" data-for="${step.key2}" data-show-on="${trigger}">
        <div class="quest-field" style="margin-top:16px;">
          <label class="quest-label">${step.textLabel}</label>
          <textarea class="quest-input quest-textarea" name="${step.textKey2}" placeholder="${esc(step.textPlaceholder)}" rows="4">${esc(responses[step.textKey2] || '')}</textarea>
          <p class="quest-textarea-tip">Tip: generate your will to see how this reads, then come back and tweak the wording until you're completely satisfied.</p>
        </div>
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

  // No children — ask for beneficiaries and percentages directly
  if (count === 0) {
    const numBeneficiaries = parseInt(responses.secondary_beneficiary_count || 1);
    let beneficiaryFields = '';
    for (let i = 0; i < numBeneficiaries; i++) {
      const defaultPct = Math.floor(100 / numBeneficiaries);
      beneficiaryFields += `
        <div class="quest-field" style="margin-top:14px;">
          <label class="quest-label">Beneficiary ${i + 1}</label>
          <input class="quest-input" type="text" name="secondary_ben_${i}_name" placeholder="Full name, address and relationship (e.g. Jane Smith, 14 High Street, Leeds LS1 1AA — Sister)" value="${esc(responses[`secondary_ben_${i}_name`] || '')}" style="margin-bottom:8px;" />
          <div class="quest-pct-input-wrap">
            <input class="quest-input quest-pct-input" type="number" name="secondary_ben_${i}_pct" min="0" max="100" value="${esc(String(responses[`secondary_ben_${i}_pct`] ?? defaultPct))}" />
            <span class="quest-pct-symbol">%</span>
          </div>
        </div>`;
    }
    return `
      <div class="quest-field">
        <label class="quest-label">How many beneficiaries would you like?</label>
        <div class="quest-options-grid" style="grid-template-columns:repeat(4,1fr);gap:8px;margin-top:8px;">
          ${[1,2,3,4].map(n => `
            <button class="quest-option${numBeneficiaries === n ? ' selected' : ''}" data-key="secondary_beneficiary_count" data-value="${n}" style="padding:10px;">
              <strong>${n}</strong>
            </button>`).join('')}
        </div>
      </div>
      <p class="quest-hint" style="margin-top:16px;">Percentages must add up to 100%</p>
      ${beneficiaryFields}
      <div class="quest-pct-total">Total: <span id="pctTotalVal">0</span>% <span id="pctTotalMsg"></span></div>`;
  }

  // Has children — offer equal split or custom percentages
  const btns = `
    <div class="quest-options-grid quest-yesno">
      <button class="quest-option${!isCustom ? ' selected' : ''}" data-key="secondary_equal" data-value="yes">
        Yes — divided equally between all our children
      </button>
      <button class="quest-option${isCustom ? ' selected' : ''}" data-key="secondary_equal" data-value="no">
        No — we want to specify percentages
      </button>
    </div>`;

  let pctFields = '';
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

  return `${btns}
    <div class="quest-conditional${isCustom ? ' visible' : ''}" id="pctFields">
      <p class="quest-hint" style="margin-top:16px;">Percentages must add up to 100%</p>
      ${pctFields}
      <div class="quest-pct-total">Total: <span id="pctTotalVal">0</span>% <span id="pctTotalMsg"></span></div>
    </div>`;
}

function renderSingleSecondaryWish() {
  const count    = parseInt(responses.children_count || 0);
  const isCustom = responses.secondary_equal === 'no';

  // No children — skip the yes/no and just ask who the substitute is
  if (count === 0) {
    return `
      <div class="quest-field">
        <label class="quest-label">Please name your substitute beneficiary</label>
        <textarea class="quest-input quest-textarea" name="secondary_custom" placeholder="e.g. My sister Sarah Jones, 14 High Street, Leeds, LS1 1AA..." rows="4">${esc(responses.secondary_custom || '')}</textarea>
      </div>`;
  }

  // Has children — offer equal split to children or a named person
  return `
    <div class="quest-options-grid quest-yesno">
      <button class="quest-option${!isCustom ? ' selected' : ''}" data-key="secondary_equal" data-value="yes">
        Yes — divided equally between my children
      </button>
      <button class="quest-option${isCustom ? ' selected' : ''}" data-key="secondary_equal" data-value="no">
        No — I want to name a specific person
      </button>
    </div>
    <div class="quest-conditional${isCustom ? ' visible' : ''}" id="pctFields">
      <div class="quest-field" style="margin-top:16px;">
        <label class="quest-label">Please name the substitute beneficiary</label>
        <textarea class="quest-input quest-textarea" name="secondary_custom" placeholder="e.g. My sister Sarah Jones, 14 High Street, Leeds, LS1 1AA..." rows="4">${esc(responses.secondary_custom || '')}</textarea>
      </div>
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

function renderDualTextareaOptional(step) {
  return `
    <div class="quest-dual-section">
      <h4 class="quest-dual-heading">Your wishes</h4>
      <div class="quest-field">
        <span class="quest-optional">Optional</span>
        <textarea class="quest-input quest-textarea" name="${step.key}" placeholder="${esc(step.placeholder)}" rows="4">${esc(responses[step.key] || '')}</textarea>
        <p class="quest-textarea-tip">Tip: generate your will to see how this reads, then come back and tweak the wording until you're completely satisfied.</p>
      </div>
    </div>
    <div class="quest-dual-section" style="margin-top:24px;">
      <h4 class="quest-dual-heading">Your partner's wishes</h4>
      <div class="quest-field">
        <span class="quest-optional">Optional</span>
        <textarea class="quest-input quest-textarea" name="${step.key2}" placeholder="${esc(step.placeholder2)}" rows="4">${esc(responses[step.key2] || '')}</textarea>
        <p class="quest-textarea-tip">Tip: generate your will to see how this reads, then come back and tweak the wording until you're completely satisfied.</p>
      </div>
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

  // Start Over
  document.getElementById('questRestart')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to go back to the first step?')) {
      collectInputValues();
      currentStep = 0;
      renderStep();
      window.scrollTo(0, 0);
    }
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

      const conditional = document.querySelector(`.quest-conditional[data-for="${key}"]`)
        || document.getElementById('conditionalText')
        || document.getElementById('pctFields');
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

  // Secondary guardian toggle
  document.getElementById('addSecondaryGuardianBtn')?.addEventListener('click', () => {
    const panel = document.getElementById('secondaryGuardianPanel');
    const btn   = document.getElementById('addSecondaryGuardianBtn');
    const opening = !panel.classList.contains('visible');
    panel.classList.toggle('visible', opening);
    responses.show_secondary_guardian = opening ? 'yes' : 'no';
    btn.textContent = opening ? '▼ Secondary guardian added' : '+ Add a secondary guardian';
    if (!opening) {
      responses.secondary_guardian_name    = '';
      responses.secondary_guardian_address = '';
      const nameInput    = document.querySelector('[name="secondary_guardian_name"]');
      const addressInput = document.querySelector('[name="secondary_guardian_address"]');
      if (nameInput)    nameInput.value    = '';
      if (addressInput) addressInput.value = '';
    }
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

  // Postcode lookup
  document.querySelectorAll('.pc-btn').forEach(btn => {
    btn.addEventListener('click', () => handlePostcodeLookup(btn.closest('.pc-lookup')));
  });
  document.querySelectorAll('.pc-input').forEach(input => {
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); handlePostcodeLookup(input.closest('.pc-lookup')); }
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
      if (el.classList.contains('quest-pct-input')) updatePctTotal();
    });
  });
}

function updatePctTotal() {
  const totalVal = document.getElementById('pctTotalVal');
  const totalMsg = document.getElementById('pctTotalMsg');
  if (!totalVal) return;
  let sum = 0;
  document.querySelectorAll('.quest-pct-input').forEach(inp => {
    sum += parseFloat(inp.value || 0);
  });
  const rounded = Math.round(sum);
  totalVal.textContent = rounded;
  if (totalMsg) {
    if (rounded === 100) {
      totalVal.style.color = 'var(--teal)';
      totalMsg.style.color = 'var(--teal)';
      totalMsg.textContent = '✓';
    } else {
      totalVal.style.color = 'var(--accent)';
      totalMsg.style.color = 'var(--accent)';
      totalMsg.textContent = rounded > 100 ? '— over 100%' : '— must reach 100%';
    }
  }
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

  if (step.type === 'children') {
    const count = parseInt(responses.children_count || 0)
    for (let i = 0; i < count; i++) {
      if (!String(responses[`child_${i}_name`] || '').trim()) {
        showFieldError(`child_${i}_name`, 'Please enter the full name for this child')
        shakeBtn(nextBtn)
        return false
      }
      if (!String(responses[`child_${i}_dob`] || '').trim()) {
        showFieldError(`child_${i}_dob`, 'Please enter the date of birth for this child')
        shakeBtn(nextBtn)
        return false
      }
    }
  }

  if (step.type === 'options' && step.inlineFields && responses[step.key] === step.inlineFields.showOn) {
    for (const f of step.inlineFields.fields) {
      if (f.required && !String(responses[f.key] || '').trim()) {
        showFieldError(f.key, `Please enter ${f.label.toLowerCase()}`);
        shakeBtn(nextBtn);
        return false;
      }
    }
  }

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

  if (step.type === 'dual_yesno_with_text' && (!responses[step.key] || !responses[step.key2])) {
    shakeBtn(nextBtn); return false;
  }

  if (step.type === 'checkbox_confirm' && !responses[step.key]) {
    shakeBtn(nextBtn); return false;
  }

  if (step.type === 'secondary_wish' && responses.secondary_equal === 'no') {
    const count = parseInt(responses.children_count || 0);
    let total = 0;
    if (count > 0) {
      for (let i = 0; i < count; i++) total += parseFloat(responses[`child_${i}_pct`] || 0);
    } else {
      const numBen = parseInt(responses.secondary_beneficiary_count || 1);
      for (let i = 0; i < numBen; i++) total += parseFloat(responses[`secondary_ben_${i}_pct`] || 0);
    }
    if (Math.round(total) !== 100) {
      const msg = document.getElementById('pctTotalMsg');
      if (msg) { msg.textContent = '— must add up to exactly 100%'; msg.style.color = 'var(--accent)'; }
      shakeBtn(nextBtn);
      return false;
    }
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
      <p>Great news — your answers are complete. Visit your dashboard to generate your will instantly.</p>
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
