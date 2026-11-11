# Requests from the contact builder (contact.html, 404.html)

These are changes to shared, foundation-owned files. Each one already has a local workaround in my own
files, so nothing here blocks the contact page.

## 1. motion.js / Lenis — deep links get offset two or three times (bug)
`scrollTo(target)` passes `offset: -(header + 16)` to Lenis. Lenis also applies `html { scroll-padding-block-start:
calc(var(--header-h) + 16px) }`, and on a `:target` element it applies `scroll-margin-block-start` from main.css
(`:target { scroll-margin-block-start: calc(var(--header-h) + 24px) }`) as well.
- Measured at 1440px (header 88px): every `scrollTo('#section')` puts the section top at **208px** (expected 104px).
  A hash deep link on load (`contact.html#inquiry`) lands at **320px**.
- The hash jump also runs about 60ms after init, before web fonts settle, so the layout can still shift afterwards.
- **Suggested fix:** pass `offset: 0` when Lenis is active (let it use scroll-padding), or drop the html
  scroll-padding and the `:target` margin while Lenis runs. Re-run the hash jump after `document.fonts.ready`.
- **Local workaround** (contact.css / contact.js), verified at 1440 (header 88px → targets land at 104px) and
  390 (header 72px → 88px):
  - `goTo()` in contact.js passes an offset that cancels the scroll-padding/scroll-margin Lenis already applies.
  - A capture-phase click handler takes over same-page anchors (`#inquiry`, `#map`, and the header's
    `contact.html#inquiry`) before core `initAnchors()`; it defers one tick when the mobile drawer is open so
    header.js can unlock scrolling first.
  - Deep links on load are re-aligned ~140ms after core's hash jump and again after `load` + `fonts.ready`
    (skipped once the user has scrolled).
  - `body[data-page='contact'] main [id]:target { scroll-margin-block-start: 0 }`.
  Once motion.js is fixed, `goTo()` can become a plain `scrollTo()` and `initAnchors()` in contact.js can be removed.
- A test note: calling native `scrollIntoView()` (including Playwright's auto-scroll) puts Lenis's
  `animatedScroll` out of sync, and the next `scrollTo` then overshoots.

## 2. ui.js — radio groups keep stale validation state
`validateField()` updates only the radio that changed. Its siblings keep `__rule` and `aria-invalid="true"`, and on
`langchange` the cleared error is shown again.
- **Suggested fix:** in `showFieldState` / the `change` handler, clear `__rule` and `aria-invalid` on every radio
  with the same `name`.
- **Local workaround:** a `change` listener in contact.js clears the sibling state.

## 3. ui.js — a way to validate one step of a multi-step form
`validateForm(root)` already works on any container. Please document that (STYLEGUIDE §8). It would also help to
have an opt-out for the built-in `submit` handler, e.g. `data-validate="manual"`, which would only wire
focusout/lang and leave submit alone.
- **Local workaround:** a capture-phase `submit` listener with `stopImmediatePropagation()` drives the wizard.

## 4. consent.js — consent for a single embed
`[data-consent-accept]` always sets the global consent. The contact map needs a "load this embed once" option,
plus a way to change the iframe `src` after load (the tabs switch offices).
- **Suggested addition:** `loadGate(el, {src})` / `data-consent-scope="embed"`.
- **Local workaround:** contact.js injects and swaps its own iframe. It loads only when `onConsent()` fires or
  after an explicit "Load map" click, and that click opt-in is stored per session (`mobco-contact-map`).

## 5. Backend for forms (deployment)
The site is static, so both contact forms hand off to the visitor's mail app through `mailto:`. The inquiry
reference (`MOB-KSA|EGY-YYMMDD-XXXX`) is generated in the browser and is not stored anywhere.
- For production, add a form endpoint (CRM, email API or serverless function) that receives the wizard JSON,
  issues the reference on the server and sends a confirmation. The page already collects everything in
  `values()` / `buildText()` inside `assets/js/pages/contact.js`.

## 6. Header partial — links to pages that did not exist yet (resolved)
`mobco-construction.html`, `mobco-developments.html` and `mobco-real-estate.html` now exist, and
`tools/check.mjs` reports 0 errors and 0 warnings for contact.html and 404.html. Nothing further needed.

## 7. Nice-to-have icons for the sprite
- `pencil` for the review step's "Edit" buttons (the button is text-only for now).
- `navigation` / `map-pinned` for the "directions" links (`arrow-up-right` is used for now).

## 8. Hosting (404)
Configure the host to serve `/404.html` for unknown URLs. Asset paths are relative, so either serve the error
page from the root, or add `<base href="/">` to 404.html at deploy time.

## 9. main.css — headline accent colour on light sections fails contrast
`.section:not(.section--dark):not(.section--deep) .h2 em { color: var(--teal-600) }` gives 2.68:1 on `--sand-50`
and 2.88:1 on white, below the 3:1 AA minimum for large text (measured on the 56px h2s on this page).
- **Suggested fix:** use a slightly deeper teal for accent text on light sections, e.g. `#349487`
  (3.41:1 on sand, 3.66:1 on white), or `--teal-700` where a stronger contrast is acceptable.
- **Local workaround:** contact.css overrides the colour for the h2 accents on this page only.
