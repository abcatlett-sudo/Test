# CLAUDE.md — Luminary Landing Page

This file provides guidance for AI assistants working on this codebase.

## Project Overview

**Luminary** is a static single-page business landing page. It requires no build tools,
no package manager, and no server — open `index.html` directly in a browser.

**Tech stack:** Vanilla HTML5 · CSS3 (custom properties) · Vanilla JavaScript (ES6+)

---

## File Structure

```
/
├── index.html    # Entire page markup (single file, ~215 lines)
├── styles.css    # All styles (~400 lines)
├── script.js     # All JavaScript (~70 lines)
└── CLAUDE.md     # This file
```

There are no subdirectories, no assets folder, no dependencies, and no configuration files.

---

## Page Sections (index.html)

The page is a single scrollable document with anchor-linked sections:

| Section | ID / Class | Description |
|---|---|---|
| Navigation | `.navbar` | Sticky top nav with logo, links, CTA button, mobile hamburger |
| Hero | `#home` `.hero` | Headline, subtext, two CTA buttons, three stats, decorative shape |
| Features | `#features` `.features` | 6-card grid of services; one card has `.featured` highlight style |
| About | `#about` `.about` | Two-column layout: text left, testimonial card right |
| Contact | `#contact` `.contact` | Form with name, email, service select, message, submit button |
| Footer | `.footer` | Dark background; brand column + 3 link columns + copyright bar |

---

## CSS Conventions (styles.css)

### Design Tokens

All visual values are defined as CSS custom properties on `:root`. **Always use these variables
— never hardcode colors, radii, or shadow values.**

```css
:root {
  --primary:    #6C47FF;   /* Brand purple — primary actions, links, accents */
  --primary-d:  #5535e0;   /* Darker purple — hover state for primary */
  --accent:     #FF6B6B;   /* Coral red — gradient pair, error text */
  --dark:       #0F0E17;   /* Near-black — body text, footer background */
  --mid:        #2E2C3F;   /* Dark grey — secondary text, form labels */
  --muted:      #6B6880;   /* Muted purple-grey — body copy, placeholders */
  --light:      #F4F3FF;   /* Off-white purple tint — section backgrounds, cards */
  --white:      #ffffff;
  --radius:     12px;       /* Standard border radius */
  --shadow:     0 4px 24px rgba(108, 71, 255, 0.12);
  --transition: 0.25s ease;
}
```

### Naming Conventions

Classes follow a BEM-like flat pattern — block name joined to element name with a hyphen:

```
.feature-card       Block
.feature-icon       Block + element
.feature-card.featured  Block + modifier (modifier is a second class, not --modifier)
```

Avoid deep nesting in selectors. The stylesheet uses at most two levels (e.g., `.feature-card h3`).

### Button System

Four button variants share the base `.btn` class:

| Class | Appearance | Use |
|---|---|---|
| `.btn-primary` | Filled purple | Primary CTAs |
| `.btn-outline` | Purple border, transparent fill | Secondary nav CTA |
| `.btn-ghost` | No border, no background | Inline soft actions |
| `.btn-full` | `width: 100%` modifier | Full-width form submit |

### Responsive Breakpoint

One breakpoint at `max-width: 768px`. At this width:
- `.nav-links` and `.nav-cta` are hidden; `.nav-toggle` (hamburger) is shown.
- `.features-grid` collapses from auto-fit columns to a single column.
- `.about-inner` collapses from two columns to one.
- `.form-row` collapses from two columns to one.
- `.footer-inner` collapses from two columns to one.

### Section Layout Pattern

Each content section uses this structural pattern:

```html
<section class="[section-name]" id="[anchor]">
  <div class="container">
    <div class="section-header">
      <span class="section-tag">Short Label</span>
      <h2>Main Heading</h2>
      <p>Supporting sentence.</p>
    </div>
    <!-- section content -->
  </div>
</section>
```

`.container` constrains content to `max-width: 1160px` with `padding: 0 24px`.

---

## JavaScript Conventions (script.js)

The file has three independent, clearly delimited responsibilities:

1. **Mobile navigation toggle** — toggles `.open` class on `.nav-links`; removes it when
   any nav link is clicked.

2. **Contact form handling** — client-side validation (name + email required), simulates
   a network request via `setTimeout(1200ms)`, resets form on success, shows inline
   feedback in `#formNote`.

3. **Scroll-triggered fade-in** — `IntersectionObserver` (threshold `0.12`) adds `.visible`
   to `.feature-card`, `.about-card`, `.about-text`, and `.section-header` elements as they
   scroll into view. The CSS for `.fade-in` / `.fade-in.visible` is injected dynamically
   via `document.createElement('style')` to keep `styles.css` clean.

**No external libraries, no module system, no transpilation.** The script runs as a classic
`<script>` at the bottom of `<body>`.

---

## Development Workflow

### Running the site

No build step required. Open `index.html` in a browser:

```bash
# Option 1 — open directly
open index.html          # macOS
xdg-open index.html      # Linux

# Option 2 — simple local server (avoids some browser file:// restrictions)
python3 -m http.server 8080
# then visit http://localhost:8080
```

### Making changes

- **HTML structure / content** → edit `index.html`
- **All visual styling** → edit `styles.css`; use existing CSS variables
- **Behavior / interactivity** → edit `script.js`
- **New color or spacing value** → add it as a CSS variable in `:root` first

### No tests or linters are configured. Manual browser testing is the verification method.

---

## Key Conventions for AI Assistants

1. **Use CSS variables** — never hardcode color hex values or magic numbers that already
   exist as variables.

2. **Follow the existing naming pattern** — flat BEM-style with hyphens (`.section-tag`,
   `.hero-sub`, `.footer-brand`). Do not introduce camelCase or underscore naming.

3. **Keep JavaScript vanilla** — do not import libraries or introduce module syntax.
   The page has no bundler.

4. **Maintain the section pattern** — new sections should use `.container` > `.section-header`
   > content, matching the structure of existing sections.

5. **Mobile breakpoint at 768px** — any new grid or multi-column layout must include a
   responsive collapse rule inside the `@media (max-width: 768px)` block at the end of
   `styles.css`.

6. **One file per concern** — keep HTML in `index.html`, styles in `styles.css`, and
   behavior in `script.js`. Do not inline `<style>` blocks or `onclick` handlers in HTML
   (the dynamic fade-in injection in `script.js` is intentional and acceptable).

7. **Smooth scroll is on by default** — `html { scroll-behavior: smooth; }` is set globally.
   All internal navigation uses `href="#anchor"` links; keep this pattern for new sections.

8. **Form feedback** uses `#formNote` — write success messages in `--primary` purple and
   error messages in `--accent` coral (`#FF6B6B`), matching the existing pattern in
   `script.js`.

---

## Git

- Default branch: `master`
- One commit in history: initial landing page creation
- Remote: `origin` (GitHub — `abcatlett-sudo/Test`)
