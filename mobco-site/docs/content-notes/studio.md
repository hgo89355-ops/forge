# Content notes — 3D Project Studio (`studio.html`)

## Facts used (verbatim from BRIEF §2 / `site-data.js`)
- Project names, typologies, locations, summaries and slugs come from `PROJECTS` in `assets/js/data/site-data.js`
  (rendered with `t()`); no project facts are written into the studio's own files.
- CTA band eyebrow: "WE PLAN. WE BUILD. WE MANAGE." (motto, verbatim).
- Copyright/footer: shared partial.

## Honesty / disclaimers shown in the UI
- Info panel, help overlay and every saved screenshot carry **"Illustrative massing model — not to scale"**
  (AR «نموذج كتلي توضيحي — ليس بمقياس رسم»).
- "From model to project" section: "The studio’s models are illustrative massing studies inspired by the project
  renders. They are not to scale and do not represent final designs, areas or heights." — generic and true.
- Each project card carries an "Illustrative model" glass badge.
- The section cut shows a **percentage of model height**, never metres; the time of day is a lighting control only.
- Model descriptors / taglines / hotspot texts come from the five model modules (`meta.descriptors`, `meta.tagline`,
  `meta.hotspots`), written by the model authors as illustrative, generic descriptions. The engine shows them as-is;
  the client should review them along with the models (see list below).

## Placeholders / assumptions — client to confirm
| Item | Where | Note |
|---|---|---|
| Descriptive project names | rail, info panel, project list | "Lagoon Villa Community", "Innovation Campus", "Classical Landmark" are **descriptive** names (`nameIsDescriptive: true`) — client to supply real names. |
| Classical Landmark region | info panel location | Region "Saudi Arabia" is inferred in `site-data.js` from the old site's KSA card. |
| Model content | `assets/js/studio/models/*.js` | Massing, level counts, hotspots, descriptors are artistic interpretations of the renders — not specifications. Client/architect review recommended before launch. |
| Model display names | info panel | The public title is the project name from `site-data.js`; the module's own `meta.name` (e.g. "Mixed-use Office & Retail") is used only for a model without a project. |
| Guide copy | "How to use the studio" cards | Generic product copy describing the viewer's own features — no company claims. |
| CTA heading | "Bring your next project to the table" | Generic marketing line (no facts). |
| Canonical / OG URLs | `<head>` | `TODO(deploy)`: placeholder domain `https://mobco-group.com/studio.html`. |
| Screenshot caption | PNG download | "MOBCO Group · 3D Project Studio" + model name + illustrative disclaimer. |

## Arabic
All UI strings are authored in fluent MSA: static markup via `data-ar*`, dynamic strings in
`assets/js/studio/strings.js`; model text comes from each module's `{en, ar}` meta. Digits stay Western;
sequences such as "01 — 05" and percentages are isolated LTR (`.num-ltr`). The 3D canvas is never mirrored;
panels, scrims, chips and arrows mirror in RTL.

## Fresh-eyes review edits (QA lead)
- Removed storey/level counts from model copy (BRIEF §2 forbids storey specs): villa descriptors/hotspot now say
  "Low-rise villas" (AR «فلل منخفضة الارتفاع») instead of "Two-storey"; the commercial strip is "along the main
  road" instead of "two-level"; the Eastmain café pavilion is "a light glass pavilion" (no "single-storey").
- Classical Landmark tagline shortened (the illustrative disclaimer already sits right below it):
  "A classical courtyard building in terracotta and cream stone, crowned by a sculpted central drum."
- Remaining model copy that describes features seen in the renders ("double-height podium", "rooftop pool",
  "sky bridge", "lagoon pools", "porte-cochère") is descriptive of the illustrative model, not a specification —
  still for client/architect review.
- Arabic time readout ("2:30 م") is no longer forced into an LTR run, so the meridiem follows the time when read
  right-to-left.

## Not shown on purpose
No areas, heights, storeys, completion dates, client names, awards or certifications appear anywhere in the
studio, even where a model has an obvious number of levels (levels are labelled by the model only).
