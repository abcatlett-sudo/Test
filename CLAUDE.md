# CLAUDE.md — Business Landing Page (Starter Template)

This file provides guidance for AI assistants working on this codebase.

## Project Overview

A **static, single-page business landing page** template — no build tools, no package
manager, no server required. Open `index.html` directly in a browser to view it.

All placeholder text is marked with `[brackets]` in `index.html` and is ready to be
replaced with real business content.

**Tech stack:** Vanilla HTML5 · CSS3 (custom properties) · Vanilla JavaScript (ES6+)

---

## File Structure

```
/
├── index.html    # All page markup (~130 lines) — placeholder content inside [brackets]
├── styles.css    # All styles (~450 lines) — fully commented with table of contents
├── script.js     # All JavaScript (~107 lines) — three clearly labelled sections
└── CLAUDE.md     # This file
```

No subdirectories, no dependencies, no configuration files.

---

## Page Sections (index.html)

| Section | Element / ID | Description |
|---|---|---|
| Navigation | `<nav class="navbar">` | Sticky top nav: logo, links, CTA button, mobile hamburger |
| Hero | `<section id="home">` | Badge, headline with `.highlight` span, subtext, two CTA buttons |
| Features | `<section id="features">` | `.section-header` + 3-card `.features-grid`; centre card has `.featured` style |
| Contact | `<section id="contact">` | Name + email row, message textarea, submit button, `#formNote` feedback |
| Footer | `<footer class="footer">` | Logo, copyright text, short nav links — single dark bar |

### What to customise first

1. `<title>` — page title in the browser tab
2. All `[bracket]` placeholders in the HTML (logo, business name, headlines, copy)
3. The three `.feature-card` entries — change icons (emoji), headings, and descriptions
4. CSS variables in `:root` in `styles.css` — swap `--primary` and `--accent` colours to
   match your brand

---

## CSS Conventions (styles.css)

The stylesheet has a table of contents at the top. Sections are numbered 1–9.

### Design Tokens

**Always use CSS variables — never hardcode colour hex values, radii, or shadow values.**

```css
:root {
  --primary:    #6C47FF;   /* Main brand colour — buttons, links, accents     */
  --primary-d:  #5535e0;   /* Hover/active state for primary                  */
  --accent:     #FF6B6B;   /* Secondary accent — gradient pair, error text    */
  --dark:       #0F0E17;   /* Body text, footer background                    */
  --mid:        #2E2C3F;   /* Labels, secondary text                          */
  --muted:      #6B6880;   /* Supporting copy, placeholders                   */
  --light:      #F4F3FF;   /* Card backgrounds, section fills                 */
  --white:      #ffffff;
  --radius:     12px;
  --shadow:     0 4px 24px rgba(108, 71, 255, 0.12);
  --transition: 0.25s ease;
}
```

### Button System

All buttons share the `.btn` base class plus one variant:

| Class | Style | When to use |
|---|---|---|
| `.btn-primary` | Filled purple | Primary calls-to-action |
| `.btn-ghost` | No fill, no border | Soft secondary links |
| `.btn-full` | `width: 100%` | Form submit button |

### Naming Convention

Flat BEM-style with hyphens: `.feature-card`, `.feature-icon`, `.section-header`.
Modifiers are added as a second class: `.feature-card.featured` (not `--featured`).

### Responsive Breakpoint

One breakpoint: `max-width: 768px` (Section 9 of styles.css).
Any new multi-column layout **must** include a collapse rule inside that media query.

---

## JavaScript (script.js)

Three independently labelled sections:

| Section | What it does |
|---|---|
| 1. Mobile nav toggle | Toggles `.open` on `.nav-links`; closes on link click |
| 2. Contact form | Validates name + email; simulates submission via `setTimeout` |
| 3. Fade-in observer | `IntersectionObserver` adds `.visible` to cards/headers on scroll |

The fade-in CSS (`.fade-in` / `.fade-in.visible`) is injected via `script.js` because
the animation is JavaScript-dependent and would do nothing without the observer.

**To connect the form to a real backend**, replace the `setTimeout` block in section 2
with a `fetch()` call to your API endpoint.

---

## Development Workflow

### View the site

```bash
# No build step needed — open directly:
open index.html            # macOS
xdg-open index.html        # Linux

# Or run a local server to avoid browser file:// quirks:
python3 -m http.server 8080
# → http://localhost:8080
```

### Which file to edit

| Task | File |
|---|---|
| Change text, headings, or add/remove sections | `index.html` |
| Change colours, spacing, layout, fonts | `styles.css` |
| Change interactivity or add new behaviour | `script.js` |
| Add a new colour or spacing value | Add a CSS variable to `:root` first |

### Adding a new section

1. Add the HTML in `index.html` using the standard pattern:
   ```html
   <section class="your-section" id="anchor">
     <div class="container">
       <div class="section-header">
         <span class="section-tag">Label</span>
         <h2>Heading</h2>
         <p>Supporting text.</p>
       </div>
       <!-- content -->
     </div>
   </section>
   ```
2. Add the section's styles in `styles.css` (in order, before Section 9).
3. Add a responsive collapse rule in the `@media (max-width: 768px)` block.
4. Add a nav link in the `<ul class="nav-links">` in the navbar.

No tests or linters are configured — verify changes by opening the page in a browser.

---

## Key Conventions for AI Assistants

1. **CSS variables only** — no hardcoded colours or magic numbers that exist as variables.
2. **Flat BEM naming** — hyphens, no camelCase, no underscores.
3. **No libraries** — vanilla JS only; no imports, no bundler.
4. **One breakpoint** — `max-width: 768px`; always add responsive rules there for new layouts.
5. **One file per concern** — no `<style>` tags in HTML, no `onclick` attributes.
6. **Section pattern** — `.container` > `.section-header` > content for every section.
7. **Form feedback colours** — success: `--primary` (`#6C47FF`), error: `--accent` (`#FF6B6B`).

---

## Git

- Active branch: `claude/claude-md-mluz9y8kd1kiqm0f-sMWF4`
- Default branch: `master`
- Remote: `origin` (GitHub — `abcatlett-sudo/Test`)
