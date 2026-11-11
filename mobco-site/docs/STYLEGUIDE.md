# MOBCO Website — Developer Style Guide (foundation contract)

This is the reference for everyone building a page. Read `docs/BRIEF.md` first (brand, facts, honesty
rules). This file covers **how** to build: files, tokens, classes, data attributes, JS APIs, i18n/RTL,
motion, QA and ownership. The live, visual version of everything here is **`styleguide.html`**
(open it in EN and with `?lang=ar`). `_template.html` is the page skeleton to copy.

Contents
1. Ownership & workflow
2. Page skeleton (head boot script, body attributes, includes)
3. Design tokens
4. Layout: container, grid, sections & themes
5. Typography classes
6. Components (CSS classes + markup)
7. Data attributes (behaviour)
8. JavaScript API (core modules + data)
9. i18n (EN/AR) authoring rules
10. RTL rules
11. Motion rules
12. Images
13. Accessibility checklist
14. QA commands
15. Cross-page contracts (anchors, URL params) & content honesty
16. Shared-file integration pass
17. Round 2 shared changes (header, cookie bar, copy)

Copy rule (round 2): no em or en dashes in any visible string, EN or AR. See the copy guide used for round 2.

---

## 1. Ownership & workflow

| You own (page builder) | Shared — read only (foundation) |
|---|---|
| `<page>.html` | `partials/header.html`, `partials/footer.html` |
| `assets/css/pages/<page>.css` | `assets/css/main.css` |
| `assets/js/pages/<page>.js` (studio: `assets/js/studio/*.js`) | `assets/js/core/**`, `assets/js/data/**` |
| `docs/content-notes/<page>.md` | `assets/icons/sprite.svg`, `tools/**`, `_template.html`, `styleguide.html`, this file |

Need a shared change (new icon, new token, data field, bug)? Write it in `docs/requests/<page>.md` and
work around it locally (page CSS / page JS) meanwhile. **Never edit shared files.**

Workflow for a page:
```bash
cp _template.html about.html                      # then edit head/body (see §2)
node tools/build.mjs about.html                   # inline header/footer (ONLY your file!)
node tools/check.mjs --pages about.html --port 8123 --shots /tmp/qa/about   # pick a unique port
# Read the screenshots in /tmp/qa/about, fix, repeat until "0 error(s)".
```
Run `tools/build.mjs` again whenever the partials change (it is idempotent). Always pass your file name:
builders run in parallel and `node tools/build.mjs` with no args touches every page.

Page CSS: scope everything to your page — prefix classes with the page name (`.home-hero`, `.about-timeline`)
or nest under `body[data-page="about"]`. Use the tokens (`var(--space-6)`, `var(--navy-900)`), never raw
hex values except for one-off art direction. Use logical properties only (see §10).

## 2. Page skeleton

Copy `_template.html`. Required edits:

- `<title data-ar-title="…">EN | MOBCO Group</title>`; `<meta name="description" data-ar-content="…">`;
  `og:title`, `og:description`, `twitter:*` (each with `data-ar-content`), canonical + `og:url`
  (placeholder domain `https://mobco-group.com/<page>.html` — marked TODO(deploy)). Remove
  `<meta name="robots" content="noindex">` (only the template and styleguide are noindex).
- Hero image preload: `<link rel="preload" href="assets/img/<hero>.webp" as="image" type="image/webp" fetchpriority="high">`.
- Page CSS/JS: `assets/css/pages/<page>.css`, `<script type="module" src="assets/js/pages/<page>.js">`.
  Exceptions: `studio.html` loads its entry from `assets/js/studio/studio.js` (there is no `pages/studio.js`);
  the three subsidiary pages share `assets/css/pages/subsidiary.css` / `assets/js/pages/subsidiary.js`.
- `studio.html` also adds, **before** the module scripts:
  `<script type="importmap">{"imports":{"three":"./assets/vendor/three/three.module.js","three/addons/":"./assets/vendor/three/addons/"}}</script>`
- **Keep the inline boot `<script>` verbatim** (it sets `html.js`, early `lang/dir`, the first-visit
  preloader flag, the incoming page-transition flag and `?qa=1`). Script order is fixed:
  ```html
  <script src="assets/vendor/gsap/gsap.min.js" defer></script>
  <script src="assets/vendor/gsap/ScrollTrigger.min.js" defer></script>
  <script src="assets/vendor/lenis/lenis.min.js" defer></script>
  <script type="module" src="assets/js/core/main.js"></script>
  <script type="module" src="assets/js/pages/<page>.js"></script>
  ```
- `<body data-page="<id>" data-hero="dark|light">`
  - `data-page` = nav id: `home|about|subsidiaries|projects|studio|media|careers|contact` (`404` for 404).
    It drives the active nav link (`aria-current="page"`).
  - Optional `data-footer-cta="off"` hides the footer's "Let's build what's next" block — for pages (home) that
    end on their own closing CTA, and contact (its hero already says it and the CTA would link to the same page).
  - `data-hero="dark"` → transparent header with white text over your first (dark/photo) section; it turns
    solid white on scroll. `data-hero="light"` → navy header text from the start. With a light first
    section that is not `.page-hero`, give it `.pt-header` (padding-top = header height + 64px).
- Includes (must stay on their own lines; `build.mjs` replaces what is between them):
  ```html
  <!-- @include header -->
  <!-- /@include header -->
  <main id="main" tabindex="-1"> … </main>
  <!-- @include footer -->
  <!-- /@include footer -->
  ```
  The header include contains the skip link, the scroll-progress bar and the header (tab bar + the two dropdown menus).
  There is no burger and no mobile drawer (removed in round 2, see §6.10).
  The footer include contains the footer, newsletter form and the back-to-top ring.
- Every page needs exactly one `<h1>`.

## 3. Design tokens (`:root` in main.css)

**Brand colours** `--navy-950 #0b1620` · `--navy-900 #122230` · `--navy-800 #1a2e3e` · `--navy-700 #263a4a` ·
`--navy-600 #364a5b` · `--slate-500 #5b6e7d` · `--slate-400` · `--slate-300` · `--slate-200` · `--slate-100` ·
`--sand-50 #f5f7f8` · `--white` · `--teal-300 #9be3da` · `--teal-400 #6fd1c5` (signature accent) ·
`--teal-600 #3fa89c` (decorative lines/fills on light) · `--teal-650 #349487` (large accent text on light, e.g. headline
`<em>`: 3.66:1 on white, 3.41:1 on sand) · `--teal-700 #2a7a70` (small accent **text** on light, AA) · `--gold-500 #b8975a`
(MOBCO Real Estate Development only) · `--danger #c2493f` · `--danger-300` · `--warning`.

**Semantic (theme-aware — prefer these in components)**: `--bg`, `--fg` (body text), `--fg-strong`
(headings), `--fg-muted`, `--accent` (decorative: lines, numerals), `--accent-text` (accent as text),
`--line` (hairline), `--line-strong`, `--surface` (cards/fields), `--surface-2`, `--focus`.
**`--focus` is the focus-ring colour** used by every `:focus-visible` outline — never reuse the name for your own
custom property (e.g. a focal point): a non-colour value silently invalidates the outline. Use `--focal`, `--pt`, ….
They switch automatically inside `.section--dark`, `.section--deep`, `.on-dark`, `.theme-dark`,
`.page-hero`, `.cta-band`, `.site-footer`, `.lightbox`.

**Type** `--font-display` (Manrope; IBM Plex Sans Arabic in AR) · `--font-body` (Inter; Plex Arabic in AR) ·
`--font-arabic` · sizes (fluid `clamp()`): `--fs-xs .75rem` · `--fs-sm .875rem` · `--fs-base 1rem` · `--fs-md` ·
`--fs-lead` · `--fs-h6` … `--fs-h1` · `--fs-display` (48→120px) · `--fs-numeral` · `--fs-eyebrow`.
Line heights `--lh-tight 1.04`, `--lh-heading 1.12`, `--lh-snug`, `--lh-body 1.7` (AR: larger).
Tracking `--tracking-display .04em`, `--tracking-heading .05em`, `--tracking-label .16em`,
`--tracking-eyebrow .3em` (all **0** in Arabic).

**Spacing (8px scale)** `--space-1 4px` · `-2 8` · `-3 12` · `-4 16` · `-5 24` · `-6 32` · `-7 40` · `-8 48` ·
`-9 64` · `-10 80` · `-11 96` · `-12 128` · `-13 160` · `--section-pad clamp(80px…160px)` · `--section-pad-sm`.

**Layout** `--container 1320px` · `--container-wide 1600px` · `--container-narrow 880px` ·
`--gutter clamp(16px…48px)` (side padding) · `--grid-gap clamp(16px…32px)` · header height tokens (below).

**Header height** (plain px values, so `parseFloat(getComputedStyle(html).getPropertyValue('--header-h'))` works):

| Width | Layout | `--header-row` | `--header-tabs` | `--header-h` |
|---|---|---|---|---|
| < 768px | two rows: logo + tools, then the scrollable tab bar | 56px | 44px | **100px** |
| 768 to 1099px | two rows | 64px | 48px | **112px** |
| 1100 to 1279px | one row (compact) | 76px | 0px | **76px** |
| ≥ 1280px | one row | 88px | 0px | **88px** |

Always offset fixed-header content with `var(--header-h)` (hero padding, `top` of sticky elements, `.pt-header`).
`html { scroll-padding-block-start }` and `scrollTo()` already use it.

**Shape/elevation** `--radius 2px` (architectural; use everywhere) · `--radius-lg 4px` · `--radius-pill` (toggles only) ·
`--hairline` (`1px solid var(--line)`) · `--shadow-xs|sm|md|lg` · `--shadow-header`.

**Motion** `--ease-out` (expo-out; reveals, drawers) · `--ease-in-out` (curtains) · `--ease-soft` (hovers) ·
`--ease-spring` · `--dur-fast 160ms` · `--dur 320ms` · `--dur-slow 640ms` · `--dur-reveal 1100ms`.

**Layers** `--z-base 1` · `--z-raised 10` · `--z-sticky 50` · `--z-header 100` · `--z-mega 110` · `--z-progress 120` ·
`--z-to-top 140` · `--z-drawer 200` · `--z-modal 300` · `--z-lightbox 400` · `--z-search 450` · `--z-consent 480` ·
`--z-toast 500` · `--z-tooltip 600` · `--z-cursor 900` · `--z-transition 950` · `--z-preloader 1000`.
Page content should stay below `--z-sticky` unless it is an overlay.

Breakpoints (min-width): `640` (sm) · `768` (md) · `1024` (lg) · `1100` (header: tabs move into the logo row) · `1200` · `1280` (header: full size) · `1440`.

## 4. Layout

```html
<section class="section [section--sand|section--dark|section--deep|section--white] [section--sm] [has-gridlines]">
  <div class="container [container--wide|container--narrow]"> … </div>
</section>
```
- `.section` vertical padding `--section-pad`; `--sm` smaller; `--flush-top` / `--flush-bottom`; `--hairline` top border.
- Alternate white / sand / dark sections. Dark = `.section--dark` (navy-900) or `.section--deep` (navy-950).
- `.has-gridlines` — signature vertical hairlines at container edges & quarters (decorative background).
- `.blueprint-bg` — 48px square grid texture.
- **12-col grid**: `.grid` (children span 12 by default) + `.col-N` (all sizes), `.col-sm-N` (≥640),
  `.col-md-N` (≥768), `.col-lg-N` (≥1024); offsets `.start-md-N`, `.start-lg-N`.
  Modifiers `.grid--tight`, `.grid--loose`, `.grid--flush`, `.grid--rows-gap`, `.grid--center`, `.grid--end`.
- Equal grids: `.grid-2` (2 cols ≥768), `.grid-3` (2 ≥640, 3 ≥1024), `.grid-4` (2 ≥640, 4 ≥1024),
  `.grid-auto` (auto-fill; set `style="--min:240px"`).
- `.stack` (column, gap `--stack-gap`; `.stack-sm|lg|xl`), `.cluster` (wrap row; `--between`, `--end`, `--lg`).
- Utilities: `.visually-hidden`, `.text-center|start|end`, `.mx-auto`, `.measure` (62ch), `.measure-sm`,
  `.mt-0|2|4|6|8|10`, `.mb-0|2|4|6|8|10`, `.hide-sm`, `.show-sm`, `.hide-md-down`, `.hide-lg`, `.nowrap`,
  `.relative`, `.overflow-hidden`, `.w-full`, `.h-full`, `.flex`, `.items-center`, `.justify-between`, `.gap-2|4|6`.

## 5. Typography

| Class / element | Use |
|---|---|
| `.display` | hero headline (Manrope 500, uppercase, 48→120px) |
| `h1/.h1` … `h6/.h6` | headings; h1–h3 uppercase tracked; `h6` = small label heading |
| `<em>` inside `.display/.h1/.h2` | accent colour word(s) (teal; teal-600 on light sections) |
| `.eyebrow` | uppercase teal label with a 32px leading rule; `.eyebrow--plain` (no rule), `.eyebrow--center`, `.eyebrow__num` |
| `.lead` | intro paragraph · `.body-lg` · `.small` · `.tiny` · `.muted` · `.label` · `.num` (tabular) |
| `.numeral` | big teal numerals ("01"); `.numeral--outline`, `.numeral--sm` |
| `.outline-text` | outlined accent text |
| `.prose` | long-form rich text (spacing, links, lists) · `.text-link` inline link |
| `blockquote.quote` | pull quote with accent rule |
| `.latin` | isolate Latin brand names inside Arabic text |

Arabic: uppercase/letter-spacing are removed automatically for all classes above.
Headlines use `text-wrap: balance` — avoid manual `<br>` except for art-directed breaks.

## 6. Components

All components work in light and dark sections (semantic tokens). Icons: §6.1.

### 6.1 Icons
```html
<svg class="icon [icon--sm|md|lg|xl|2xl|xs] [icon--dir] [icon--thin|bold]" aria-hidden="true" focusable="false">
  <use href="assets/icons/sprite.svg#arrow-right"></use></svg>
```
142 Lucide icons (ids = Lucide names; full list rendered in styleguide §06): arrows/chevrons
(`arrow-right|left|up|down|up-right|down-right|up-left`, `chevron-*`, `chevrons-left|right`, `move-right`,
`corner-down-left`, `arrow-up-down`), UI (`menu x search globe languages plus minus check copy external-link filter
sliders-horizontal layout-grid list map map-pin zoom-in zoom-out maximize minimize maximize-2 download upload play
pause rotate-3d rotate-ccw refresh-cw box boxes layers scan eye eye-off camera image images sun moon sunrise sunset
info circle-help mouse-pointer-click mouse move hand keyboard share-2 send mail phone clock calendar file-text
file-up paperclip sparkles loader-circle triangle-alert circle-check circle-x circle-alert link cookie
grip-vertical ellipsis trash-2 video newspaper printer`), domain (`building building-2 hotel hospital school
graduation-cap landmark store shopping-bag house warehouse factory trees tree-palm waves construction hard-hat ruler
drafting-compass pencil-ruler hammer wrench shovel shield-check award target lightbulb leaf handshake users
user-round briefcase globe-2 earth compass route gauge chart-line chart-bar trending-up badge-check scale network
workflow git-merge puzzle heart-pulse book-open medal blocks clipboard-check cog milestone flag plane`).
Add **`icon--dir`** to any directional icon (arrows/chevrons that mean "forward/back") — it mirrors in RTL.
Do not mirror `arrow-up`, `arrow-down`, `rotate-3d`, `play`. Need another icon → request it.
`.icon-tile` (56px framed icon; `--lg` 72px) — fills teal on `.card--hover:hover`.
In JS: `icon('map-pin', 'icon--sm')` from `core/utils.js` returns the same markup.

### 6.2 Buttons & links
```html
<a class="btn btn--primary" href="contact.html#inquiry" data-magnetic>
  <span data-ar="ابدأ مشروعك">Start a project</span>
  <svg class="icon icon--dir" aria-hidden="true"><use href="assets/icons/sprite.svg#arrow-right"></use></svg></a>
```
- Variants: `.btn--primary` (teal; default CTA), `.btn--dark` (navy; on light), `.btn--light` (white; on dark/photos),
  `.btn--ghost` (outlined; adapts to theme). Sizes: `.btn--sm` (42px), default 52px, `.btn--lg` (62px).
  `.btn--block`, `.btn--icon` (square, needs `aria-label`), `.is-loading` (spinner), `disabled`/`aria-disabled`.
  Hover = fill wipes from the inline-start edge; icon nudges forward.
- `.icon-btn` round 48px icon button (`--sm` 40px, `--square`, `--solid` teal). Always `aria-label`.
- `.link-arrow` — uppercase link + circled arrow: `<a class="link-arrow" href="…"><span data-ar="…">All projects</span><span class="link-arrow__icon"><svg class="icon icon--dir">…arrow-right</svg></span></a>`; `.link-arrow--plain` (no circle).
- `.link-underline` (animated underline), `.text-link` (inline, accent underline), `.cta-circle` (big round CTA, used in footer).
- Text with icon inside a button: **wrap the text in a `<span data-ar>`** (never put `data-ar` on the button itself).

### 6.3 Eyebrow / section header / dividers / badges / breadcrumb
```html
<header class="section-header [section-header--center|section-header--split]">
  <p class="eyebrow" data-ar="من نحن">Who we are</p>
  <h2 class="h2" data-split data-ar="…">Shaping skylines, elevating standards</h2>
  <p class="lead" data-reveal="up" data-ar="…">…</p>          <!-- or, for --split: -->
  <div class="section-header__aside"><p class="lead">…</p><a class="link-arrow">…</a></div>
</header>
```
- `.hairline` (`--strong`, `--accent` 64px teal), `.divider` (label between rules; `--start`), `.vrule`.
- `.badge` + `--accent|--solid|--outline|--gold|--dark|--glass` (glass = on photos); `.badge__dot`.
- `.breadcrumb > ol > li` (`aria-label="Breadcrumb" data-ar-aria-label="مسار التنقل"`; current item `<span aria-current="page">`).

### 6.4 Media
- `.media` frame (relative, overflow hidden, navy fallback) + ratio `.ratio-1x1|4x5|3x4|4x3|3x2|16x9|21x9|panorama`;
  child `<picture>`/`<img>` fills (object-position from `--pos`, e.g. `style="--pos:30% 60%"` on the img).
- Treatments: `.media--zoom` (hover zoom), `.media--overlay` (bottom gradient), `.media--duotone` (navy/teal),
  `.media--blueprint` (grayscale + teal grid). `.media__caption` (overlay caption).
- `figure > figcaption.caption` (accent-rule caption).
- `[data-kenburns]` (slow drift; `="out"` reverses) — on any wrapper that contains an `<img>`.
- Parallax: `<div class="media ratio-16x9 parallax-frame"><div data-parallax="0.12"><picture>…</picture></div></div>`.
  The `<picture>` is stretched to the frame (`display:block; block-size:100%`) so the image covers it.
- The reset gives `img, picture { max-width: 100% }`. An intentionally oversized picture (e.g. a parallax layer
  wider than its card) needs `max-inline-size: none` on the `<picture>`/`<img>`.

### 6.5 Cards
- `.card` (padding, hairline border, surface bg) + `.card--hover` (lift + teal top rule + icon-tile fill),
  `.card--flat` (no box, top hairline only). Parts: `.card__title`, `.card__text`, `.card__footer`, `.card__index`.
  Make the whole card clickable: put `.card-link` on its main link (stretched `::before`); the card needs `position:relative` (built in).
- `.project-card` (photo card, white text over gradient):
  ```html
  <a class="project-card [project-card--wide|--square]" href="projects.html#eastmain" data-cursor="view">
    <div class="project-card__media"><picture>…</picture></div>
    <span class="project-card__arrow"><svg class="icon icon--dir">…arrow-up-right</svg></span>
    <div class="project-card__body">
      <div class="project-card__meta"><span class="badge badge--glass">Mixed-use</span></div>
      <h3 class="project-card__title">Eastmain</h3>
      <p class="project-card__loc"><svg class="icon">…map-pin</svg><span data-ar="…">New Cairo, Egypt</span></p>
    </div></a>
  ```
  Default ratio 4/5; override with `style="--ratio:16/10"`.
- `.feature` (icon + title + text with top hairline): `.feature__title`, `.feature__text`.
- `.logo-tile` (white tile for subsidiary logos, 3:2, `--hover`). Gold MOBCO Real Estate logo must sit on a light tile.

### 6.6 Chips, tabs, accordion
- Chips (filters): `<div class="chip-group" data-chip-group="single|multi" aria-label="…">` with
  `<button class="chip" data-value="residential" aria-pressed="false">…<span class="chip__count">2</span></button>`.
  In `multi`, a chip with `data-value="all"` is exclusive. Event `chipchange` → `e.detail.values` (array).
  Links styled as chips (`<a class="chip">`) are fine for navigation. Chips are 44px tall (touch target);
  `.chip--sm` (32px) only for dense, non-primary UI on fine pointers.
- Tabs:
  ```html
  <div class="tabs [tabs--pills]" data-tabs>
    <div class="tabs__list" aria-label="…">
      <button class="tabs__tab" data-tab="plan" aria-selected="true" data-ar="نخطّط">We plan</button> …
    </div>
    <div class="tabs__panel" data-tab-panel="plan">…</div>
    <div class="tabs__panel" data-tab-panel="build" hidden>…</div>
  </div>
  ```
  JS adds roles/ids/indicator, arrow keys (mirrored in RTL), Home/End. Event `tabchange` → `{id, tab}`.
  Programmatic: `root.__selectTab('build')`. No-JS: all panels are shown.
- Accordion (`data-accordion` or `data-accordion="single"`):
  ```html
  <div class="accordion" data-accordion="single">
    <div class="accordion__item [is-open]">
      <h3 class="accordion__heading"><button class="accordion__trigger" type="button">
        <span class="accordion__num">01</span><span class="accordion__label" data-ar="…">…</span>
        <span class="accordion__icon" aria-hidden="true"></span></button></h3>
      <div class="accordion__panel"><div class="accordion__content"><div class="accordion__content-inner">…</div></div></div>
    </div></div>
  ```
  Event `accordionchange` → `{item, open}`.

### 6.7 Forms
```html
<form class="form" data-validate [data-toast="Thanks!" data-ar-toast="شكرًا!"]>
  <div class="form__row form__row--2">
    <div class="field">
      <input class="field__input" id="f-name" name="name" type="text" placeholder=" " required minlength="2" autocomplete="name">
      <label class="field__label" for="f-name"><span data-ar="الاسم الكامل">Full name</span><span class="req" aria-hidden="true">*</span></label>
      <p class="field__hint" data-ar="…">optional hint</p>
    </div>
    …
  </div>
  <div class="field field--select"><select class="field__input" id="f-s" name="sector" required>
      <option value="" data-ar="اختر…">Choose…</option>…</select><label class="field__label" for="f-s">…</label></div>
  <div class="field field--textarea"><textarea class="field__input" id="f-m" name="message" placeholder=" " required></textarea><label …>…</label></div>
  <label class="check"><input class="check__input" type="checkbox" name="consent" required><span class="check__box" aria-hidden="true"></span><span data-ar="…">I agree…</span></label>
  <label class="check check--radio">…type="radio"…</label>
  <label class="switch"><input class="switch__input" type="checkbox" name="x"><span class="switch__track" aria-hidden="true"></span><span>Label</span></label>
  <div class="form__actions"><button class="btn btn--dark" type="submit"><span data-ar="إرسال">Send</span></button><p class="form__note">…</p></div>
</form>
```
- **Floating labels need `placeholder=" "`** (a single space) and the `<label>` **after** the input.
  `.field--select` / `.field--static` keep the label floated.
- Validation (`form[data-validate]`, JS sets `novalidate`): `required` (text/select/checkbox/radio group/file),
  `type="email"`, `type="tel"` or `data-type="phone"` (7–15 digits, `+ ( ) - .` allowed), `minlength`, `pattern`,
  `data-match="#other"`. Custom message: `data-error="…" data-ar-error="…"` on the control. Errors render in
  `.field__error` (auto-created) with `aria-invalid`/`aria-describedby`; first invalid control gets focus;
  messages re-render on language change. Valid fields get `.is-valid` (check mark).
  A `.check` checkbox/radio gets one message next to its label (tagged `data-for="<name>"`); a radio group
  shares one message and all its radios share one state (no stale `aria-invalid` on siblings).
- **Multi-step forms**: `validateForm(container)` works on any element (e.g. one wizard step) and returns `true`
  when valid. `data-validate="manual"` keeps inline validation (focusout/input/change/langchange) but leaves
  `submit` to the page — drive the steps yourself and dispatch nothing extra.
- Forms are a single `minmax(0, 1fr)` column by default (`.form`, `.form__row`, `.field`, and inputs have
  `min-inline-size: 0`), so long `<select>` options never widen a form beyond its card on mobile.
- On a valid submit the form dispatches **`validsubmit`** (`e.detail = { data, formData, form }`; files are
  serialised as `{name,size,type}`) — the site is static, nothing is sent. If the form has `data-toast`, a
  success toast shows and the form resets unless your listener calls `e.preventDefault()`.
  Typical page code: listen, `e.preventDefault()`, swap the form for a `.form-success` panel.
- Range: `<div class="range"><div class="range__head"><label class="range__label" for="r">…</label><output class="range__value" for="r"></output></div><input class="range__input" id="r" type="range" min="0" max="100" value="50" data-suffix=" m"></div>` (fill + live output; `data-prefix`/`data-suffix`, localised with `data-ar-prefix`/`data-ar-suffix`, re-rendered on
  language change). `data-format="none"` = core updates only the fill; the page writes the `<output>` (and should set
  `aria-valuetext`).
- Dropzone: `<div class="dropzone" data-dropzone data-max-size="10" data-max-files="3"><input class="dropzone__input" id="cv" name="cv" type="file" accept=".pdf,.doc,.docx" [multiple] [required]><label class="dropzone__area" for="cv"><svg class="icon">…file-up</svg><span class="dropzone__title">…<u>browse</u></span><span class="dropzone__hint">…</span></label></div>` — drag-over state, type/size/count checks (toast on rejection), removable file list, keeps `input.files` in sync.
- `.form-success` panel for the post-submit state.

### 6.8 Overlays & feedback
- **Modal**: markup anywhere in `<body>` (outside `<main>` preferred):
  ```html
  <div class="modal [modal--lg|modal--sm|modal--media]" id="video-modal" data-modal hidden>
    <div class="modal__backdrop" data-modal-close></div>
    <div class="modal__dialog" role="dialog" aria-modal="true" aria-labelledby="vm-title">
      <button class="icon-btn icon-btn--sm modal__close" type="button" data-modal-close aria-label="Close" data-ar-aria-label="إغلاق">…x…</button>
      <h2 class="h3 modal__title" id="vm-title">…</h2> …
    </div></div>
  <button data-modal-open="video-modal">Open</button>
  ```
  Focus trap, Esc, scroll lock, focus return. Events `modalopen` / `modalclose` (bubble from the modal).
- **Drawer**: same pattern with `.drawer[data-drawer] > .drawer__backdrop[data-drawer-close] + aside.drawer__panel` (`.drawer__head/__body/__foot`), opens from the inline-end (`.drawer--start` for the other side); `data-drawer-open="id"`. Width via `style="--drawer-w:560px"`.
- **Lightbox**: declarative `<a href="assets/img/x.jpg" data-webp="assets/img/x.webp" data-lightbox="gallery-1" data-caption="…" data-ar-caption="…"><img alt="…"></a>` (links with the same group value form one gallery), or `openLightbox(items, index)` (§8). Zoom (wheel / pinch / double-click or double-tap / +/-/0 keys), pan when zoomed, swipe, arrows, Home/End, counter, captions, RTL-aware.
- **Toast**: `toast(msg, {type})` (§8). **Tooltip**: `data-tooltip="…" data-ar-tooltip="…"` on any focusable element
  (hidden on scroll, Esc and when the trigger is pressed).
- The lightbox re-renders its caption, alt and button labels when the language changes while it is open.
- Re-opening a modal/drawer during its 650ms close transition is safe (the pending hide is cancelled).
- The cookie banner is a small bar at the bottom inline-start corner (one sentence, Accept / Decline; full width on
  phones). It hides while any overlay locks the page (`html.is-locked`: modal, drawer, lightbox, search) and comes
  back when it closes.
- **Copy**: `<button data-copy="info.ksa@mobco-group.com">` or `data-copy-target="#selector"` → clipboard + toast.
- **Consent-gated embed** (contact map):
  ```html
  <div class="consent-gate" data-consent-gate data-src="https://www.google.com/maps?q=…&amp;output=embed" data-title="Map: KSA Office" data-ar-title-text="خريطة: مكتب السعودية">
    <div class="consent-gate__placeholder"><svg class="icon">…map</svg><p data-ar="…">…</p>
      <button class="btn btn--primary btn--sm" type="button" data-consent-accept><span data-ar="تحميل الخريطة">Load map</span></button></div>
  </div>
  ```
  The iframe is injected only after consent. `[data-consent-open]` re-opens the cookie banner.

### 6.9 Marquee, carousel, compare, stats, CTA band, page hero
- Marquee:
  ```html
  <div class="marquee [marquee--sm|marquee--logos|marquee--reverse]" data-marquee data-speed="50">
    <div class="marquee__track"><div class="marquee__group">
      <span class="marquee__item [marquee__item--outline]" data-ar="…">Skyscrapers</span><span class="marquee__sep" aria-hidden="true"></span> …
    </div></div></div>
  ```
  JS clones the group to fill the width (clones are `aria-hidden`), pauses on hover/focus, reverses in RTL.
- Carousel:
  ```html
  <div class="carousel [carousel--bleed|carousel--wide]" data-carousel>
    <div class="carousel__head">…title…<div class="carousel__nav">
      <button class="icon-btn" type="button" data-carousel-prev aria-label="Previous slide" data-ar-aria-label="الشريحة السابقة">…arrow-left icon--dir…</button>
      <button class="icon-btn" type="button" data-carousel-next aria-label="Next slide" data-ar-aria-label="الشريحة التالية">…arrow-right icon--dir…</button></div></div>
    <div class="carousel__viewport" data-cursor="drag" aria-label="…"><div class="carousel__slide">…</div>…</div>
    <div class="carousel__foot"><span class="carousel__count">01 / 05</span><div class="carousel__progress"><span></span></div></div>
  </div>
  ```
  Native scroll + snap (touch), mouse drag with inertia, arrows (disabled at ends), keyboard ←/→, progress,
  counter. Slide width via `--slide-w` on the viewport (default 82% → 46% → one third). `--bleed` runs to the
  viewport edge on the inline-end side. After a mouse drag, snapping stays off until the smooth snap has
  finished (no "snap back" to the previous slide).
- Compare: `<div class="compare" data-compare="50" style="--ratio:16/10"><div class="compare__layer compare__layer--before [media--blueprint]"><picture>…</picture><span class="compare__label">Before</span></div><div class="compare__layer compare__layer--after"><picture>…</picture><span class="compare__label">After</span></div></div>` — handle (role=slider) is created by JS; pointer anywhere + arrows/PageUp/PageDown/Home/End; RTL-aware.
- Stats:
  ```html
  <div class="stats [stats--plain]">
    <div class="stat"><div class="stat__value"><span data-count="10000">10,000</span><span class="stat__suffix">+</span></div>
      <p class="stat__label" data-ar="كفاءة مهنية متميّزة">Talented professionals</p></div> …
  </div>
  ```
  Use `STATS` from site-data (25+, 10,000+, 430+, 600+). Keep the final number as static text (no-JS/SEO).
- CTA band: `<section class="cta-band"><div class="cta-band__bg"><picture>…</picture></div><div class="container cta-band__inner"><div><p class="eyebrow">…</p><h2 class="cta-band__title">…</h2></div><div class="cta-band__actions">…buttons…</div></div></section>`. The footer already opens with a big CTA ("Let's talk about your project"), so don't put a CTA band directly above the footer.
- Page hero (inner pages): see `_template.html`. `.page-hero` (dark, 86vh) / `.page-hero--short` / `.page-hero--light`
  (sand, for `data-hero="light"`). Parts: `.page-hero__bg` (+ `data-kenburns`), `.page-hero__inner`
  (breadcrumb, eyebrow, `.page-hero__title.display`, `.page-hero__lead`, `.page-hero__actions`), `.page-hero__foot`
  (`.scroll-cue` + `dl.page-hero__meta`). Home builds its own art-directed hero (page CSS) but should reuse tokens.
  Below 560px the `.page-hero__actions` buttons stack full-width (same as the home and other art-directed heroes).
- Glass badges (`.badge--glass`) keep their dark backing inside `.section--dark/--deep/.on-dark` (over photos).
- `.contact-line` is styled for dark backgrounds (footer); in page content on light backgrounds use
  `.contact-line.contact-line--light` (dark text, 44px touch target).

### 6.10 Global chrome (automatic — do not re-implement)
**Header (round 2).** The eight tabs are always a horizontal bar, like the client's own site. No burger, no drawer.
- ≥1100px: one row. Logo, the tabs (Home, About, Subsidiaries ▾, Projects ▾, 3D Studio, Media, Careers, Contact),
  then search, EN | ع and "Start a project". 1100 to 1279px is the compact size (smaller logo, tighter type).
- <1100px: two rows. Logo + tools on top; the tabs below in a bar that scrolls sideways (44px touch targets, edge
  fades, the active tab is scrolled into view, RTL aware). On phones the language button shows only the other language.
- Dropdowns (`[data-mega]` items, panel `.nav-menu[data-mega-panel]`): a compact white card under the tab on desktop
  (Subsidiaries: the three company pages + Elite Education + "All subsidiaries"; Projects: five featured projects,
  "View all 33 projects" and "Open 3D Studio"). In the tab bar they open as a sheet attached to the bar (full width on
  phones). Mouse hover opens on desktop; the chevron button toggles; with touch (and any pointer in the tab bar) the
  first tap on "Subsidiaries" / "Projects" opens the menu and a second tap follows the link. Keyboard: Enter/Space
  on the chevron, ArrowDown on the tab or chevron, ArrowUp/ArrowDown/Home/End inside, Escape closes and returns focus,
  Tab out closes. Tap/click outside closes. The "View all 33 projects" count is static HTML and `tools/build.mjs`
  fails if it no longer matches `PROJECTS.length`.
- States on `.site-header`: transparent with white text over dark heroes (`body[data-hero="dark"]`), `.is-solid`
  after 40px of scroll, `.is-hidden` on scroll down (shown again on scroll up), `.mega-open` while a menu is open
  (never hides then), `.is-opaque` while a tab-bar sheet is open. In the tab bar a light-hero page gets a solid header
  from the top.
- Active tab from `body[data-page]`; on the company pages (`body[data-subsidiary]`) "Subsidiaries" gets
  `aria-current="true"` and the matching dropdown link `aria-current="page"`.
- CTA `.site-header__cta` → `contact.html#inquiry`: label + arrow tile. Navy label / teal tile on the white header,
  teal label / white tile over dark heroes.

Other global chrome: footer, scroll-progress bar, back-to-top ring, skip link, first-visit preloader, page-transition
curtain, custom cursor (fine pointers), cookie banner, toasts, search overlay (⌘/Ctrl+K or `/`).

## 7. Data attributes (behaviour reference)

| Attribute | Where | Behaviour |
|---|---|---|
| `data-reveal="up\|fade\|left\|right\|scale\|clip\|mask\|mask-up"` | any element | Hidden (only under `html.js`) then revealed once when it enters the viewport. `left`/`right` = from inline-start/end (mirrored in RTL). `clip` = inset clip + inner image zoom; `mask` = wipe from inline-start; `mask-up` = wipe upward. |
| `data-reveal-delay="200"` | with data-reveal | extra delay (ms) |
| `data-reveal-stagger[="90"]` | parent | children get incremental delays (step ms); children without `data-reveal` get `up` (or `data-reveal-variant` on the parent) |
| `data-split[="words\|lines"]` | headline | words wrapped in masks and revealed word-by-word (or line-by-line); re-splits on language change; adds `aria-label` with the full text |
| `data-count="430"` + `data-suffix` `data-prefix` `data-decimals` `data-duration` `data-native` | number element | counts up from 0 when visible (thousands separators; `data-native` = Arabic-Indic digits in AR) |
| `data-parallax="0.15"` | element (usually inside `.parallax-frame`) | translateY proportional to its distance from the viewport centre (negative = opposite direction) |
| `data-kenburns[="out"]` | wrapper of an `<img>` | slow zoom drift, paused off-screen |
| `data-marquee` + `data-speed="60"` (px/s) | `.marquee` | infinite marquee |
| `data-magnetic[="0.35"]` | button/link | follows the pointer (fine pointers only) |
| `data-draw` | SVG `path` | stroke draw-in on reveal (`--len` set automatically) |
| `data-cursor="view\|drag\|open\|play\|zoom\|explore"` (+ `data-cursor-label`, `data-ar-cursor-label`) | any | custom-cursor label bubble |
| `data-tabs`, `data-tab`, `data-tab-panel` | tabs | §6.6 |
| `data-accordion[="single"]` | accordion | §6.6 |
| `data-chip-group="single\|multi"`, `data-value` | chips | §6.6 → `chipchange` |
| `data-modal`, `data-modal-open="id"`, `data-modal-close` | modal | §6.8 |
| `data-drawer`, `data-drawer-open="id"`, `data-drawer-close` | drawer | §6.8 |
| `data-lightbox="group"`, `data-webp`, `data-caption`, `data-ar-caption` | `<a href=jpg>` | §6.8 |
| `data-copy="text"` / `data-copy-target="#sel"` | button | copy + toast |
| `data-tooltip`, `data-ar-tooltip` | focusable | tooltip |
| `data-compare="50"` | `.compare` | §6.9 |
| `data-carousel`, `data-carousel-track` (or `.carousel__viewport`), `data-carousel-prev/next` | carousel | §6.9 |
| `data-validate`, `data-toast`, `data-ar-toast`, `data-error`, `data-ar-error`, `data-match`, `data-type="phone"` | form | §6.7 |
| `data-dropzone`, `data-max-size` (MB), `data-max-files` | dropzone | §6.7 |
| `data-search-open[="prefill"]` | any button | opens search |
| `data-lang-toggle[="en\|ar"]` | button | toggles (or sets) language |
| `data-consent-gate`, `data-consent-accept`, `data-consent-open` | consent | §6.8 |
| `data-no-transition` | link | skip the page-transition curtain |
| `data-to-top` | link | smooth scroll to top (footer ring) |
| `data-ar`, `data-ar-html`, `data-ar-placeholder`, `data-ar-aria-label`, `data-ar-title`, `data-ar-alt`, `data-ar-content`, `data-ar-value` | any | §9 |
| `data-placeholder` | any | marks placeholder content (dashed outline); pair with `<!-- TODO(content): … -->` |

## 8. JavaScript API

Core modules are ES-module singletons. `core/main.js` (loaded first) initialises everything; page modules just
import what they need — imports resolve to the same instances. All `init*` functions are idempotent.
```js
import { t, getLang, onLang, setLang, localize } from '../core/i18n.js';
import { scan, refresh, scrollTo, onScroll, gsapReady, getLenis } from '../core/motion.js';
import { scanUI, toast, openLightbox, openModal, closeModal, openDrawer, validateForm, copyText } from '../core/ui.js';
import { $, $$, picture, icon, esc, debounce, prefersReducedMotion, isRTL } from '../core/utils.js';
import { PROJECTS, SECTORS, STATS, getProject, projectsBy } from '../data/site-data.js';
import { hasConsent, onConsent } from '../core/consent.js';
import { whenLoaded } from '../core/preloader.js';
import { LOGO } from '../data/logo-data.js';
import { WORLD } from '../data/world-map.js';
```

### core/i18n.js
- `getLang(): 'en'|'ar'` · `isRTL(): boolean` · `getDir(): 'ltr'|'rtl'`
- `t(value, lang?)` → string. `value` may be `{en, ar}`, a string or a number. `t({en:'Hi', ar:'مرحبا'})`.
- `setLang(lang, {persist=true, silent=false})` — swaps every `data-ar*` string, sets `<html lang dir>`, title,
  meta, persists `localStorage['mobco-lang']`, keeps a `?lang=` URL param in sync, dispatches `langchange`.
- `toggleLang()` · `onLang(cb: (lang, dir) => void) → unsubscribe` · `localize(root, lang?)` (apply current
  language to newly inserted markup that carries `data-ar*` attributes; `scanUI(root)` calls it for you).
- Event: `document.addEventListener('langchange', e => e.detail.lang /* , e.detail.dir */)`.
- Initial language: `?lang=ar|en` → `localStorage` → `<html lang>`.

### core/motion.js
- `scan(root = document)` — wire every motion attribute inside `root` (idempotent). **Call after inserting DOM.**
- `refresh()` — recompute (ScrollTrigger refresh, Lenis resize, parallax). Call after layout changes.
- `scrollTo(target, {gap, offset, immediate})` — element | selector | y. Element targets land `--header-h + 16px`
  below the top (`{gap: 24}` for a different gap), with or without Lenis — the header offset is applied exactly
  once (element positions are measured from `window.scrollY`, so a stale Lenis position doesn't skew them).
  Numbers are absolute y. `offset` is the legacy raw offset (with Lenis it is passed to `lenis.scrollTo()` as-is,
  which also subtracts the html scroll-padding) — prefer `gap` in new code.
- Same-page `<a href="#id">` links scroll smoothly below the header and move focus; add `data-no-scroll` to a link
  to opt out (the browser then updates the hash natively and fires `hashchange`, e.g. for hash-driven overlays).
  A hash on load is aligned after init and re-aligned after `document.fonts.ready` and `load` (until the user
  scrolls; skipped while an overlay locks the page). There is no `:target` scroll-margin — the html
  `scroll-padding-block-start` already clears the header for native fragment jumps.
- `onScroll(cb({y, progress, max})) → unsubscribe` · `getLenis()` (instance or `null` on touch/reduced motion)
- `gsapReady() → {gsap, ScrollTrigger} | null` — GSAP and ScrollTrigger are UMD globals; ScrollTrigger is
  registered and synced with Lenis. Guard with `const g = gsapReady(); if (g) { … }`.
- `stopScroll()` / `startScroll()` (Lenis) · `reveal(el)` (force-reveal one element).
- `?qa=1` or reduced motion: reveals/counters resolve immediately, no Lenis.

### core/ui.js
- `scanUI(root)` — wire components inside `root` + `localize(root)`. Call after inserting DOM.
- `openModal(idOrEl, trigger?)`, `closeModal(el?)`, `openDrawer(idOrEl, trigger?)`, `closeDrawer(el?)`
- `openLightbox(items, index = 0)`; `items: [{ src, srcWebp?, alt?: string|{en,ar}, caption?: string|{en,ar} }]`; `closeLightbox()`
  ```js
  openLightbox(getProject('eastmain').gallery.map(g => ({ src:`assets/img/${g.base}.jpg`, srcWebp:`assets/img/${g.base}.webp`, caption:g.caption })), 0);
  ```
- `toast(msg: string|{en,ar}, { type:'success'|'info'|'warning'|'error' = 'success', duration = 4200 }) → { close, el }`
- `copyText(text) → Promise<boolean>` · `validateForm(formOrAnyContainer) → boolean` (validates the named controls
  inside, shows inline errors, focuses the first invalid one — use it per step in multi-step forms)

### core/search.js — `openSearch(prefill?)`, `closeSearch()` (index = `PAGES` + `SUBSIDIARIES` (→ their `page`) + `PROJECTS` (incl. category names) + `PROJECT_CATEGORIES` (→ `projects.html?category=<id>`) + `SECTORS`; results de-duplicated by URL).
### core/consent.js — `hasConsent()`, `getConsent()` (`'accepted'|'declined'|null`), `setConsent(v)`, `onConsent(cb) → unsubscribe` (fires immediately if already accepted), `openConsent()`; event `consentchange`.
### core/preloader.js — `whenLoaded() → Promise` (resolves when the first-visit preloader has lifted; immediately otherwise). Start hero timelines after it: `whenLoaded().then(playHero)`.
### core/header.js: `openMega(item)`, `closeMega(item?)`, `isTabBar()` (rarely needed). `openMobileNav()` / `closeMobileNav()` still exist as no-op shims (there is no drawer); drop them from page code.
### core/cursor.js, core/transitions.js — automatic.

### core/utils.js
`$(sel, root)`, `$$(sel, root) → Array`, `clamp`, `lerp`, `mapRange`, `debounce(fn, ms)`, `throttle`, `rafThrottle`,
`isQA()`, `prefersReducedMotion()`, `isTouch()`, `hasFinePointer()`, `isRTL()`, `getParam(name)`,
`escapeHTML(str)` / `esc`, `formatNumber(n, {lang, native, decimals})`, `formatBytes`, `uid(prefix)`,
`h(htmlString) → Element`, `icon(name, cls) → svg markup`, `IMAGES` (intrinsic sizes),
`picture(base, { alt, altAr, loading='lazy', className, imgClass, position, sizes, fetchpriority, width, height, thumb })` →
`<picture>` markup (webp + jpg, width/height; `thumb:true` = 480px version from `assets/img/thumbs/`),
`wait(ms)`, `nextFrame()`, `focusables(root)`, `trapFocus(root) → release`, `store.get/set/remove(key, 'local'|'session')`,
`onReady(fn)`, `normalize(str)` (search normalisation incl. Arabic).

### data/site-data.js (bilingual `{en, ar}` everywhere)
- `COMPANY` — `name`, `nameFirstMention`, `founded` (2001), `foundedIn`, `tagline`, `headline`, `motto`, `valuesIntro`,
  `whoWeAre {eyebrow,title,body}`, `global {title,body}`, `footprint {title,subtitle}`, `story {title, paragraphs[3]}`,
  `vision {eyebrow,title,paragraphs[2]}`, `mission {eyebrow,title,body}`, `turnover`, `continents`, `copyright`. All verbatim from the brief.
- `STATS[]` `{id, value, suffix, label}` · `VALUES[]` `{id, icon, title, text}` (Safety, Integrity, Excellence)
- `SECTORS[]` `{id, icon, name, text}` — ids `skyscrapers malls residential government education hotels medical business`
- `CAPABILITIES[]` `{id:'plan'|'build'|'manage', icon, index, title, subtitle, items[]}`
- `SUBSIDIARIES[]` `{id, name, logo:{color, white, navy, w, h, needsLightTile?}, accent, icon, short, long, focus[], todo}` —
  ids `mobco-construction mobco-developments mobco-real-estate elite-education`. Descriptions are generic → keep the `todo` in content notes.
- `REGIONS[]` `{id:'ksa'|'egypt'|'canada', mapKey, image, name, short, blurb}` (blurbs verbatim)
- `OFFICES[]` `{id, region, hq, name, label, city, addresses:[{en:[lines], ar:[lines]}], phones:[{display, href}], email, geo:{lat, lon, approx:true}, mapsQuery}` · `CAREERS[]` `{id, email, label}`
- `PROJECTS[]` (33: the five originals + 28 portfolio projects with photos) `{id, slug, name, nameIsDescriptive, region|null,
  location|null, category, featured, sectors[], typology, status:null, image, pos, gallery:[{base, pos, caption}], summary,
  imageNote, highlights[], studioModel, todo[]}` — originals: `eastmain` (mixed-use), `victoria-101` (residential-tower),
  `lagoon-villa-community` (descriptive), `innovation-campus` (descriptive), `classical-landmark` (descriptive, region ksa).
- `PROJECT_CATEGORIES[]` `{id, icon, name, sectors[]}` (the client's own tabs) · `getCategory(id)`
- `NAV[]` `{id, href, label, mega?}` · `CTA` · `PAGES[]` (search index: `{id, url, icon, title, description, keywords:{en[],ar[]}}`) · `QUICK_LINKS[]`
- Helpers: `getProject(idOrSlug)`, `getSubsidiary(id)`, `getSector(id)`, `getRegion(id)`, `getOffice(id)`, `getPage(id)`,
  `projectsBy({region, sector})`, `projectUrl(p) → 'projects.html#<slug>'`, `studioUrl(p) → 'studio.html?model=<studioModel>'`.

### data/logo-data.js — `LOGO = { full, mark, group, fullViewBox:'8 6 226 166', markViewBox:'7.4 6.2 98.7 144.2' }`
`group` is "GROUP" outlined from Manrope 700 (same position as the `<text>` below) for contexts without the web font.
Downloadable files: `assets/img/logo-mobco-group.svg` (navy) / `-white.svg` (text outlined — no font needed),
`logo-mark.svg` (navy) / `logo-mark-white.svg`.
Inline: `<svg viewBox="${LOGO.fullViewBox}" fill="currentColor" class="logo"><path d="${LOGO.full}"/><text x="233" y="168" text-anchor="end" font-family="Manrope" font-weight="700" font-size="14.5" letter-spacing="10.5">GROUP</text></svg>` (class `.logo` forces LTR so "GROUP" stays aligned in RTL).
### data/world-map.js — `WORLD` (viewBox `0 0 1000 520`; crop to `0 0 1000 440`): `land`, `borders`, `highlight.{ksa,egypt,canada}`, `dots[[x,y,key?]]`, `offices.{ksa,egypt,canada}.{label, lonlat, xy}`, `markers.uk.{lonlat, xy, dots}` (London marker + the four GB dots).

### Rendering data-driven content (pattern)
```js
const mount = $('[data-projects-grid]');
function render() {
  mount.innerHTML = PROJECTS.map((p) => `
    <a class="project-card" href="${projectUrl(p)}" data-cursor="view">
      <div class="project-card__media">${picture(p.image, { alt: t(p.name), position: p.pos, thumb: false })}</div>
      <div class="project-card__body"><h3 class="project-card__title">${esc(t(p.name))}</h3></div>
    </a>`).join('');
  scanUI(mount);  // components + localize
  scan(mount);    // reveals, counters, parallax…
}
render();
onLang(render);   // re-render with the new language
```
Rules: escape data with `esc()`; build strings with `t()` (no `data-ar` needed in JS-rendered markup); call
`scan()`/`scanUI()` after every insert; re-render (or patch text) in `onLang`. Don't put `data-reveal` on
items that you re-render on every filter change (they would re-animate) — animate the container instead, or
use GSAP via `gsapReady()`.

## 9. i18n authoring rules (EN/AR)

- Markup is English; Arabic goes in attributes. **`data-ar` replaces `textContent`** — put it only on
  elements that contain text only. With an icon + text, wrap the text: `<a …><span data-ar="…">About</span><svg…></a>`.
  (`tools/check.mjs` reports `data-ar` on elements with children as an error.)
- `data-ar-html` replaces `innerHTML` (trusted authored markup only, e.g. `<em>` accents, `<br>`); escape
  `<`/`>` as `&lt;`/`&gt;` inside the attribute.
- Attributes: `data-ar-placeholder`, `data-ar-aria-label`, `data-ar-title` (title attribute; on `<title>` = page title),
  `data-ar-alt`, `data-ar-content` (meta), `data-ar-value` (input buttons), `data-ar-tooltip`, `data-ar-caption`,
  `data-ar-toast`, `data-ar-error`, `data-ar-cursor-label`.
- Write fluent Modern Standard Arabic. First mention: «مجموعة موبكو (MOBCO)»; afterwards «موبكو» or «المجموعة».
  Project names: «إيست مين», «فيكتوريا 101» (see `PROJECTS`). Keep digits Western (2001, 430+) unless a design
  calls for `data-native`. Emails, phone numbers, URLs stay Latin — wrap phone numbers in `<span dir="ltr">`.
- Don't translate with CSS `content:`; don't hard-code English in JS — use `t({en, ar})`.
- Test every page with `?lang=ar` (check.mjs does both languages).

## 10. RTL rules

- Use logical properties only: `margin-inline-start`, `padding-inline`, `inset-inline-start`, `border-inline-end`,
  `text-align: start|end`, `inline-size/block-size`. Never `left/right` margins or `float: left`.
- Flex/grid follow direction automatically. For physical transforms (`translateX`), flip with `[dir='rtl'] …`
  (see `.btn::before`, `.drawer__panel`). Gradients that encode direction need an RTL variant (`.page-hero::before`).
- Mirror directional icons with `.icon--dir`. Keep logos, maps, charts, media and the 3D canvas un-mirrored.
- Number sequences like "01 / 05" need `direction:ltr; unicode-bidi:isolate` (`.num-ltr`).
- Keyboard: horizontal arrows are already mirrored in tabs/lightbox/compare/carousel.
- Logical insets resolve against the element's **own** `direction`/`writing-mode`: an element with both
  `direction: ltr` and `inset-inline-end` is pinned to the physical right in RTL, and an element with
  `writing-mode: vertical-rl` maps `inset-inline-*` to the vertical axis. Position an outer wrapper (normal
  direction, horizontal) and put the `direction`/`writing-mode` on an inner element.
- Chevrons drawn with logical borders flip in RTL — counter-rotate them (see `.field--select::after`).

## 11. Motion rules

- Everything animates `transform`/`opacity`/`clip-path` only. Respect `prefersReducedMotion()` in page JS
  (CSS already collapses durations; `data-*` motion resolves instantly).
- Reveal-hidden states exist only under `html.js` and have a 2.5s CSS failsafe — content is never lost without JS.
- Hero timelines: start after `whenLoaded()`; keep total hero intro ≤ 1.6s.
- Use `--ease-out` for entrances, `--ease-in-out` for full-screen transitions, `--dur-slow` for hovers on large
  surfaces, `--dur` for small ones. Don't add a second smooth-scroll library; use `scrollTo()` from motion.js.
- GSAP/ScrollTrigger available via `gsapReady()`; kill your ScrollTriggers if you re-render, then `refresh()`.
- `?qa=1` disables preloader, transitions, animations and the cookie banner (`&consent=1` to show it) for screenshots.

## 12. Images

Photos (only these exist): `aerial-compound` (1560×849), `aerial-compound-portrait` (996×912), `aerial-panorama`
(2000×233), `campus` (999×863), `ksa-landmark`, `eastmain`, `victoria-101` (790×710) — each `.webp` + `.jpg`;
480px thumbnails in `assets/img/thumbs/` (not the panorama). Share image `assets/img/og-default.jpg` (1200×630).
Always `<picture>` with webp + jpg, `width`/`height`, `alt` (or `alt=""` + `aria-hidden` for decoration),
`loading="lazy"` below the fold, `fetchpriority="high"` + preload for the hero. Re-use photos creatively:
crops via `--pos`, Ken Burns, duotone/blueprint, masks, parallax. Logos: `assets/img/logos/*` (see SUBSIDIARIES.logo).

## 13. Accessibility checklist
Landmarks (`<main id="main">` already wired to the skip link), one `<h1>`, ordered headings, visible focus
(never remove outlines), 44px targets, `aria-label` (+ `data-ar-aria-label`) on icon-only buttons, `alt` on
images, buttons for actions / links for navigation, forms with real `<label>`s, colour contrast (small accent text
uses `--accent-text`), no information conveyed by motion only.

## 14. QA commands
```bash
node tools/build.mjs <page>.html [more.html]           # inline partials (only those files)
node tools/build.mjs --check <page>.html               # verify includes are current (no writes)
node tools/check.mjs --pages <page>.html --port <unique n> --shots /tmp/qa/<page>
#   flags: --no-mobile --no-desktop --no-ar --qa (load with ?qa=1) --concurrency n
node tools/build-icons.mjs                             # (foundation only) rebuild the icon sprite
```
`check.mjs` serves the site itself (never run `playwright install`), loads desktop 1440×900 + mobile 390×844 ×
EN/AR, scrolls through, and reports: console/page errors, failed or 4xx requests, horizontal overflow (with the
offending elements, incl. mobile layout-viewport widening), broken images, missing `alt`, duplicate ids, links to
missing files / anchors to missing ids (an id missing from the target's static HTML is looked up again after
that page's scripts ran, so JS-rendered ids pass), reveal elements still hidden, `data-ar` on non-leaf elements.
Viewport section shots scroll instantly (no smooth-scroll mid-frames). Element screenshots under mobile emulation
drop touch emulation (hover/fine-pointer styles apply) — judge mobile from the viewport shots. Screenshots: `<page>-<desktop|mobile>-<en|ar>.png` plus viewport
section shots `…-s01.png` for tall pages — **Read them** and iterate until the page is clean and beautiful.

## 15. Cross-page contracts & content honesty
- Header/footer/search link to: `projects.html#<slug>` for any project slug (mega menu: `eastmain`, `victoria-101`,
  `neom-bay-airport`, `raffles-hotel-residence`, `sulaiman-fakeeh-hospital`), `projects.html?sector=<sector id>`,
  `projects.html?category=<category id>`, the company pages `mobco-construction.html`, `mobco-developments.html`,
  `mobco-real-estate.html`, `subsidiaries.html#education`, `contact.html#inquiry`, `studio.html` (and `studioUrl()` →
  `studio.html?model=<studioModel>`). Owners of those pages must provide those ids / honour those params.
- Honesty (BRIEF §2): state only brief facts. Placeholders → `data-placeholder` + `<!-- TODO(content): … -->` and a
  line in `docs/content-notes/<page>.md`. Descriptive project names keep their "descriptive name" flag in notes.
  3D Studio models are illustrative — say so in the UI. Stats use 430+; the About narrative keeps "more than 150 projects".
- The footer newsletter and all forms are client-side only (toast/success state; nothing is sent).

## 16. Shared-file integration pass — page workarounds that can now go

The requests in `docs/requests/*.md` were applied centrally (see the sections above). Every local workaround still
works (none was relied on being broken), so removing them is optional clean-up for the page owners:

| Page | Local workaround | Now covered by |
|---|---|---|
| about | `initAnchors()` in about.js; `body[data-page='about'] .x` list-margin selectors; `.about-story__frame … picture` height | motion.js anchors (single header offset); `:where()` list reset; `.parallax-frame > [data-parallax] > picture` |
| careers | `label.careers-check`, RTL select chevron, `.careers-form` minmax tracks | ui.js `errorEl` (one message per check / radio group); main.css RTL chevron + `minmax(0,1fr)` forms |
| careers | `scrollTo('#apply', { offset: -(header + 24) })` (still lands one header too low with Lenis — legacy `offset`) | `scrollTo('#apply', { gap: 24 })` |
| careers, studio | output formatting that races the core range listener | `data-format="none"` (or `data-suffix` + `data-ar-suffix`) |
| contact | `goTo()` offset maths, capture-phase anchor handler, hash re-align, `main [id]:target` margin, radio sibling clean-up, capture-phase submit, h2 `<em>` colour | `scrollTo(el, { gap })`, core anchors + hash re-align after fonts/load, no `:target` margin, radio group state, `data-validate="manual"`, `--teal-650` accents |
| home / home-b | `.site-footer__cta { display:none }`, `.hb-region__badge`, carousel `scroll-snap-type: none`, parallax picture height | `<body data-footer-cta="off">`, `.badge--glass` in dark sections, carousel snap fix, parallax picture rule |
| media | chip 44px override, CSS-inverted mark on navy | chips are 44px; `assets/img/logo-mark-white.svg` (+ outlined "GROUP" in the logo downloads) |
| projects | consent banner hidden under the viewer, `icon-btn--sm` 44px, modal reopen race | `html.is-locked .consent`, 44px `icon-btn--sm` on coarse pointers, `openPanel` cancels the pending hide; `data-ar-aria-roledescription`; `data-no-scroll` links |
| subsidiaries | `scrollToEl()`, `COS[].focus` override for Real Estate | `scrollTo(el)`; `SUBSIDIARIES['mobco-real-estate'].focus` updated from the verbatim copy |
| subsidiary pages | London marker maths, `.sd-lease` contact lines, `handshake`/inline quote icons | `WORLD.markers.uk`, `.contact-line--light`, sprite icons `key`, `key-round`, `door-open`, `quote` |

## 17. Round 2 shared changes (header, cookie bar, copy)

What changed in the shared files, and what page owners may need to adjust:

| Change | What to do in page files |
|---|---|
| Burger and full-screen mobile drawer removed (`.burger`, `.mobile-nav`, `html.nav-open`, `[data-nav-toggle]` no longer exist) | Delete any page CSS/JS that targets them (e.g. `contact.js` and `studio.js` still check `html.nav-open`; harmless, never true now). |
| `openMobileNav()` / `closeMobileNav()` are no-op shims (the latter closes any open dropdown) | `projects.js` imports `closeMobileNav`: it keeps working; replace with `closeMega()` when convenient. |
| Mega menus replaced by compact dropdowns: `.mega`, `.mega__card`, `.mega__inner` are gone; panels are `.nav-menu[data-mega-panel]` with `.nav-menu__link` | Only matters if a page styled the old classes (none found). `.site-header.mega-open` still exists. |
| Header height: `--header-h` is now 100px (<768), 112px (768 to 1099), 76px (1100 to 1279), 88px (≥1280). New `--header-row`, `--header-tabs` | Use `var(--header-h)` for hero padding and sticky `top`; never hard-code 72/88px. Re-check heroes and sticky bars on phones and tablets (the header is taller there now). |
| Header CTA always visible (was hidden below 1360px), class `.site-header__cta` (no longer a `.btn`) | Nothing, unless a page styled `.site-header__cta`. |
| Cookie banner is a small bar (`.consent__text`, `.consent__btn`; `.consent__title` is gone) | Nothing. The map gate (`data-consent-gate`) works as before. |
| Copy in `site-data.js` rewritten without dashes (keys and structure unchanged). Four project names now use parentheses instead of a dash: NEOM Bay Airport (International Flight Reconfiguration), Bank AlBilad Head Office (Fit-Out Works), Raffles Hotel & Branded Residence (Main Works Package), TBC Schools (Group 12) | Regenerate any static HTML generated from `PROJECTS` (e.g. `tools/gen-projects-static.mjs` for `projects.html`) so it matches. |
| Arabic nav label for Media is now «الإعلام» (header and `NAV`) | Nothing. |

