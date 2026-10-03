# Content notes — contact.html + 404.html

Owner: contact builder. Everything stated on these pages comes from BRIEF §2. The items below are
placeholders, assumptions or derived copy that the client must confirm.

## Placeholders (`data-placeholder` + `<!-- TODO(content) -->` in markup)
| Where | What the client must supply |
|---|---|
| Offices → KSA card, hours line | KSA opening hours. **Assumed Sun–Thu 08:00–17:00 (Riyadh time).** Also drives the live “Open now / Closed” status (`HOURS` in `assets/js/pages/contact.js`). |
| Offices → Egypt card, hours line | Egypt opening hours. **Assumed Sun–Thu 09:00–17:00 (Cairo time).** Same `HOURS` constant. |
| Directory → Media & press | A dedicated media/press address, if one exists. Routed to `info.ksa@mobco-group.com` (subject “Media enquiry”) meanwhile. |
| Directory → Suppliers & subcontractors | Procurement / vendor-registration contact. Routed to `info.ksa@` / `info.egy@` (subject “Supplier introduction”) meanwhile. |
| Response promise → “Typical response time” | A response-time commitment. **No SLA number is published** until the client confirms one. |

## Assumptions & derived copy
- **Hero / lead / section intros / response promise** are generic, obviously-true contact copy. The promise
  section quotes the mission sentence verbatim (“Integrity and consistency are the signatures of our service.”).
  “In English or Arabic” assumes both offices can reply in either language — confirm.
- **Offices** — addresses, phones, emails are verbatim from BRIEF §2 (also `OFFICES` in site-data).
  Egypt is presented as one office with two addresses (New Cairo + Nasr City). The labels “Headquarters”
  and “Regional office” follow the footer/site-data.
- **Map pins** are approximate (`OFFICES.geo` is `approx: true`; Nasr City is projected from ≈31.34°E 30.056°N).
  The UI says so (“Pin positions on the dot map are approximate”). Google Maps queries / directions use the
  address text: “Al Ebdaa Tower, King Fahd Road, Olaya, Riyadh”, “B1 Building, Mivida Compound, New Cairo,
  Egypt”, “2 Ahmed Hassan St., Ninth District, Nasr City, Cairo, Egypt” — client to verify they resolve to the
  right buildings (or supply exact coordinates / Google place links).
- **Inquiry wizard options** are input choices, not company claims:
  - Project types (Construction, Real estate development, Project management, Pre-construction & planning,
    Facility management, Something else) — derived from CAPABILITIES / BRIEF specialisms.
  - Sectors — `SECTORS` from site-data (+ “Other sector”).
  - Built-up area bands (Not sure / <5,000 / 5,000–20,000 / 20,000–100,000 / >100,000 m²) and budget bands
    (SAR for KSA projects: <10M / 10–50M / 50–250M / >250M; USD elsewhere: <3M / 3–15M / 15–70M / >70M;
    plus “Not defined yet” / “Prefer not to say”) — **client to confirm the bands they want to ask about.**
  - Timeline options (ASAP / ≤6 months / 6–12 months / >1 year / Just exploring).
  - Routing rule: Saudi Arabia → `info.ksa@`, Egypt → `info.egy@`, Elsewhere → headquarters `info.ksa@`.
- **Quick form** routing: Careers topic → `careers@` (KSA) / `hr.egy@` (Egypt); every other topic → `info.ksa@` /
  `info.egy@` by the chosen office.
- **Submission is client-side only** (static site): both forms open the visitor’s mail app via `mailto:` with a
  formatted body. The wizard reference (`MOB-KSA|EGY-YYMMDD-XXXX`) is generated in the browser and is not
  registered anywhere — a backend/CRM is needed for real tracking (see `docs/requests/contact.md`).
  Long descriptions are truncated in the `mailto:` URL (~1,800 chars) and the full text is copied to the
  clipboard; the success screen also offers “Copy inquiry text”.
- **Consent** — the Google Maps iframe loads only after the cookie banner is accepted (core `consent.js`) or
  after an explicit “Load map” click (remembered for the browser session only, key `mobco-contact-map`).
- **Photography** — hero uses `aerial-compound` as atmosphere only (decorative, `alt=""`); it does not claim
  to depict an office.

## 404.html
- Headline “This page is still under construction” per the spec; copy is generic. The crane/“404” block is an
  illustration. Page is `noindex`.
- TODO(deploy): configure the host to serve `/404.html` for missing URLs. Asset paths are relative, so the
  page renders correctly only when served from the site root (or add a `<base href="/">` at deploy time).
