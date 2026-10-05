# Requests from the subsidiary-pages builder

Pages: `mobco-construction.html`, `mobco-developments.html`, `mobco-real-estate.html`.
All needs below are already worked around locally (page CSS/JS) — these are suggestions for the shared layer.

1. **Search index (`PAGES` in `site-data.js`)** — add the three detail pages so ⌘K finds them, e.g.
   `{ id: 'mobco-construction', url: 'mobco-construction.html', icon: 'hard-hat', title: SUBSIDIARIES[0].name, description: SUBSIDIARIES[0].tagline, keywords: … }`
   (same for `mobco-developments` / `building`, `mobco-real-estate` / `landmark`). Today search results for the
   subsidiaries point to `subsidiaries.html#<id>`.
2. **Footer "The Group" logos** link to `subsidiaries.html#<id>`; consider pointing the three companies with a page
   to `SUBSIDIARIES[].page` (`mobco-construction.html`, …).
3. **`sitemap.xml`** — add the three pages.
4. **UK on the world map** — `WORLD.highlight` has no `uk` path and `WORLD.offices` has no UK entry. Locally the page
   keys the four GB dots `[491.3,78.8] [498.8,86.3] [491.3,93.8] [498.8,93.8]` and draws a marker at London
   `xy [499.7, 94.8]` (lon −0.13, lat 51.5 projected with the same naturalEarth1 fit). A shared
   `WORLD.markers.uk = { lonlat: [-0.13, 51.5], xy: [499.7, 94.8] }` (+ optional `highlight.uk`) would let other pages reuse it.
5. **Icon sprite** — a `key` / `door-open` icon would suit "Leasing" (currently `handshake`), and `quote` for pull quotes
   (currently an inline SVG mark in the page).
6. **`.contact-line`** is styled for dark backgrounds only (white text) and has `min-block-size: 28px`; a 44px
   touch-target variant would help in page content (done locally under `.sd-lease`).
