# Content notes — Home page (`index.html`)

This file covers the whole home page. Part A (hero → stats) is detailed below. Part B (sectors → closing CTA) is
detailed in `docs/content-notes/home-b.md`. Where the two files disagree, the **Integration QA** section at the end of
this file is the current state.

## Verbatim client copy used (BRIEF §2)
- Hero slide 1: "INTEGRITY & EXCELLENCE" / "A LEGACY OF TRUST".
- Hero slide 2 title: "SHAPING SKYLINES, ELEVATING STANDARDS"; slide 3: "WE PLAN. WE BUILD. WE MANAGE."
- Hero info panel: "Our core values of safety, integrity and excellence define our work ethic and guide our workforce in
  today's rapidly changing and challenging world."
- Who we are: eyebrow and title unchanged. The paragraph is **split across the page** (see Integration QA): sentences 1
  and 3 sit in Who we are; sentence 2 (the sector list) frames the Sectors section.
- Stats: 25+ years of experience · 10,000+ talented professionals · 430+ projects delivered · 600+ engineers & technicians.
- Subdivision names (from the logos): MOBCO Construction, MOBCO Developments, MOBCO Real Estate Development,
  Elite Education Group.

## Copy derived from brief facts (please confirm the wording)
- Hero slide 4 title "ACROSS THREE CONTINENTS" (from "across three continents"). Its eyebrow lists
  "Saudi Arabia · Egypt · Canada", the three regions in the brief.
- Hero eyebrows on slides 2–3: "Since 2001" and "Construction · Development · Project management", taken from
  "Founded in 2001" and "real estate construction, development, and project management".
- Who-we-are fact list: Founded "2001, Saudi Arabia" · Presence "KSA · Egypt · Canada" · Specialisms
  "Construction · Real estate development · Education".
- Subdivisions intro: "A privately owned, vertically integrated group specialising in construction, real estate
  development and education." This paraphrases the story paragraph.
- Stats heading "Two decades. Three continents." and lead "Projects delivered on time, within budget and to the highest
  quality standards — for over two decades." Both paraphrase the brief.
- Pagination labels and section eyebrows ("How we deliver", "The Group", "MOBCO in numbers") are UI copy only.

## Placeholders, assumptions and descriptive names
- **Descriptive project names.** The hero "Featured project" captions and the Who-we-are figure caption use
  **Lagoon Villa Community** (`aerial-compound`) and **Innovation Campus** (`campus`). Both are descriptive names
  (`nameIsDescriptive: true` in site-data), so the client must supply the real names, locations and status. The captions
  say "Aerial render" or "Campus" rather than a city.
- **Eastmain** (New Cairo, Egypt) and **Victoria 101** (Port Whitby, Canada) are real names and locations from the brief.
- **Subsidiary descriptions** on the tiles are `SUBSIDIARIES[].short`. Construction, Developments and Real Estate are now
  verbatim from the client's subsidiary pages (BRIEF §2b): "438 projects / four continents" and "Established 2002" are
  not shown on home. **Elite Education** ("The group's education arm.") is still generic: client to confirm.
- **Plan / Build / Manage panels** come from `CAPABILITIES`. They contain generic capability copy for a construction
  group, such as "Pre-construction planning" and "MEP coordination", not client-stated services. Please confirm.
- **Blueprint → Render visual.** This is an art-directed treatment of the `aerial-compound-portrait` render: a
  grayscale/grid "blueprint" layer is revealed as the colour render while the user scrolls. It is illustrative only and
  is not a real drawing of the project.
- **Stats band background** is the `maad-towers-voco` portfolio photo, used decoratively (aria-hidden, no caption).
- **Stats discrepancy.** Home shows 430+ projects delivered; the About narrative says "more than 150 projects". Both are
  kept as written (BRIEF §2).
- **JSON-LD Organization.** `url`, `logo` and `image` use the placeholder domain `https://mobco-group.com/`, marked
  `TODO(deploy)`. Two PostalAddresses are given: the KSA HQ and Egypt (Mivida). The Nasr City address is omitted from
  the schema but stays on the contact page and footer. `subOrganization` lists the four subsidiaries by name only.
- No `data-placeholder` elements were needed in Part A, because every visible string is either a brief fact or generic
  copy.

## Arabic
All Arabic is a professional MSA translation. Strings that already exist in site-data.js are reused verbatim. New
strings for the client to review:
- «منذ عام 2001»
- «الإنشاءات · التطوير · إدارة المشاريع»
- «عبر ثلاث قارات»
- «مشروع مميّز»
- «شركات موبكو التابعة»
- «مجموعةٌ خاصة متكاملة رأسيًا…»
- «منهجيتنا»
- «أكثر من عقدين. ثلاث قارات.»
- «موبكو بالأرقام»
- «مخطّط / تصوّر»
- «المرحلة»


## Integration QA (Parts A + B joined) — current state
Changes made during the integrated review so the page reads as one experience without repeating itself:
- **No repeated paragraphs.**
  - The "Who we are" paragraph is split. Sentences 1 ("MOBCO Group is a leading name…") and 3 ("Explore how MOBCO Group
    sets the standard…") are in Who we are. Sentence 2 ("…delivered iconic projects ranging from skyscrapers…") is the
    Sectors statement (it starts at "MOBCO Group has successfully delivered…"). Nothing is reworded.
  - The verbatim core-values sentence now appears only once, in the hero info panel (spec). The Values section intro is
    UI copy: "Three principles behind every project we plan, build and manage — on every site, in every country."
    («ثلاثة مبادئ تقف وراء كل مشروع نخطّطه ونبنيه ونُديره — في كل موقع، وفي كل بلد.») Client to confirm.
- **One closing CTA.** The home page ends with Part B's "Have a project in mind?" panel; the footer's generic
  "Let's build what's next" block is hidden on this page only (home.css). See docs/requests/home.md.
- **Featured projects carousel = `featured: true` projects** (BRIEF §2b says featured projects are "shown in the home
  carousel"). 10 slides: Eastmain, Victoria 101, Sofitel Hotel, As Safiyyah Museum and Park, NEOM Bay Airport —
  International Flight Reconfiguration, Re-Development of the Red Palace, Al-Moosa Specialist Hospital, Raffles Hotel &
  Branded Residence — Main Works Package, Taif Municipality Building, Sulaiman Fakeeh Hospital.
  - Names, categories and locations come from `PROJECTS` / `PROJECT_CATEGORIES`. For the KSA portfolio projects the
    location "Saudi Arabia" is **assumed in site-data** (`todo`: "Region assumed Saudi Arabia… city not stated"). Each
    slide carries a `TODO(content)` comment; the client should confirm.
  - The three descriptive renders (Lagoon Villa Community, Innovation Campus, Classical Landmark) were dropped from the
    carousel: they already appear in the hero, Who we are, Plan/Build/Manage and the KSA region card, and real
    portfolio photography is stronger proof. They remain featured in the mega menu and on projects.html.
  - Portfolio slides say "From our portfolio" (no 3D chip: no studio model exists for them).
  - The Part B suite's hard-coded check "cards link to the five slugs" is now expected to fail.
- **Image variety.** The same four renders were each used 3–4 times. Stats band → `maad-towers-voco`; closing CTA →
  `sub-construction-hero` (tower under construction, also the MOBCO Construction hero). Both are decorative.
- **Headings.** Part A's section titles now carry the same teal `<em>` accent as Part B's ("…<em>elevating
  standards</em>", "MOBCO's <em>subdivisions</em>", "Two decades. <em>Three continents.</em>").
- **Discrepancies kept as stated (BRIEF §2/§2b):** 430+ projects (stats) vs "more than 150" (About) vs 438
  (Construction page); "three continents" (home) vs "four continents" (Construction page). Home shows only 430+ /
  three continents.
