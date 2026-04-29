// ================================================================
// AUTH.JS — Supabase authentication & Stripe checkout for Wills Assured
// ================================================================

const SUPABASE_URL      = 'https://fgyqumgvmllhiqdmgrfc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZneXF1bWd2bWxsaGlxZG1ncmZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5MzQ1NDYsImV4cCI6MjA5MjUxMDU0Nn0.GwQsnXsraNegEqdYASRwagOxMgyAZg2iNXzP3Syqii8';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// ----------------------------------------------------------------
// NAV — swap 'Sign In' for 'Dashboard' when a session is active.
// onAuthStateChange reads from localStorage so there is no flash.
// ----------------------------------------------------------------
sb.auth.onAuthStateChange((_event, session) => {
  document.querySelectorAll('.nav-cta').forEach(cta => {
    if (session) {
      cta.textContent = 'Dashboard';
      cta.href        = 'dashboard.html';
    } else {
      cta.textContent = 'Sign In';
      cta.href        = 'login.html';
    }
  });
});


// ----------------------------------------------------------------
// HELPER — redirect to login if no active session
// ----------------------------------------------------------------
async function requireAuth() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) { window.location.href = 'login.html'; return null; }
  return user;
}


// ----------------------------------------------------------------
// CHECKOUT — "Proceed to Checkout" button on basket page.
// Uses event delegation because the button is rendered dynamically.
// Calls the create-checkout Supabase Edge Function which returns
// a Stripe-hosted checkout URL.
// ----------------------------------------------------------------
document.addEventListener('click', async (e) => {
  if (e.target.id !== 'checkoutBtn') return;

  const btn    = e.target;
  const basket = JSON.parse(localStorage.getItem('wa_basket') || '[]');

  if (basket.length === 0) return;

  btn.disabled    = true;
  btn.textContent = 'Redirecting to payment…';

  try {
    const { data, error } = await sb.functions.invoke('create-checkout', {
      body: { productId: basket[0].id },
    });

    if (error || !data?.url) throw new Error(error?.message || 'No checkout URL returned');

    // Clear basket then redirect to Stripe
    localStorage.removeItem('wa_basket');
    window.location.href = data.url;
  } catch (err) {
    console.error('Checkout error:', err);
    btn.disabled    = false;
    btn.textContent = 'Proceed to Checkout →';
    alert('Something went wrong starting checkout. Please try again.');
  }
});


// ----------------------------------------------------------------
// REGISTER PAGE (#registerForm)
// ----------------------------------------------------------------
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name     = document.getElementById('fullName').value.trim();
    const email    = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirm  = document.getElementById('confirmPassword').value;
    const note     = document.getElementById('registerNote');
    const btn      = registerForm.querySelector('button[type="submit"]');

    if (!name) {
      note.style.color = 'var(--accent)';
      note.textContent = 'Please enter your full name.';
      return;
    }
    if (password !== confirm) {
      note.style.color = 'var(--accent)';
      note.textContent = 'Passwords do not match.';
      return;
    }
    if (password.length < 8) {
      note.style.color = 'var(--accent)';
      note.textContent = 'Password must be at least 8 characters.';
      return;
    }

    btn.disabled    = true;
    btn.textContent = 'Creating account…';

    const base       = window.location.href.replace(/[^/]*$/, '');
    const redirectTo = base + 'dashboard.html';

    const { error } = await sb.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo, data: { full_name: name } },
    });

    if (error) {
      note.style.color = 'var(--accent)';
      note.textContent = error.message;
      btn.disabled    = false;
      btn.textContent = 'Create Account';
    } else {
      note.style.color = 'var(--teal)';
      note.textContent = '✓ Account created! Please check your email to verify your address.';
      registerForm.reset();
      btn.textContent = 'Check your email';
    }
  });
}


// ----------------------------------------------------------------
// LOGIN PAGE (#loginForm)
// ----------------------------------------------------------------
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const note     = document.getElementById('loginNote');
    const btn      = loginForm.querySelector('button[type="submit"]');

    btn.disabled    = true;
    btn.textContent = 'Signing in…';

    const { error } = await sb.auth.signInWithPassword({ email, password });

    if (error) {
      note.style.color = 'var(--accent)';
      note.textContent = 'Incorrect email or password.';
      btn.disabled    = false;
      btn.textContent = 'Sign In';
    } else {
      window.location.href = 'dashboard.html';
    }
  });
}


// ----------------------------------------------------------------
// DASHBOARD PAGE (#dashboardContent)
// Requires auth + a paid purchase matched by email.
// ----------------------------------------------------------------
const dashboardContent = document.getElementById('dashboardContent');
if (dashboardContent) {
  (async () => {
    const user = await requireAuth();
    if (!user) return;

    // Check for a paid purchase against this email
    const { data: purchases } = await sb
      .from('purchases')
      .select('*')
      .eq('status', 'paid');

    if (!purchases || purchases.length === 0) {
      dashboardContent.innerHTML = `
        <div class="dashboard-welcome">
          <h2>Welcome to Wills Assured.</h2>
          <p>Get started by choosing a will or redeeming a voucher.</p>
        </div>
        <div class="dashboard-grid">
          <div class="dashboard-card">
            <div class="dashboard-card-icon">&#128196;</div>
            <h3>Get a Will</h3>
            <p class="dashboard-status">No active purchase yet</p>
            <a href="choose-a-will.html" class="btn btn-primary" style="margin-top:14px;display:inline-block;">Choose a Will &rarr;</a>
          </div>
          <div class="dashboard-card">
            <div class="dashboard-card-icon">&#127981;</div>
            <h3>Redeem a Voucher</h3>
            <p class="dashboard-status">Have a voucher code?</p>
            <div class="voucher-redeem-box">
              <input type="text" id="dashVoucherInput" class="form-input" placeholder="WA-XXXX-XXXX" autocomplete="off" spellcheck="false" style="text-transform:uppercase;letter-spacing:0.06em;margin-top:14px;" />
              <p id="dashRedeemNote" class="form-note" style="min-height:20px;margin-top:6px;"></p>
              <button id="dashRedeemBtn" class="btn btn-primary will-cta" style="margin-top:4px;">Redeem Voucher &rarr;</button>
            </div>
          </div>
        </div>`;

      // Wire up dashboard redeem button
      const dashRedeemBtn = document.getElementById('dashRedeemBtn');
      if (dashRedeemBtn) {
        dashRedeemBtn.addEventListener('click', async () => {
          const input = document.getElementById('dashVoucherInput');
          const note  = document.getElementById('dashRedeemNote');
          const code  = input.value.trim().toUpperCase();

          if (!code) {
            note.style.color = 'var(--accent)';
            note.textContent = 'Please enter your voucher code.';
            return;
          }

          dashRedeemBtn.disabled    = true;
          dashRedeemBtn.textContent = 'Redeeming…';
          note.textContent = '';

          try {
            const { data: { session } } = await sb.auth.getSession();
            const resp = await fetch(
              'https://fgyqumgvmllhiqdmgrfc.supabase.co/functions/v1/redeem-voucher',
              {
                method:  'POST',
                headers: {
                  'Content-Type':  'application/json',
                  'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ code }),
              }
            );
            const result = await resp.json();

            if (!resp.ok) {
              note.style.color = 'var(--accent)';
              note.textContent = result.error || 'Something went wrong. Please try again.';
              dashRedeemBtn.disabled    = false;
              dashRedeemBtn.textContent = 'Redeem Voucher →';
              return;
            }

            note.style.color = 'var(--teal)';
            note.textContent = '✓ Voucher redeemed! Reloading…';
            setTimeout(() => window.location.reload(), 1500);

          } catch (err) {
            note.style.color = 'var(--accent)';
            note.textContent = 'Something went wrong. Please try again.';
            dashRedeemBtn.disabled    = false;
            dashRedeemBtn.textContent = 'Redeem Voucher →';
          }
        });
      }
      return;
    }

    const purchase  = purchases[0];
    const fullName  = user.user_metadata?.full_name || user.email;
    const firstName = fullName.split(' ')[0];

    const productLabels = {
      single:        'Single Will',
      mirror:        'Mirror Wills',
      comprehensive: 'Comprehensive Will',
    };
    const productName = productLabels[purchase.product_id] || 'Will';
    const amountPaid  = `£${(purchase.amount / 100).toFixed(2)}`;

    // Check questionnaire progress
    const { data: questResponse } = await sb
      .from('will_responses')
      .select('completed, current_step')
      .eq('user_id', user.id)
      .eq('product_type', purchase.product_id)
      .maybeSingle();

    const questUrl = `questionnaire.html?type=${purchase.product_id}`;
    let questBtnLabel, questBtnHref;
    if (!questResponse) {
      questBtnLabel = 'Start Your Questionnaire &rarr;';
      questBtnHref  = questUrl;
    } else if (questResponse.completed) {
      questBtnLabel = 'View Questionnaire &rarr;';
      questBtnHref  = questUrl;
    } else {
      questBtnLabel = 'Continue Your Questionnaire &rarr;';
      questBtnHref  = questUrl;
    }

    // Check for generated wills
    const { data: generatedWills } = await sb
      .from('generated_wills')
      .select('id, testator_key')
      .eq('user_id', user.id);

    const isMirror      = purchase.product_id === 'mirror';
    const questComplete = questResponse?.completed === true;

    // Build will actions block
    let willActionsHtml = '';
    if (questComplete) {
      const primaryWill  = generatedWills?.find(w => w.testator_key === 'primary');
      const partnerWill  = generatedWills?.find(w => w.testator_key === 'partner');
      const hasAnyWill   = !!primaryWill || !!partnerWill;

      if (hasAnyWill) {
        willActionsHtml += `<div style="margin-top:14px;display:flex;flex-direction:column;gap:8px;">`;
        willActionsHtml += `<a href="${questUrl}" class="btn btn-primary" style="display:block;text-align:left;">View Questionnaire &rarr;</a>`;
        if (primaryWill) {
          willActionsHtml += `<a href="will-preview.html?id=${primaryWill.id}" class="btn btn-primary" style="display:block;text-align:left;">View Your Will &rarr;</a>`;
        }
        if (isMirror && partnerWill) {
          willActionsHtml += `<a href="will-preview.html?id=${partnerWill.id}" class="btn btn-primary" style="display:block;text-align:left;">View Partner's Will &rarr;</a>`;
        }
        willActionsHtml += `<div style="display:flex;align-items:center;gap:10px;margin-top:4px;"><button id="regenWillBtn" class="btn btn-ghost" style="flex-shrink:0;font-size:0.8rem;color:var(--teal);opacity:0.8;">Regenerate Will &rarr;</button><span style="font-size:0.75rem;color:var(--white);">Regenerate your will after updating your questionnaire</span></div>`;
        willActionsHtml += `</div>`;
      } else {
        willActionsHtml = `<button id="generateWillBtn" class="btn btn-primary" style="margin-top:14px;display:block;width:100%;text-align:left;">Generate My Will &rarr;</button>`;
      }
    }

    dashboardContent.innerHTML = `
      <div class="dashboard-welcome">
        <h2>Welcome back, ${firstName}.</h2>
        <p>Manage your will and account from here.</p>
      </div>
      <div class="dashboard-grid">

        <div class="dashboard-card">
          <div class="dashboard-card-icon">&#128196;</div>
          <h3>Your Will</h3>
          <p class="dashboard-status">${productName}</p>
          <span class="dashboard-badge">Paid ${amountPaid}</span>
          ${willActionsHtml || `<a href="${questBtnHref}" class="btn btn-primary" style="margin-top:14px;display:block;text-align:left;">${questBtnLabel}</a>`}
        </div>

        <div class="dashboard-card">
          <div class="dashboard-card-icon">&#128100;</div>
          <h3>Account</h3>
          <p class="dashboard-status">${user.email}</p>
          <button id="signOutBtn" class="btn btn-ghost">Sign out &rarr;</button>
        </div>

      </div>`;

    document.getElementById('signOutBtn').addEventListener('click', async () => {
      await sb.auth.signOut();
      window.location.href = 'index.html';
    });

    async function triggerWillGeneration(btn) {
      btn.disabled    = true;
      btn.textContent = 'Generating your will…';
      try {
        const { data: { session } } = await sb.auth.getSession();
        const resp = await fetch(
          'https://fgyqumgvmllhiqdmgrfc.supabase.co/functions/v1/generate-will',
          {
            method:  'POST',
            headers: {
              'Content-Type':  'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
          }
        );
        const result = await resp.json();
        if (!resp.ok) throw new Error(result.error || 'Generation failed');

        // Redirect to first generated will
        const first = result.wills[0];
        window.location.href = `will-preview.html?id=${first.id}`;
      } catch (err) {
        console.error('Will generation error:', err);
        btn.disabled    = false;
        btn.textContent = 'Generate My Will →';
        alert('Something went wrong generating your will. Please try again.');
      }
    }

    const generateBtn = document.getElementById('generateWillBtn');
    if (generateBtn) generateBtn.addEventListener('click', () => triggerWillGeneration(generateBtn));

    const regenBtn = document.getElementById('regenWillBtn');
    if (regenBtn) regenBtn.addEventListener('click', () => triggerWillGeneration(regenBtn));
  })();
}
