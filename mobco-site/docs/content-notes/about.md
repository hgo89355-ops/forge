# Content notes: About (`about.html`)

Placeholders, assumptions and items the client must confirm. The verbatim facts used come from BRIEF §2.

## Verbatim facts used
- Hero title: "MASTERING THE ART OF MODERN CONSTRUCTION".
- Story: all three paragraphs, verbatim (EN, with the Arabic from `site-data.js` `COMPANY.story`).
- Pull quote: an excerpt of paragraph 3 ("We don't just build structures — we build lasting relationships and groundbreaking achievements…"). It repeats the paragraph text, so it is marked `aria-hidden` and screen readers do not read it twice.
- Vision ("ENVISIONING A SUSTAINABLE FUTURE", 2 paragraphs) and Mission ("OUR COMMITMENT TO EXCELLENCE"), verbatim. The Mission body is split into three blocks (lead / signature line / text) for layout only. The wording is unchanged.
- Values intro (`COMPANY.valuesIntro`), "WE PLAN. WE BUILD. WE MANAGE.", KSA / Egypt / Canada blurbs (used in the timeline), stats 25+ / 10,000+ / 430+ / 600+, SAR 6 billion+ turnover over the past five years, founded 2001, three continents.

## Discrepancy (kept as written; do not "fix" in copy)
- The story narrative says **"more than 150 projects"**. The Key figures counters use the home-page number **430+ projects delivered** (from `STATS`). Both appear on this page, each in its own context. The client should confirm which figure is current, or whether they measure different things (e.g. projects completed vs. delivered including ongoing ones).

## Generic or derived copy (client to review)
- **Hero lead**: "Founded in 2001 in Saudi Arabia, MOBCO Group is a privately owned, vertically integrated group specialising in construction, real estate development and education." This is built from the story facts.
- **Section intros** (not in the brief, written as generic framing):
  - Key figures: "More than two decades of delivery across three continents — reflected in turnover, people and projects."
  - Vision & mission: "Where we are going, and how" / "A global ambition, grounded in the integrity and consistency…"
  - Model: "One group, the full lifecycle" / "From planning and construction to development, education and long-term management…"
  - Journey heading: "From Saudi Arabia to three continents".
- **Core value card texts**: Safety, Integrity and Excellence use `VALUES[].text` from `site-data.js` (foundation-written generic copy). The three culture cards (Creative, Innovative, People-oriented) take their words from the Vision paragraph ("a creative, innovative, and people-oriented organization"). Their back-face texts:
  - Creative: "We bring fresh thinking to every brief — from early planning through to delivery." (generic)
  - Innovative: paraphrase of the Mission ("proven, state-of-the-art techniques… innovative thoughts…").
  - People-oriented: paraphrase of the Vision ("individual opportunity, personal satisfaction and rewarding challenges…").
- **Vertically integrated model**: the six disciplines are all named in the brief (story paragraph 2, who-we-are, the KSA blurb). The descriptions are generic or derived:
  - Construction: from the who-we-are sector list.
  - Real Estate Development: verbatim from story paragraph 2.
  - Education: "one of the group's three specialisms".
  - Project Management: "on time, within budget and to the highest quality standards" (story paragraph 3).
  - Hospitality: generic ("luxury hotels… finish quality and detailing").
  - Facility Management: generic, with a link to the KSA blurb.
  - The links between nodes are illustrative. The ring is the "integrated loop", and the inner triangle Project Management → Construction → Facility Management stands for "We plan · We build · We manage".
  - Subsidiary mapping is assumed from the company names: Construction → MOBCO Construction; Real Estate Development → MOBCO Developments and MOBCO Real Estate Development; Education → Elite Education Group. **Client to confirm.**
- **HSE commitments**: four generic commitments (planning for safety; safe sites with supervision and PPE; respect for environment and community; learning and continuous improvement) plus pillars "Health & safety · Quality · Environment". **No certifications, statistics or awards are claimed.** The client should confirm the wording and may supply real HSE policy points, accreditations or figures.
- **CTA cards**: "Join 10,000+ talented professionals" (stat) and "Fulfilling careers and rewarding challenges with our teams in KSA and Egypt" (vision wording, plus the brief's career emails for KSA and Egypt). Contact card: "Our Riyadh headquarters and Cairo office are ready to answer your inquiry."

## Placeholders (`data-placeholder` + `<!-- TODO(content) -->`)
- **Journey chapter years**: only **2001** is a known date. Chapters 02 (Growth across sectors in KSA), 03 (Egypt — Eastmain) and 04 (Canada — Victoria 101) show "Chapter 02/03/04" instead of a year, with `data-placeholder` and TODO comments. The client should supply the years (e.g. when MOBCO entered Egypt and Canada, and Eastmain / Victoria 101 milestones).
- **Chapter order**: Egypt is shown before Canada, following the brief's order. That sequence is an assumption until the client supplies dates.
- "Today" chapter: 25+ years · 10,000+ professionals · 3 continents (facts).

## Images (QA pass: real portfolio photos now used for variety; captions stay honest)
- Hero: `ksa-landmark` (Classical Landmark, a descriptive name, region KSA inferred from the old site). No caption claims a project name.
- Story: `campus`, captioned "Innovation Campus — aerial render". **Descriptive name** (`nameIsDescriptive: true`); the real project name is unknown.
- Turnover tile: `cluster-j07` (skyline, grey-teal treatment, decorative `alt=""`).
- Vision panel: `hq-tower-masjid-museum`, labelled "Pictured: Headquarter Tower, Masjid & Museum" (short form of the portfolio name "Construction of the Headquarter Tower, Masjid, Museum and Tower Site Development"). Mission panel: `sofitel-hotel`, labelled "Pictured: Sofitel Hotel". Both are decorative backgrounds for the verbatim texts; they do not illustrate the vision or mission literally.
- Vertically integrated model card (one image per discipline): Construction `sub-construction-hero` (from the MOBCO Construction page, no caption); Real Estate Development `eastmain` ("Pictured: Eastmain"); Facility Management `sub-real-estate-office` (no caption); Hospitality `raffles-hotel-residence` ("Pictured: Raffles Hotel & Branded Residence…"); Project Management `taif-municipality-building` (no caption: we do **not** claim a PM role on that project); Education `tbc-schools-group-12` ("Pictured: TBC Schools — Group 12").
- HSE: `park-inn-olaya-hotel` (aerial with an active construction site, blueprint treatment, decorative).
- CTA cards: Careers `bank-albilad-head-office`, Contact `as-safiyyah-museum-park` (decorative; neither is presented as an office of MOBCO).
- Timeline: 2001 → `ksa-landmark`; Ch. 02 (growth across sectors in KSA) → a mosaic of three real portfolio projects with their client category: Al-Moosa Specialist Hospital (Medical), KAUST Hotel (Hospitality), NEOM Bay Airport (Airport), each linking to `projects.html#<slug>`; Egypt → `eastmain`; Canada → `victoria-101`; Today → `aerial-compound` (Lagoon Villa Community, descriptive name). These pairings are illustrative, not claims that a project belongs to a given year.

## Model card: "Selected projects" (assumed mapping — client to confirm)
Lists link to `projects.html#<slug>` and only use projects whose client category matches the discipline:
- Construction: Al-Moosa Specialist Hospital, Taif Municipality Building, Remaining Works for Cluster J07 (from the projects portfolio).
- Real Estate Development: Eastmain, Victoria 101 (per `SUBSIDIARIES` MOBCO Developments facts).
- Hospitality: Raffles Hotel & Branded Residence, Sofitel Hotel, KAUST Hotel (category "Hospitality").
- Education: TBC Schools — Group 12 (category "Education").
- Project Management and Facility Management: no project list (no source states which projects MOBCO managed).
- "Group companies" links now go to the dedicated subsidiary pages (`mobco-construction.html`, `mobco-developments.html`, `mobco-real-estate.html`); Elite Education Group falls back to `subsidiaries.html#elite-education`.

## Possible future content (not used)
- The MOBCO Real Estate Development page states it was "established in 2002 in Cairo". It could date the Egypt chapter, but MOBCO Developments describes its own "strategic entry into the Egyptian market" without a year. The Egypt chapter therefore keeps the "Chapter 03" placeholder until the client confirms which date marks the group's entry into Egypt.

## Arabic
- All Arabic is a professional translation of the supplied English (story, vision and mission match `site-data.js`) and should be reviewed by the client.
- "6B+" is rendered in Arabic as «+6» with the unit line «مليارات ريال سعودي».
