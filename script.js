// === Mobile Navigation Toggle ===
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');

navToggle.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});

// Close mobile nav when a link is clicked
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
  });
});

// === Contact Form ===
const form = document.getElementById('contactForm');
const formNote = document.getElementById('formNote');

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();

  if (!name || !email) {
    formNote.style.color = '#FF6B6B';
    formNote.textContent = 'Please fill in your name and email.';
    return;
  }

  // Simulate form submission
  const submitBtn = form.querySelector('[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending…';

  setTimeout(() => {
    form.reset();
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send Message';
    formNote.style.color = '#6C47FF';
    formNote.textContent = "Thanks! We'll be in touch within 24 hours.";
    setTimeout(() => { formNote.textContent = ''; }, 5000);
  }, 1200);
});

// === Scroll-triggered fade-in animation ===
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.feature-card, .about-card, .about-text, .section-header').forEach(el => {
  el.classList.add('fade-in');
  observer.observe(el);
});

// Inject fade-in CSS dynamically (keeps CSS file clean)
const style = document.createElement('style');
style.textContent = `
  .fade-in { opacity: 0; transform: translateY(24px); transition: opacity 0.5s ease, transform 0.5s ease; }
  .fade-in.visible { opacity: 1; transform: none; }
`;
document.head.appendChild(style);
