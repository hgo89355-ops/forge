# MOBCO Group — Website Rebuild Brief (shared by every builder)

A premium, agency-grade (~$10k tier) multi-page marketing site for **MOBCO Group**, a privately owned,
vertically integrated construction, real-estate development and education group founded in 2001 in
Saudi Arabia, with offices in Riyadh (KSA) and Cairo (Egypt) and a project in Canada.

The site is a **static, build-step-free site** (plain HTML + CSS + ES modules) that runs from any static
host. Every library and font is vendored locally — **no CDN, no runtime network calls** (the only
exception is the consent-gated Google Maps iframe on the contact page).

Root: `mobco-site/`. Serve locally with `python3 -m http.server 8080 -d mobco-site` (ES modules do not
run from `file://`).

---

## 1. Brand

### Palette (taken from the live site)
| Token | Hex | Use |
|---|---|---|
| `--navy-950` | `#0b1620` | deepest background, overlays |
| `--navy-900` | `#122230` | primary brand navy (logo, footer, text on light) |
| `--navy-800` | `#1a2e3e` | panels |
| `--navy-700` | `#263a4a` | the hero info panel on the old site |
| `--slate-500` | `#5b6e7d` | muted text on light |
| `--teal-400` | `#6fd1c5` | **signature accent** ("INTEGRITY & EXCELLENCE", the big "01") |
| `--teal-300` | `#9be3da` | accent hover / on-dark highlights |
| `--teal-600` | `#3fa89c` | accent on light backgrounds (AA contrast for text ≥ 18px bold or use navy) |
| `--sand-50` | `#f5f7f8` | light section background |
| `--white` | `#ffffff` | |
| `--gold-500` | `#b8975a` | ONLY for MOBCO Real Estate Development (its logo is gold) |

Feel: architectural, calm, confident, lots of whitespace, thin hairlines, large uppercase tracked
headings (like the original "A LEGACY OF TRUST"), big numerals, deep navy sections alternating with
white / sand sections, teal used sparingly as the accent. Think premium global contractor
(e.g. Foster+Partners × Bechtel × a luxury developer), not a template.

### Typography (vendored in `assets/fonts/`)
- Display / headings: **Manrope** variable (`manrope-latin-wght-normal.woff2` + latin-ext), weights 500–800.
  Headings uppercase with `letter-spacing: .04em–.08em`; eyebrows uppercase `letter-spacing: .3em`, teal.
- Body: **Inter** variable (`inter-latin-wght-normal.woff2` + latin-ext), 400–600.
- Arabic (when `html[lang=ar]`): **IBM Plex Sans Arabic** 400/500/600/700 (`ibm-plex-sans-arabic-arabic-*.woff2`).
  In Arabic, never letter-space or uppercase-transform text.

### Logos (`assets/img/`)
- `logo-mobco-group.svg` (navy) / `logo-mobco-group-white.svg` — vector traced from the brand mark.
- `assets/js/data/logo-data.js` exports `LOGO = { full, mark, fullViewBox, markViewBox }` path data, for
  inline `<svg fill="currentColor">` use (preferred in header/footer/preloader: allows color animation and
  stroke-draw effects). The full logo's "GROUP" line is a `<text>` element: render it with Manrope 700,
  font-size 14.5, letter-spacing 10.5, `x=233 y=168 text-anchor=end` in the full viewBox.
- `logo-mark.svg`, `favicon.svg` — mark only.
- Subsidiary logos (transparent PNG, traced from the site): `assets/img/logos/`
  `mobco-construction.png` (+ `-white`, `-navy`), `mobco-developments.png` (+ `-white`, `-navy`),
  `mobco-real-estate.png` (gold + navy, keep as-is; on dark backgrounds put it on a white tile),
  `elite-education.png` (+ `-white`, `-navy`).

### Photography (`assets/img/`, each as `.webp` + `.jpg` — use `<picture>`)
These are the ONLY photos available (taken from the client's current site). Reuse them creatively
(crops via `object-position`, Ken Burns, duotone/blueprint treatments, masks, parallax).
| File | Size | Depicts | Known facts |
|---|---|---|---|
| `aerial-compound` | 1560×849 | Aerial render: villa community with lagoon pools, tree-lined boulevard, commercial strip | used as the old home hero. Project name unknown |
| `aerial-compound-portrait` | 996×912 | Portrait crop of the same (roads + park) | |
| `aerial-panorama` | 2000×233 | Thin panoramic strip of the same aerial | good for banners / footer strip |
| `campus` | 999×863 | Aerial render: futuristic white campus, ring buildings, central tower ("SIC" sign), bridges | used in "Who we are". Project name unknown |
| `ksa-landmark` | 790×710 | Classical red/cream building with curved balconies & porte-cochère | the old "KSA" card image |
| `eastmain` | 790×710 | Night render: glass office/retail building, plaza, pool | **Eastmain**, Egypt |
| `victoria-101` | 790×710 | Dusk aerial: 12-storey residential tower + mid-rise wing, rooftop pool | **Victoria 101**, Canada |

Icons: Lucide (ISC) SVGs are available at
`/tmp/claude-0/-home-user-forge/7545d543-999d-5fb6-b514-71e2c86cd347/scratchpad/npmw/node_modules/lucide-static/icons/*.svg`.
The foundation build copies the needed ones into a sprite `assets/icons/sprite.svg` (use `<svg class="icon"><use href="assets/icons/sprite.svg#name"/></svg>`).

World map: `assets/js/data/world-map.js` exports `WORLD` (Natural-Earth projection, viewBox 0 0 1000 520;
`land` path, `borders` path, `highlight.{ksa,egypt,canada}` country paths, `dots` [[x,y,focusKey?]…]
for a dot-matrix map, `offices.{ksa,egypt,canada}.xy` marker positions). Crop the viewBox to
`0 0 1000 440` to hide Antarctica.

---

## 2. Facts — the ONLY company facts you may state

Verbatim from the client (reuse exact wording where it fits):

- Tagline / hero: "INTEGRITY & EXCELLENCE" · "A LEGACY OF TRUST"
- "Our core values of safety, integrity and excellence define our work ethic and guide our workforce in today's rapidly changing and challenging world."
- "WHO WE ARE — SHAPING SKYLINES, ELEVATING STANDARDS. MOBCO Group is a leading name in real estate construction, development, and project management, serving clients across three continents for over two decades. Renowned for its innovative approach and commitment to quality, MOBCO Group has successfully delivered iconic projects ranging from skyscrapers and commercial malls to residential compounds, governmental and educational institutions, and luxury hotels. Explore how MOBCO Group sets the standard for excellence in the industry."
- "WE PLAN. WE BUILD. WE MANAGE."
- Stats: **25+** years of experience · **10,000+** talented professionals · **430+** projects delivered · **600+** engineers & technicians
- "GLOBAL LEADERS IN INNOVATION — MOBCO Group demonstrates its global prowess with groundbreaking projects and exceptional service across three continents, setting new standards in the construction and real estate industries."
- KSA: "More than 25 years of premium projects across various sectors, including construction, development, education, hospitality, and facility management."
- Egypt: "Eastmain – a mixed-use development featuring retail, office, and clinic spaces in a thriving metropolitan center located at the heart of the Golden Square, New Cairo."
- Canada: "Victoria 101 – a vibrant residential project located at the heart of Port Whitby. A popular yet laid-back neighborhood by the shore of Lake Ontario & local parks."
- "OUR GLOBAL FOOTPRINT — Innovating across borders, building excellence across continents"
- MASTERING THE ART OF MODERN CONSTRUCTION: "Founded in 2001 in Saudi Arabia, MOBCO Group has become a key player in the contracting and construction sector, recognized for its excellence. With a turnover exceeding SAR 6 billion over the past five years and the completion of more than 150 projects, MOBCO is a leading force in the region's construction landscape." / "As a privately owned, vertically integrated company, MOBCO Group specializes in construction, real estate development, and education, focusing on acquiring, developing, and managing exceptional communities, along with commercial, medical, business, and educational facilities for diverse clients worldwide." / "For over two decades, we have delivered projects on time, within budget, and to the highest quality standards, earning the trust of industry leaders. At MOBCO, we don't just build structures—we build lasting relationships and groundbreaking achievements that redefine the limits of possibility."
- VISION — "ENVISIONING A SUSTAINABLE FUTURE": "We aim to achieve future growth and become the world's leading engineering, construction, and project management company by delivering exceptional results for our clients, offering fulfilling careers for our team, strengthening relationships with current clients, architects, developers, and government and private organizations, and actively pursuing new global opportunities." / "MOBCO Group is a creative, innovative, and people-oriented organization providing individual opportunity, personal satisfaction, and rewarding challenges to all members of the firm."
- MISSION — "OUR COMMITMENT TO EXCELLENCE": "To provide world-class service and market-leading expertise to our clients. Integrity and consistency are the signatures of our service. We incorporate proven professional state-of-the-art techniques to surpass our current achievements and prosper by embracing innovative thoughts and working hard to achieve new business goals."
- Subdivisions (from logos): **MOBCO Construction**, **MOBCO Developments**, **MOBCO Real Estate Development**, **Elite Education Group**.
- Contact
  - KSA Office (HQ): 16th floor – Al Ebdaa Tower, King Fahd Road, Olaya District, P.O. Box 19481-11435, Riyadh, Saudi Arabia. Tel +966 11 293 5966 (`tel:+966112935966`). info.ksa@mobco-group.com
  - Egypt Office: B1 Building, Mivida Compound, New Cairo, Egypt — and 2 Block C Ahmed Hassan St., Ninth District, Nasr City, Cairo, Egypt. Tel 02-23866591, 02-23866592 (`tel:+20223866591`, `tel:+20223866592`). info.egy@mobco-group.com
  - Careers: KSA careers@mobco-group.com · Egypt hr.egy@mobco-group.com
- Footer: "© 2026 MOBCO Group. All Rights Reserved." (Do NOT credit any design agency.)

### Honesty rules (strict)
- **Never invent** clients, partner names, people/leadership, awards, certifications (ISO etc.), testimonials,
  news articles, dates other than 2001, project specs (floor areas, storeys, values, completion years),
  job vacancies with specific titles/salaries, or social-media URLs.
- Where a layout needs content that is not in §2, use either (a) generic, obviously-true capability copy for
  a construction group (e.g. "Pre-construction planning", "Quality, health, safety & environment") or
  (b) a tasteful placeholder marked in markup with `data-placeholder` + an HTML comment
  `<!-- TODO(content): what the client must supply -->`, and log it in `docs/content-notes/<page>.md`.
- Unknown project names: describe by what the image shows ("Lagoon Villa Community", "Innovation Campus",
  "Riyadh Landmark") and flag them `nameIsDescriptive: true` in data + content notes.
- The 3D Studio models are **illustrative massing models** — say so in the UI.
- The stats counters use the home-page numbers (430+ projects). The About narrative keeps its own
  wording ("more than 150 projects"). Note the discrepancy in content notes; do not "fix" it in copy.

---

## 3. Site map & ownership

| Page | File | Page assets (owned by that page's builder only) |
|---|---|---|
| Home | `index.html` | `assets/css/pages/home.css`, `assets/js/pages/home.js` |
| About | `about.html` | `…/about.css`, `…/about.js` |
| Subsidiaries | `subsidiaries.html` | `…/subsidiaries.css`, `…/subsidiaries.js` |
| Projects (explorer) | `projects.html` | `…/projects.css`, `…/projects.js` |
| 3D Project Studio (interactive viewer) | `studio.html` | `…/studio.css`, `assets/js/studio/*.js` |
| Media centre | `media.html` | `…/media.css`, `…/media.js` |
| Careers | `careers.html` | `…/careers.css`, `…/careers.js` |
| Contact | `contact.html` + `404.html` | `…/contact.css`, `…/contact.js`, `…/404.css` |

Shared (foundation-owned; page builders must NOT edit — write requests to `docs/requests/<page>.md`):
`partials/header.html`, `partials/footer.html`, `assets/css/main.css`, `assets/js/core/**`,
`assets/js/data/**`, `assets/icons/sprite.svg`, `tools/**`, `docs/STYLEGUIDE.md`, `_template.html`.

Primary nav: Home · About · Subsidiaries · Projects · 3D Studio · Media · Careers · Contact
(Header CTA button: "Start a project" → `contact.html#inquiry`). Language toggle EN | ع. Search (⌘K / Ctrl+K).

---

## 4. Global experience (foundation builds; pages consume)

- Static header/footer markup lives in `partials/*.html` and is inlined into every page between
  `<!-- @include header -->…<!-- /@include header -->` markers by `node tools/build.mjs` (idempotent).
  Pages are therefore fully static HTML (good for SEO / no-JS).
- Header: transparent over dark heroes (`body[data-hero="dark"]`), turns solid white with shadow on scroll,
  hides on scroll-down / shows on scroll-up, active link underline (from `body[data-page]`), "Projects"
  has a mega-menu preview, mobile full-screen drawer with staggered links.
- Bilingual **EN / AR with full RTL** (Saudi client — this is a must-have):
  markup carries English; Arabic in attributes: `data-ar` (textContent), `data-ar-html` (innerHTML),
  `data-ar-placeholder`, `data-ar-aria-label`, `data-ar-title`, `data-ar-alt`, `data-ar-content` (meta).
  `core/i18n.js` swaps, sets `<html lang dir>`, persists to `localStorage`, dispatches
  `document` event `langchange` `{detail:{lang}}`. Data-driven UI uses `t({en, ar})` from `core/i18n.js`
  and re-renders on `langchange`. CSS uses logical properties everywhere (`margin-inline-start`, `inset-inline`, …).
- Motion (GSAP + ScrollTrigger + Lenis, all honoring `prefers-reduced-motion`): `data-reveal`
  (`up|fade|left|right|scale|clip|mask`), `data-reveal-stagger` on a parent, `data-split` (line/word
  headline reveals), `data-count` counters, `data-parallax`, `data-magnetic`, marquee, image
  `data-kenburns`, scroll progress bar, back-to-top ring, page-transition curtain, first-visit preloader
  (logo draw), custom cursor (desktop, fine pointers only, with "View"/"Drag" states via `data-cursor`).
- Components (CSS + JS behaviours, declarative via data attributes): buttons, links with arrow,
  eyebrow, section header, cards, tabs (`data-tabs`), accordion (`data-accordion`), modal (`data-modal`),
  lightbox (`openLightbox(items, index)` with zoom/pan/swipe/keyboard), drawer, toast (`toast(msg)`),
  chips/filters, form fields with floating labels + validation (`data-validate`), file drop zone,
  range slider, tooltip, marquee, page hero ("page-hero" with breadcrumb), CTA band, stat block,
  before/after compare slider (`data-compare`), horizontal drag carousel (`data-carousel`).
- Site search overlay (Ctrl/⌘+K) over pages + projects + subsidiaries from `data/site-data.js`.
- Cookie/consent banner (gates the Maps iframe), toast system, 404.
- Accessibility: WCAG 2.2 AA — landmarks, skip link, visible focus, keyboard-complete widgets with ARIA,
  44px touch targets, alt text, `lang`/`dir` correct, motion-safe.
- Performance: `<picture>` webp+jpg with width/height, `loading="lazy"` below the fold, hero preload,
  `defer`/module scripts, no layout shift, 60fps animations (transform/opacity only).
- SEO: unique `<title>`/meta description, OG/Twitter tags, canonical placeholder, JSON-LD
  (`Organization` on home, `ContactPage` + `PostalAddress` on contact), `sitemap.xml`, `robots.txt`,
  `site.webmanifest`.

### Script/head boilerplate (every page — see `_template.html`)
```html
<script src="assets/vendor/gsap/gsap.min.js" defer></script>
<script src="assets/vendor/gsap/ScrollTrigger.min.js" defer></script>
<script src="assets/vendor/lenis/lenis.min.js" defer></script>
<script type="module" src="assets/js/core/main.js"></script>
<script type="module" src="assets/js/pages/<page>.js"></script>
```
`studio.html` additionally declares an import map: `{"imports":{"three":"./assets/vendor/three/three.module.js","three/addons/":"./assets/vendor/three/addons/"}}`
(three.module.js imports `./three.core.js`, already vendored alongside).

---

## 5. Quality bar ("would a client pay $10k for this?")
- Every page has a distinctive, art-directed hero and at least 3 genuinely interactive moments.
- Pixel polish: consistent 8px spacing scale, 12-col grid, max content width ~1320px, generous section
  padding (clamp 80–160px), hairline dividers, consistent radii (2px — architectural, near-square) and
  shadows, no orphaned widows in big headlines, balanced text (`text-wrap: balance`).
- Responsive from 360px to 2560px; no horizontal scroll at any width; touch-friendly.
- Zero console errors; works with JS disabled at a basic level (content visible, no permanently hidden
  `data-reveal` content — reveal hiding is applied only when `html.js` is set).
- Arabic/RTL layout looks intentional (mirrored arrows, aligned grids), not broken.

---

## 2b. Facts addendum (added mid-build from the client's subsidiary pages + projects page)

- **Subsidiary pages** (verbatim text now in `site-data.js` → `SUBSIDIARIES[].about/tagline/facts/page/hero/image`):
  - MOBCO Construction — "ELEVATING INDUSTRY STANDARDS". Founded 2001, construction arm of MOBCO Group; tier-one status; projects span Saudi Arabia, Canada, the UK, and Egypt; "completed 438 projects across four continents".
  - MOBCO Developments — "CREATING LANDMARKS, DEFINING EXCELLENCE". Strategic entry into the Egyptian market; transforming prime locations in Canada and Egypt; sustainability + safety commitment.
  - MOBCO Real Estate (Development) — "Simplifying Property Management". Established 2002 in Cairo; leasing & property management for multi-functional buildings; flagship Mivida Business Park, B1 (modern offices around a common core).
  - Each of these three has its own page: `mobco-construction.html`, `mobco-developments.html`, `mobco-real-estate.html` (header "Subsidiaries" gets a dropdown to them).
- **Projects**: 33 in `PROJECTS` (28 real portfolio projects with photos, each with a `category` from the client's own tabs — see `PROJECT_CATEGORIES`) and `featured` flags.
- Number discrepancies to keep as-stated (do not reconcile in copy; flagged in content notes): 430+ projects (home stats) vs 438 (Construction page) vs "more than 150" (About narrative); "three continents" vs "four continents".
- New photos (webp+jpg+thumbs, sizes in `IMAGES`): `sub-construction-hero` (tower under construction over a hillside city), `sub-construction-render` (night render, timber-clad low-rise), `sub-developments-hero` (Victoria 101 close-up), `sub-real-estate-hero` (MOBCO Developments sign on a building), `sub-real-estate-office` (office interior), and the 28 portfolio photos named by project slug.
