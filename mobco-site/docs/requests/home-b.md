# Requests from HOME Part B (home-b builder)

None of these block Part B: each one is already worked around locally in `home-b.css` / `home-b.js`.

## For Part A / index.html owner (no code change needed if already done)
- **Include markers inside `<main>`, after the stats section, on their own lines:**
  `<!-- @include home-b -->` and `<!-- /@include home-b -->`
- **In `<head>`:**
  - `<link rel="stylesheet" href="assets/css/pages/home-b.css">` after `home.css`.
  - `<script type="module" src="assets/js/pages/home-b.js"></script>` after `home.js`.
- **`body[data-page="home"]`** (all Part B styles are scoped to it).
- **Part B ids are reserved:** `hb-sectors`, `hb-footprint`, `hb-projects`, `hb-studio`, `hb-values`, `hb-cta`, `hb-region-ksa|egypt|canada`, `studio-embed`.
- **Part B's last section is a light (sand) section** holding an inset navy CTA panel. If Part A's stats section is white, Part B's first section (white sectors with gridlines) follows it directly. Consider giving stats a dark or sand background for rhythm.

## For foundation (shared files)
1. **`.section--dark .badge` overrides `.badge--glass`.** The rule `.section--dark .badge { background: rgba(255,255,255,.08) }` has higher specificity than `.badge--glass`. As a result, glass badges over photos in dark sections lose their dark backing, and the text becomes hard to read on light images.
   - Suggested fix: add `.section--dark .badge--glass, .section--deep .badge--glass { background: rgba(11,22,32,.5); }` in main.css.
   - Worked around locally with `.hb-region__badge`.
2. **The reset `picture { max-width: 100% }` blocks oversized pictures used for parallax inside `.project-card__media`.** Worked around with `max-inline-size: none`. Consider documenting this in STYLEGUIDE §6.4.
3. **Styleguide §6.9 says "don't put a CTA band directly above the footer", but the home spec requires a closing CTA.** Part B uses a sand section with an inset panel, so it reads as a separate block before the footer's "Let's build what's next".
   - Optional: allow pages to hide the footer's CTA block with a body flag (e.g. `body[data-footer-cta="off"]`) so the home page doesn't repeat it.
4. **Studio embed contract:** `<div id="studio-embed" data-studio-embed="mixed-use">` currently holds an SVG axonometric drawing.
   - If the 3D Studio ships an embeddable viewer, it can mount into `[data-studio-embed]` and replace the children.
   - `home-b.js` already tolerates the SVG disappearing.
