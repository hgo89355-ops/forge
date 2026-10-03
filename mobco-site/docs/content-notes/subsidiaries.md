# Content notes — Subsidiaries (`subsidiaries.html`)

Things the client needs to confirm or supply. Sources: `docs/BRIEF.md` §2 and §2b, `assets/js/data/site-data.js`
(`SUBSIDIARIES`, `PROJECTS`, `OFFICES`, `REGIONS`). Subsidiary text is pulled from `SUBSIDIARIES` at runtime and
re-rendered when the language changes. The English inside the HTML is only the no-JS fallback, generated from
the same data.

## Verbatim client content (from the subsidiary pages, BRIEF §2b)
- **Taglines:** "Elevating industry standards" (Construction), "Creating landmarks, defining excellence"
  (Developments), "Simplifying property management" (Real Estate). Elite Education Group has no tagline yet, so
  its `short` text is shown instead.
- **About paragraphs:** `SUBSIDIARIES[].about`, shown verbatim. Developments has 3 paragraphs: the third sits
  behind a "Read more" toggle.
- **Facts strip:** `SUBSIDIARIES[].facts`, verbatim.

## Number and wording discrepancies (kept as stated, not reconciled in the copy)
- MOBCO Construction: **438 projects / four continents** (its own page), but the home stats say **430+** and the
  rest of the site says **three continents**. The About narrative also says "more than 150 projects". The client
  needs to reconcile these.
- MOBCO Construction projects "span Saudi Arabia, Canada, the UK and Egypt". The UK appears nowhere else on the
  site.
- MOBCO Real Estate Development was "established in 2002 in Cairo". This is the only date other than 2001, and it
  is the client's own fact (BRIEF §2b).

## Generic / placeholder copy (TODO(content) comments in the markup)
- **Focus areas** (`SUBSIDIARIES[].focus`, three per company) are generic copy from the data file. For Real
  Estate they read "Residential development / Commercial assets / Asset management", which does not quite match
  the verbatim "leasing & property management". The client should confirm (see the request).
- **Elite Education Group** has no client copy at all. Its description (`long`), its `short` text and its focus
  areas are generic. The client needs to supply a description, schools/campuses, curricula and, if one exists, a
  company page.
- **Capabilities accordion:** the bullet points are generic capability copy, partly from `CAPABILITIES` in the
  data file ("Finish quality & detailing", "Delivery coordinated across group companies", "Community & asset
  management", and so on). The section intro quotes the KSA fact verbatim. The hospitality line combines two
  brief facts: hospitality is a KSA sector, and luxury hotels are among the iconic projects.
- **"Integrated delivery"** paraphrases the "privately owned, vertically integrated company" fact.
- **Finder recommendations** paraphrase the verbatim facts. For "Elsewhere" the finder suggests the Riyadh
  headquarters ("please contact our Riyadh headquarters"). That is a routing assumption, not a stated policy.
- The **finder option "Lease or invest"** maps to MOBCO Real Estate Development, because of its
  leasing/property-management activity. The original spec said "invest".

## Imagery
- Images in the company profiles are labelled **"Representative imagery"**. They do **not** claim that a
  company delivered the project shown:
  - Construction uses `sub-construction-hero` (from the client's Construction page). The blueprint/on-site
    compare slider is a treatment of the same photo.
  - Developments uses `sub-developments-hero` and `eastmain`. Linking Eastmain and Victoria 101 to MOBCO
    Developments is an inference flagged in `site-data.js`. The facts strip lists them because the data file
    does.
  - Real Estate uses `sub-real-estate-office` (office interior). `sub-real-estate-hero` shows a "MOBCO
    Developments" sign, so it is used only as a hero strip and not inside the Real Estate profile.
  - Education uses `campus` (the "Innovation Campus" render; the name is descriptive and the project is
    unconfirmed).
- **Hero strips:** `sub-construction-hero`, `sub-developments-hero`, `sub-real-estate-office`, `campus`. They are
  decorative (`alt=""`).
- **"Selected group projects"** under Construction shows four real portfolio entries (As Safiyyah Museum and
  Park, Raffles Hotel & Branded Residence, Al-Moosa Specialist Hospital, NEOM Bay Airport). They are labelled as
  *group* projects and are not attributed to MOBCO Construction specifically. The client can choose others in
  `WORK` in `subsidiaries.js`.
- **Capabilities images:** Raffles Hotel, Headquarter Tower and As Safiyyah are captioned with their project
  names (real portfolio). The office interior is captioned "Representative imagery". The hospitality panel lists
  every project with `category: 'hospitality'` (currently 9).

## Links and assumptions
- Contact CTAs use `contact.html?company=<subsidiary id>#inquiry`. The finder adds `&office=ksa|egypt`. If the
  contact page ignores these parameters, they are harmless (see the request).
- "Full company profile" links point to `mobco-construction.html`, `mobco-developments.html` and
  `mobco-real-estate.html` (`SUBSIDIARIES[].page`). Elite Education has no page, so its link goes to
  `projects.html?sector=education`.
- Cross-page anchors work in both styles: the section ids `#construction`, `#developments`, `#real-estate`,
  `#education`, and the data ids used by the footer and search, `#mobco-construction`, `#mobco-developments`,
  `#mobco-real-estate`, `#elite-education`. Both scroll to and highlight the profile on load, on click and on
  `hashchange`.
- The CTA band links to the portfolio and 3D Studio, not to "Start a project". The footer directly below already
  carries that CTA (STYLEGUIDE §6.9).
- Arabic copy is a professional translation of the supplied English. The client should review it.
