# Content notes — projects.html (Project Explorer)

Owner files: `projects.html`, `assets/css/pages/projects.css`, `assets/js/pages/projects.js`.
All project content is rendered from `assets/js/data/site-data.js` (`PROJECTS`, `PROJECT_CATEGORIES`, `REGIONS`, `SECTORS`).
The static grid / ring fallback / category tiles / marquee inside `<!-- pj:* -->` markers in `projects.html` are a
no-JS + SEO copy generated from the same data (re-generate when the data changes; the generator `gen-static.mjs` is NOT in the repo — it lives in the builders' scratch
dirs and only rewrites those marker blocks; consider moving it into tools/).

## Facts used (verbatim, BRIEF §2)
- Hero headline: "Iconic projects across three continents" (from WHO WE ARE / GLOBAL copy).
- Hero lead: "MOBCO Group has successfully delivered iconic projects ranging from skyscrapers and commercial malls to residential compounds, governmental and educational institutions, and luxury hotels." (WHO WE ARE, verbatim sentence).
- Sectors lead: KSA blurb "More than 25 years of premium projects across various sectors, including construction, development, education, hospitality, and facility management." (verbatim).
- Eastmain / Victoria 101 summaries and highlights: verbatim region blurbs (via data).
- Live counts are computed from data: 33 projects · 9 sectors (categories with ≥1 project) · 3 countries. These are
  "projects shown on this page", NOT the 430+ delivered stat (not used on this page) — keep them separate.

## Honesty / placeholders / assumptions
- **No specs, dates, statuses, clients' roles, values or sizes are shown.** The viewer's facts panel only shows
  Category, Country and Type (typology, when it adds information). Unknown fields are omitted.
- **Descriptive names** (`nameIsDescriptive: true`): "Lagoon Villa Community", "Innovation Campus", "Classical Landmark".
  Shown as-is (per BRIEF); client must supply real names. TODO(content).
- **Location to be confirmed**: Lagoon Villa Community and Innovation Campus have no region/location → shown as
  "Location to be confirmed" in cards, list, viewer and the map's side list (not pinned on the map).
- **Classical Landmark** has `category: null` → appears under "All" only; its card label falls back to its typology
  ("Landmark building"). Region KSA is inferred in data (see data todo).
- **Portfolio projects (28)**: region assumed KSA (data todo); most locations are "Saudi Arabia" only. City pins on the
  KSA map exist only where the location string names a city: Riyadh (Olaya ×2), Jeddah, KAUST/Thuwal, Taif, NEOM (×4),
  Al Khobar. Everything else is grouped under "City not stated".
- **Map pin coordinates are approximate** (city centres; NEOM pin placed near NEOM Bay ≈ 35.25E 27.95N). The map says
  "Pin positions are approximate."; overlapping pins are nudged apart for legibility.
- **Viewer "alternate crops"**: for projects whose gallery has only one image, two extra "detail" views are generated
  (zoomed crops of the same photo at 30%/58% and 70%/42%), captioned "<name> — detail". They are crops, not new photos.
- **"Stylised blueprint view"** is a CSS/SVG filter of the same image (grayscale → edge detection → blue duotone +
  grid), labelled as such in the UI. It is not a real drawing. The compare toggle is labelled "Image | Compare |
  Blueprint" (spec said "Render") because several portfolio images may be photographs, not renders — client to confirm.
- **"Explore in 3D"** appears only for the 5 projects with a `studioModel`, with the note "Illustrative massing model".
- **Featured** (14) is a curation flag in data (drives the hero ring + "Featured first" sort). No "Featured" badge is shown.
- Image `alt`: grid-card images are decorative (`alt=""`, the card's link text names the project); the viewer image and the
  no-JS fallback use the project name. TODO(content): descriptive alt text for the portfolio photos (no descriptions supplied).
- Arabic project names / categories come from data (to be proof-read by a native copy editor, esp. "Hilton DoubleTree & Garden Inn", "Maad Towers (voco by IHG)", "NEOM … CV5").

## URL contract (honoured)
- `projects.html#<slug>` for every project → opens the viewer (cards carry `id="<slug>"`, so no-JS also lands on the card).
- `projects.html?category=<PROJECT_CATEGORIES id>&region=<ksa|egypt|canada>&view=<grid|ring|map|list>&q=<text>&sort=<featured|az|category>`.
- Legacy `?sector=<SECTORS id>` (header/footer/home links) maps to a category through an explicit editorial table in
  projects.js: hotels→hospitality, medical→medical, education→education, residential→residential, and
  business / government / skyscrapers / malls→mixed-use-admin (the client's tabs have no "towers" or "retail" tab; the
  mixed-use tab holds the towers and Eastmain's retail). Assumption — client may prefer different targets.
  (Fixed in QA: `business` used to land on the single Airport project because PROJECT_CATEGORIES lists "business" under Airport.)
- When the page is opened with any explorer param (`category`, `sector`, `region`, `view`, `q`, `sort`) and no `#slug`,
  it lands on the category tabs instead of the top of the hero, so "Hotels" from another page shows hotels immediately.

## QA review log (fresh-eyes pass)
- Fixed: tab labels overlapping neighbours at ≤1024 px (tabs now never shrink below their label; the bar scrolls with
  fade edges instead), crushed search box at 768 px (toolbar is two rows from 768–1359 px), "Canada" chip hidden behind a
  horizontal scroll on phones, clipped sector-tile names at 360 px (mobile overrides were being out-ranked by later
  base rules), double scroll offset when a sector tile jumps to the explorer, low-contrast text (empty tabs/chips,
  list index, tile numbers, search placeholder), duplicated accessible names on grid cards (image alt now empty — the
  link text names the project; index numbers are aria-hidden), breadcrumb link target < 24 px, consent banner
  covering the viewer, hard rectangular edge on the zoomed KSA map (now feathered).
- Hero ring now uses the 480 px thumbnails whenever the card needs ≤ 560 device px (≈ 3× lighter), and the front
  card's thumb is preloaded.
