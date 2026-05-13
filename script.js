// =============================================================
// SCRIPT.JS — [Your Business Name] Landing Page
//
// Responsibilities:
//   1. Mobile navigation toggle
//   2. Contact form validation & simulated submission
//   3. Scroll-triggered fade-in animation
// =============================================================


// -------------------------------------------------------------
// 1. MOBILE NAVIGATION TOGGLE
// Toggles the .open class on .nav-links when the hamburger
// button is clicked. Closes the menu when a link is tapped.
// -------------------------------------------------------------
const navToggle = document.querySelector('.nav-toggle');
const navLinks  = document.querySelector('.nav-links');

if (navToggle) navToggle.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});

if (navLinks) navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
  });
});


// -------------------------------------------------------------
// 2. CONTACT FORM
// Validates name + email fields, then simulates a network
// request. Shows success / error feedback in #formNote.
//
// TO DO: Replace the setTimeout block with a real API call
// (e.g. fetch('/api/contact', { method: 'POST', body: ... }))
// -------------------------------------------------------------
const form     = document.getElementById('contactForm');
const formNote = document.getElementById('formNote');

if (form) form.addEventListener('submit', (e) => {
  e.preventDefault();

  const name  = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();

  // Basic validation
  if (!name || !email) {
    formNote.style.color = '#F05230';       // --accent
    formNote.textContent = 'Please fill in your name and email.';
    return;
  }

  // Disable button and show loading state
  const submitBtn = form.querySelector('[type="submit"]');
  submitBtn.disabled    = true;
  submitBtn.textContent = 'Sending…';

  // Simulated async submission — replace with real fetch() call
  setTimeout(() => {
    form.reset();
    submitBtn.disabled    = false;
    submitBtn.textContent = 'Send Message';
    formNote.style.color  = '#00C4A7';      // --teal
    formNote.textContent  = "Thanks! We'll be in touch within 24 hours.";

    // Clear the message after 5 seconds
    setTimeout(() => { formNote.textContent = ''; }, 5000);
  }, 1200);
});


// -------------------------------------------------------------
// 3. SCROLL-TRIGGERED FADE-IN
// Watches .feature-card and .section-header elements. When
// they enter the viewport (12% visible) the .visible class is
// added which triggers the CSS transition defined below.
//
// The CSS is injected here so styles.css stays focused on
// layout; this animation is JavaScript-dependent anyway.
// -------------------------------------------------------------
const fadeTargets = document.querySelectorAll(
  '.feature-card, .section-header'
);

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);   // animate once only
    }
  });
}, { threshold: 0.12 });

fadeTargets.forEach(el => {
  el.classList.add('fade-in');
  observer.observe(el);
});

// -------------------------------------------------------------
// 4. SHOPPING BASKET
// Stores items in localStorage under key 'wa_basket'.
// Runs on every page to keep the nav count in sync.
// basket.html uses renderBasket() to build the full basket UI.
// -------------------------------------------------------------
function getBasket() {
  return JSON.parse(localStorage.getItem('wa_basket') || '[]');
}

function saveBasket(basket) {
  localStorage.setItem('wa_basket', JSON.stringify(basket));
  updateBasketCount();
}

function updateBasketCount() {
  const total = getBasket().reduce((sum, item) => sum + item.qty, 0);
  document.querySelectorAll('.basket-count').forEach(el => {
    el.textContent = total > 0 ? total : '';
  });
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('toast-show'));
  });
  setTimeout(() => {
    toast.classList.remove('toast-show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

function addToBasket(id, name, price) {
  const basket = getBasket();
  const existing = basket.find(item => item.id === id);
  if (existing) {
    existing.qty += 1;
  } else {
    basket.push({ id, name, price, qty: 1 });
  }
  saveBasket(basket);
  showToast(name + ' added to basket');
}

// Wire up "Add to Basket" buttons (choose-a-will.html)
document.querySelectorAll('.add-to-basket').forEach(btn => {
  btn.addEventListener('click', () => {
    addToBasket(btn.dataset.id, btn.dataset.name, parseFloat(btn.dataset.price));
  });
});

// Render basket contents (basket.html only)
function renderBasket() {
  const content = document.getElementById('basketContent');
  if (!content) return;

  const basket = getBasket();

  if (basket.length === 0) {
    content.innerHTML = `
      <div class="basket-empty">
        <span class="basket-empty-icon">&#128722;</span>
        <h2>Your basket is empty</h2>
        <p>Choose a will to get started.</p>
        <a href="choose-a-will.html" class="btn btn-primary">Choose a Will &rarr;</a>
      </div>`;
    return;
  }

  const total = basket.reduce((sum, item) => sum + item.price * item.qty, 0);
  const rows = basket.map(item => `
    <div class="basket-item">
      <div class="basket-item-info">
        <p class="basket-item-name">${item.name}${item.qty > 1 ? ' &times; ' + item.qty : ''}</p>
        <p class="basket-item-price">&pound;${(item.price * item.qty).toFixed(2)}</p>
      </div>
      <button class="basket-item-remove" data-id="${item.id}">Remove</button>
    </div>`).join('');

  const summaryRows = basket.map(item =>
    `<div class="summary-row"><span>${item.name}</span><span>&pound;${(item.price * item.qty).toFixed(2)}</span></div>`
  ).join('');

  content.innerHTML = `
    <div class="basket-layout">
      <div class="basket-items">
        ${rows}
        <div class="basket-progress">
          <div class="bp-step bp-done">
            <div class="bp-circle">&#10003;</div>
            <div class="bp-label">Choose a Will</div>
          </div>
          <div class="bp-connector bp-connector-done"></div>
          <div class="bp-step bp-active">
            <div class="bp-circle">2</div>
            <div class="bp-label">Checkout &amp; Pay</div>
          </div>
          <div class="bp-connector"></div>
          <div class="bp-step">
            <div class="bp-circle">3</div>
            <div class="bp-label">Create Account</div>
          </div>
          <div class="bp-connector"></div>
          <div class="bp-step">
            <div class="bp-circle">4</div>
            <div class="bp-label">Answer Questions</div>
          </div>
        </div>
      </div>
      <aside class="basket-summary">
        <h3>Order summary</h3>
        ${summaryRows}
        <div class="summary-row total"><span>Total</span><span>&pound;${total.toFixed(2)}</span></div>
        <div class="basket-tc-check">
          <label class="basket-tc-label">
            <input type="checkbox" id="tcAgree" />
            <span>I have read and agree to the <a href="terms.html" target="_blank">Terms &amp; Conditions</a>. I understand that Wills Assured is a document generation service and does not provide legal advice.</span>
          </label>
        </div>
        <button id="checkoutBtn" class="btn btn-primary will-cta" disabled>Proceed to Checkout &rarr;</button>
        <button id="redeemVoucherBtn" class="btn btn-ghost will-cta" style="margin-top:10px;width:100%;text-align:center;">Have a voucher code?</button>
        <div id="voucherPanel" class="quest-conditional" style="margin-top:10px;">
          <input type="text" id="voucherCodeInput" class="quest-input" placeholder="e.g. WA-XXXX-XXXX" autocomplete="off" spellcheck="false" style="text-transform:uppercase;letter-spacing:0.06em;" />
          <p id="voucherNote" style="font-size:0.85rem;min-height:20px;margin-top:6px;color:var(--muted);"></p>
          <button id="applyVoucherBtn" class="btn btn-primary will-cta" style="margin-top:4px;">Apply Voucher &rarr;</button>
        </div>
      </aside>
    </div>`;

  content.querySelectorAll('.basket-item-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const updated = getBasket().filter(item => item.id !== btn.dataset.id);
      saveBasket(updated);
      renderBasket();
    });
  });

  const tcAgree    = document.getElementById('tcAgree')
  const checkoutBtn = document.getElementById('checkoutBtn')
  if (tcAgree && checkoutBtn) {
    tcAgree.addEventListener('change', () => {
      checkoutBtn.disabled = !tcAgree.checked
    })
  }

  const redeemVoucherBtn = document.getElementById('redeemVoucherBtn');
  const voucherPanel     = document.getElementById('voucherPanel');
  if (redeemVoucherBtn && voucherPanel) {
    redeemVoucherBtn.addEventListener('click', () => {
      const opening = !voucherPanel.classList.contains('visible');
      voucherPanel.classList.toggle('visible');
      redeemVoucherBtn.textContent = opening ? 'Hide voucher panel' : 'Have a voucher code?';
      if (opening) document.getElementById('voucherCodeInput').focus();
    });
  }
}

// Voucher sub-option selection (choose-a-will.html)
const voucherAddBtn = document.getElementById('voucherAddBtn');
document.querySelectorAll('.voucher-option').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.voucher-option').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');

    const priceEl = document.getElementById('voucherPrice');
    if (priceEl) {
      priceEl.innerHTML = `<strong>&pound;${parseFloat(btn.dataset.price).toFixed(2)}</strong>`;
    }

    if (voucherAddBtn) {
      voucherAddBtn.disabled     = false;
      voucherAddBtn.textContent  = 'Add to Basket →';
      voucherAddBtn.dataset.id    = btn.dataset.id;
      voucherAddBtn.dataset.name  = btn.dataset.name;
      voucherAddBtn.dataset.price = btn.dataset.price;
    }
  });
});

if (voucherAddBtn) {
  voucherAddBtn.addEventListener('click', () => {
    if (!voucherAddBtn.disabled) {
      addToBasket(voucherAddBtn.dataset.id, voucherAddBtn.dataset.name, parseFloat(voucherAddBtn.dataset.price));
    }
  });
}

// Initialise on every page
updateBasketCount();
renderBasket();


// Inject the fade-in animation styles
const fadeStyle = document.createElement('style');
fadeStyle.textContent = `
  .fade-in         { opacity: 0; transform: translateY(20px); transition: opacity 0.5s ease, transform 0.5s ease; }
  .fade-in.visible { opacity: 1; transform: none; }
`;
document.head.appendChild(fadeStyle);


// -------------------------------------------------------------
// 5. COOKIE CONSENT BANNER
// -------------------------------------------------------------
if (!localStorage.getItem('wa_cookie_consent')) {
  const banner = document.createElement('div');
  banner.className = 'cookie-banner';
  banner.innerHTML = `
    <p>We use essential cookies to keep you logged in and process payments securely. See our <a href="privacy-policy.html">Privacy Policy</a> for details.</p>
    <div class="cookie-banner-actions">
      <a href="privacy-policy.html" class="btn btn-ghost" style="font-size:0.85rem;">Learn More</a>
      <button id="cookieAcceptBtn" class="btn btn-primary" style="font-size:0.85rem;">Accept</button>
    </div>`;
  document.body.appendChild(banner);

  document.getElementById('cookieAcceptBtn').addEventListener('click', () => {
    localStorage.setItem('wa_cookie_consent', 'accepted');
    banner.classList.add('hidden');
  });
}
