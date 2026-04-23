// ================================================================
// AUTH.JS — Supabase authentication for Wills Assured
//
// SETUP (do this once before going live):
//   1. Go to https://supabase.com and create a free account
//   2. Create a new project (e.g. "wills-assured")
//   3. In your project go to Settings → API
//   4. Copy "Project URL" and "anon / public" key into the two
//      constants below and save the file
//   5. In Supabase go to Authentication → URL Configuration and
//      add your site URL to "Redirect URLs"
// ================================================================

const SUPABASE_URL      = 'https://fgyqumgvmllhiqdmgrfc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZneXF1bWd2bWxsaGlxZG1ncmZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5MzQ1NDYsImV4cCI6MjA5MjUxMDU0Nn0.GwQsnXsraNegEqdYASRwagOxMgyAZg2iNXzP3Syqii8';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// ----------------------------------------------------------------
// NAV — update 'Sign In' button to 'Dashboard' when logged in.
// onAuthStateChange fires synchronously from localStorage on load
// so there is no visible flash.
// ----------------------------------------------------------------
sb.auth.onAuthStateChange((_event, session) => {
  const cta = document.querySelector('.nav-cta');
  if (!cta) return;
  if (session) {
    cta.textContent = 'Dashboard';
    cta.href = 'dashboard.html';
  } else {
    cta.textContent = 'Sign In';
    cta.href = 'login.html';
  }
});


// ----------------------------------------------------------------
// HELPER — redirect to login if no active session
// ----------------------------------------------------------------
async function requireAuth() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    window.location.href = 'login.html';
    return null;
  }
  return user;
}


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

    // Client-side validation
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

    // Build redirect URL dynamically so it works on any host
    const base       = window.location.href.replace(/[^/]*$/, '');
    const redirectTo = base + 'dashboard.html';

    const { error } = await sb.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: { full_name: name }
      }
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
// ----------------------------------------------------------------
const dashboardContent = document.getElementById('dashboardContent');
if (dashboardContent) {
  (async () => {
    const user = await requireAuth();
    if (!user) return;

    const fullName   = user.user_metadata?.full_name || user.email;
    const firstName  = fullName.split(' ')[0];

    dashboardContent.innerHTML = `
      <div class="dashboard-welcome">
        <h2>Welcome back, ${firstName}.</h2>
        <p>Manage your will and account from here.</p>
      </div>
      <div class="dashboard-grid">

        <div class="dashboard-card">
          <div class="dashboard-card-icon">&#128196;</div>
          <h3>Your Will</h3>
          <p class="dashboard-status">Not yet started</p>
          <a href="choose-a-will.html" class="btn btn-primary">Get Started &rarr;</a>
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
  })();
}
