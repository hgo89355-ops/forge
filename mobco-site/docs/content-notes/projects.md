# Content notes — projects.html (Project Explorer)

Owner files: `projects.html`, `assets/css/pages/projects.css`, `assets/js/pages/projects.js`.
All project content is rendered from `assets/js/data/site-data.js` (`PROJECTS`, `PROJECT_CATEGORIES`, `REGIONS`, `SECTORS`).
The static grid / ring fallback / category tiles / marquee inside `<!-- pj:* -->` markers in `projects.html` are a
no-JS + SEO copy generated from the same data (re-generate when the data changes; the generator lives in the
builder's scratch dir and only rewrites those marker blocks).

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
- Image `alt` for portfolio photos = project name (no image descriptions supplied). TODO(content): descriptive alt text.
- Arabic project names / categories come from data (to be proof-read by a native copy editor, esp. "Hilton DoubleTree & Garden Inn", "Maad Towers (voco by IHG)", "NEOM … CV5").

## URL contract (honoured)
- `projects.html#<slug>` for every project → opens the viewer (cards carry `id="<slug>"`, so no-JS also lands on the card).
- `projects.html?category=<PROJECT_CATEGORIES id>&region=<ksa|egypt|canada>&view=<grid|ring|map|list>&q=<text>&sort=<featured|az|category>`.
- Legacy `?sector=<SECTORS id>` maps to the matching category (hotels→hospitality, medical→medical, education→education,
  residential→residential, business/government→mixed-use-admin); unmapped sectors (skyscrapers, malls) are ignored.
