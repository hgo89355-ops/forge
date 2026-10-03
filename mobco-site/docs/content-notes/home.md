# Content notes — Home page, Part A (`index.html` hero → stats)

Owner: home-A builder. Sections: hero slider, Who we are, Subdivisions, We plan · We build · We manage, Stats.
Part B (sections after the stats band) keeps its own notes in `docs/content-notes/home-b.md`.

## Verbatim client copy used (BRIEF §2)
- Hero slide 1: "INTEGRITY & EXCELLENCE" / "A LEGACY OF TRUST".
- Hero slide 2 title: "SHAPING SKYLINES, ELEVATING STANDARDS"; slide 3: "WE PLAN. WE BUILD. WE MANAGE."
- Hero info panel: "Our core values of safety, integrity and excellence define our work ethic and guide our workforce in
  today's rapidly changing and challenging world."
- Who we are: eyebrow, title and the full paragraph, unchanged.
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
- **Subsidiary descriptions** on the tiles are `SUBSIDIARIES[].short`. These are generic and need client confirmation;
  see the `todo` field on each entry in site-data.js.
- **Plan / Build / Manage panels** come from `CAPABILITIES`. They contain generic capability copy for a construction
  group, such as "Pre-construction planning" and "MEP coordination", not client-stated services. Please confirm.
- **Blueprint → Render visual.** This is an art-directed treatment of the `aerial-compound-portrait` render: a
  grayscale/grid "blueprint" layer is revealed as the colour render while the user scrolls. It is illustrative only and
  is not a real drawing of the project.
- **Stats band background** is the `ksa-landmark` render (Classical Landmark, a descriptive name), used decoratively and
  without a caption.
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
