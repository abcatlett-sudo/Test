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

navToggle.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});

navLinks.querySelectorAll('a').forEach(link => {
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

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const name  = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();

  // Basic validation
  if (!name || !email) {
    formNote.style.color = '#FF6B6B';       // --accent
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
    formNote.style.color  = '#6C47FF';      // --primary
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

// Inject the fade-in animation styles
const fadeStyle = document.createElement('style');
fadeStyle.textContent = `
  .fade-in         { opacity: 0; transform: translateY(20px); transition: opacity 0.5s ease, transform 0.5s ease; }
  .fade-in.visible { opacity: 1; transform: none; }
`;
document.head.appendChild(fadeStyle);
