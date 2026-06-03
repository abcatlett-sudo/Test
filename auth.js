// ================================================================
// AUTH.JS — Supabase authentication & Stripe checkout for Wills Assured
// ================================================================

const SUPABASE_URL      = 'https://fgyqumgvmllhiqdmgrfc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZneXF1bWd2bWxsaGlxZG1ncmZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5MzQ1NDYsImV4cCI6MjA5MjUxMDU0Nn0.GwQsnXsraNegEqdYASRwagOxMgyAZg2iNXzP3Syqii8';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});


// ----------------------------------------------------------------
// NAV — swap 'Sign In' for 'Dashboard' when a session is active.
// onAuthStateChange reads from localStorage so there is no flash.
// ----------------------------------------------------------------
sb.auth.onAuthStateChange((_event, session) => {
  if (_event === 'PASSWORD_RECOVERY') {
    if (!window.location.pathname.endsWith('reset-password.html')) {
      window.location.href = 'reset-password.html';
    }
    return;
  }

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
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = 'login.html'; return null; }
  return session.user;
}


// ----------------------------------------------------------------
// CHECKOUT — "Proceed to Checkout" button on basket page.
// Uses event delegation because the button is rendered dynamically.
// Calls the create-checkout Supabase Edge Function which returns
// a Stripe-hosted checkout URL.
// ----------------------------------------------------------------
// ----------------------------------------------------------------
// BASKET — "Apply Voucher" inline panel.
// Validates code, redeems immediately if logged in, otherwise
// saves code to localStorage and redirects to register.html.
// ----------------------------------------------------------------
document.addEventListener('click', async (e) => {
  if (e.target.id !== 'applyVoucherBtn') return;

  const btn   = e.target;
  const input = document.getElementById('voucherCodeInput');
  const note  = document.getElementById('voucherNote');
  const code  = input.value.trim().toUpperCase();

  if (!code) {
    note.style.color = 'var(--accent)';
    note.textContent = 'Please enter your voucher code.';
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Checking…';
  note.textContent = '';

  const { data: { session } } = await sb.auth.getSession();
  const basket      = JSON.parse(localStorage.getItem('wa_basket') || '[]');
  const productType = basket[0]?.id || null;

  if (session) {
    try {
      const resp = await fetch(
        'https://fgyqumgvmllhiqdmgrfc.supabase.co/functions/v1/redeem-voucher',
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body:    JSON.stringify({ code, productType }),
        }
      );
      const result = await resp.json();
      if (!resp.ok) {
        note.style.color = 'var(--accent)';
        note.textContent = result.error || 'Something went wrong. Please try again.';
        btn.disabled    = false;
        btn.textContent = 'Apply Voucher →';
        return;
      }
      note.style.color = 'var(--teal)';
      note.textContent = '✓ Voucher redeemed! Taking you to your dashboard…';
      localStorage.removeItem('wa_basket');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 1500);
    } catch {
      note.style.color = 'var(--accent)';
      note.textContent = 'Something went wrong. Please try again.';
      btn.disabled    = false;
      btn.textContent = 'Apply Voucher →';
    }
  } else {
    // Validate before redirecting — no auth needed for check-voucher
    try {
      const checkResp = await fetch(
        'https://fgyqumgvmllhiqdmgrfc.supabase.co/functions/v1/check-voucher',
        { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }, body: JSON.stringify({ code, productType }) }
      );
      const checkResult = await checkResp.json();
      if (!checkResp.ok) {
        note.style.color = 'var(--accent)';
        note.textContent = checkResult.error || 'Invalid voucher code.';
        btn.disabled    = false;
        btn.textContent = 'Apply Voucher →';
        return;
      }
    } catch {
      note.style.color = 'var(--accent)';
      note.textContent = 'Could not verify voucher. Please try again.';
      btn.disabled    = false;
      btn.textContent = 'Apply Voucher →';
      return;
    }
    localStorage.setItem('wa_pending_voucher', code);
    localStorage.removeItem('wa_basket');
    note.style.color = 'var(--teal)';
    note.textContent = '✓ Code saved! Create your account to complete redemption.';
    setTimeout(() => { window.location.href = 'register.html'; }, 1200);
  }
});


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

    const redirectTo = 'https://www.willsassured.co.uk/login.html';

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
      const params     = new URLSearchParams(window.location.search);
      const redirectTo = params.get('redirect');
      window.location.href = redirectTo ? decodeURIComponent(redirectTo) : 'dashboard.html';
    }
  });
}

// ----------------------------------------------------------------
// FORGOT PASSWORD — inline reset flow on login page
// ----------------------------------------------------------------
const forgotLink = document.getElementById('forgotLink');
if (forgotLink) {
  forgotLink.addEventListener('click', (e) => {
    e.preventDefault();

    const card = forgotLink.closest('.auth-card');
    card.innerHTML = `
      <a href="index.html" class="auth-logo">Wills Assured</a>
      <div class="auth-header">
        <h1>Reset your password</h1>
        <p>Enter your email address and we'll send you a link to reset your password.</p>
      </div>
      <form class="auth-form" id="resetForm" novalidate>
        <div class="form-group">
          <label for="resetEmail">Email address</label>
          <input
            type="email"
            id="resetEmail"
            name="email"
            placeholder="jane@example.com"
            required
            autocomplete="email"
          />
        </div>
        <button type="submit" class="btn btn-full">Send Reset Link</button>
        <p class="form-note" id="resetNote"></p>
      </form>
      <p class="auth-footer"><a href="login.html">&larr; Back to Sign In</a></p>
    `;

    document.getElementById('resetForm').addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('resetEmail').value.trim();
      const note  = document.getElementById('resetNote');
      const btn   = document.querySelector('#resetForm button[type="submit"]');

      if (!email) {
        note.style.color = 'var(--accent)';
        note.textContent = 'Please enter your email address.';
        return;
      }

      btn.disabled    = true;
      btn.textContent = 'Sending…';

      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password.html',
      });

      if (error) {
        note.style.color = 'var(--accent)';
        note.textContent = error.message;
        btn.disabled    = false;
        btn.textContent = 'Send Reset Link';
      } else {
        note.style.color = 'var(--teal)';
        note.textContent = '✓ Reset link sent — please check your email.';
        btn.disabled    = true;
        btn.textContent = 'Email Sent';
      }
    });
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

    // Check for a paid/renewal purchase against this user, most recent first
    const { data: purchases } = await sb
      .from('purchases')
      .select('*')
      .in('status', ['paid', 'renewal'])
      .or(`user_id.eq.${user.id},email.eq.${user.email}`)
      .order('created_at', { ascending: false });

    if (!purchases || purchases.length === 0) {
      // Fix 2 — check for a pending Stripe session saved before connection was lost
      const pendingSession = JSON.parse(localStorage.getItem('wa_pending_session') || 'null');
      if (pendingSession?.sessionId) {
        try {
          const { data: { session: authSession } } = await sb.auth.getSession();
          const resp = await fetch(
            'https://fgyqumgvmllhiqdmgrfc.supabase.co/functions/v1/verify-session',
            {
              method:  'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authSession.access_token}` },
              body:    JSON.stringify({ sessionId: pendingSession.sessionId }),
            }
          );
          const result = await resp.json();
          if (result.success) {
            localStorage.removeItem('wa_pending_session');
            window.location.reload();
            return;
          }
        } catch {
          // Network error — fall through to no-purchase UI
        }
      }

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

        // Auto-redeem a voucher saved from the basket page
        const pendingVoucher = localStorage.getItem('wa_pending_voucher');
        if (pendingVoucher) {
          localStorage.removeItem('wa_pending_voucher');
          document.getElementById('dashVoucherInput').value = pendingVoucher;
          setTimeout(() => dashRedeemBtn.click(), 400);
        }
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
      renewal:       'Account Renewal',
    };

    // Find the original will purchase for product name/amount (not a renewal row)
    const willPurchase = purchases.find(p => p.product_id !== 'renewal') || purchase;
    const productName  = productLabels[willPurchase.product_id] || 'Will';
    const amountPaid   = `£${(willPurchase.amount / 100).toFixed(2)}`;

    // Expiry
    const expiresAt  = purchase.expires_at ? new Date(purchase.expires_at) : null;
    const now        = new Date();
    const isExpired  = expiresAt ? expiresAt < now : false;
    const daysLeft   = expiresAt ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

    let expiryHtml = '';
    if (expiresAt) {
      const expiryStr = expiresAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      if (isExpired) {
        expiryHtml = `<span class="dashboard-expiry expiry-expired">&#9888; Edit window expired ${expiryStr}</span>`;
      } else if (daysLeft !== null && daysLeft <= 30) {
        expiryHtml = `<span class="dashboard-expiry expiry-warning">&#9888; ${daysLeft} day${daysLeft === 1 ? '' : 's'} left to edit &mdash; expires ${expiryStr}</span>`;
      } else {
        expiryHtml = `<span class="dashboard-expiry">&#9679; Edits available until ${expiryStr}</span>`;
      }
    }

    // Check questionnaire progress
    const { data: questResponse } = await sb
      .from('will_responses')
      .select('completed, current_step')
      .eq('user_id', user.id)
      .eq('product_type', purchase.product_id)
      .maybeSingle();

    const questUrl = `questionnaire.html?type=${willPurchase.product_id}`;
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

    const questComplete = questResponse?.completed === true;

    const isMirror = willPurchase.product_id === 'mirror';

    // Build will actions block
    let willActionsHtml = '';
    if (isExpired) {
      // Expired: show view/download buttons only, lock editing
      willActionsHtml = `<div style="margin-top:14px;display:flex;flex-direction:column;gap:8px;">`;
      if (questComplete) {
        const primaryWill = generatedWills?.find(w => w.testator_key === 'primary');
        const partnerWill = generatedWills?.find(w => w.testator_key === 'partner');
        if (primaryWill) {
          willActionsHtml += `<a href="will-preview.html?id=${primaryWill.id}" class="btn btn-primary" style="display:block;text-align:left;">View Your Will &rarr;</a>`;
        }
        if (isMirror && partnerWill) {
          willActionsHtml += `<a href="will-preview.html?id=${partnerWill.id}" class="btn btn-primary" style="display:block;text-align:left;">View Partner's Will &rarr;</a>`;
        }
      }
      willActionsHtml += `<button id="renewBtn" class="btn btn-primary" style="display:block;text-align:left;">Renew to Edit &mdash; £9.99 &rarr;</button>`;
      willActionsHtml += `<p style="font-size:0.8rem;color:var(--muted);margin-top:2px;">Unlock editing for another 24 months</p>`;
      willActionsHtml += `</div>`;
    } else if (questComplete) {
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
          ${expiryHtml}
          ${willActionsHtml || (isExpired ? '' : `<a href="${questBtnHref}" class="btn btn-primary" style="margin-top:14px;display:block;text-align:left;">${questBtnLabel}</a>`)}
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

    const renewBtn = document.getElementById('renewBtn');
    if (renewBtn) {
      renewBtn.addEventListener('click', async () => {
        renewBtn.disabled    = true;
        renewBtn.textContent = 'Redirecting to payment…';
        try {
          const { data, error } = await sb.functions.invoke('create-checkout', {
            body: { productId: 'renewal', customerEmail: user.email },
          });
          if (error || !data?.url) throw new Error(error?.message || 'No checkout URL');
          window.location.href = data.url;
        } catch (err) {
          renewBtn.disabled    = false;
          renewBtn.textContent = 'Renew to Edit — £9.99 →';
          alert('Something went wrong starting renewal. Please try again.');
        }
      });
    }
  })();
}

// ----------------------------------------------------------------
// RESET PASSWORD PAGE (#resetPasswordForm)
// Supabase lands the user here after they click the email link.
// The session is automatically set from the URL token.
// ----------------------------------------------------------------
const resetPasswordForm = document.getElementById('resetPasswordForm');
if (resetPasswordForm) {
  resetPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const newPassword     = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;
    const note            = document.getElementById('resetPasswordNote');
    const btn             = resetPasswordForm.querySelector('button[type="submit"]');

    if (newPassword.length < 8) {
      note.style.color = 'var(--accent)';
      note.textContent = 'Password must be at least 8 characters.';
      return;
    }
    if (newPassword !== confirmPassword) {
      note.style.color = 'var(--accent)';
      note.textContent = 'Passwords do not match.';
      return;
    }

    btn.disabled    = true;
    btn.textContent = 'Updating…';

    const { error } = await sb.auth.updateUser({ password: newPassword });

    if (error) {
      note.style.color = 'var(--accent)';
      note.textContent = error.message;
      btn.disabled    = false;
      btn.textContent = 'Update Password';
    } else {
      note.style.color = 'var(--teal)';
      note.textContent = '✓ Password updated! Redirecting…';
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 1500);
    }
  });
}
