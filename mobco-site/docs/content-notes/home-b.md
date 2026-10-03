# Content notes: HOME, Part B (sections 6–11)

Owner: home-b builder. Files: `partials/home-b.html`, `assets/css/pages/home-b.css`, `assets/js/pages/home-b.js`.
These notes cover only Part B. Part A's notes live in `docs/content-notes/home.md`; please merge this file there or link to it.

## Verbatim facts used (BRIEF §2)
- **Sectors framing**: "MOBCO Group has successfully delivered iconic projects ranging from skyscrapers and commercial malls to residential compounds, governmental and educational institutions, and luxury hotels." This sentence comes from WHO WE ARE. "MOBCO Group" was used as the subject so the sentence stands on its own.
- **Footprint**: "OUR GLOBAL FOOTPRINT — Innovating across borders, building excellence across continents"; "GLOBAL LEADERS IN INNOVATION" (used as the eyebrow) together with its body sentence.
- **Region blurbs**: the KSA, Egypt and Canada blurbs are used verbatim in the side card.
- **Values intro**: "Our core values of safety, integrity and excellence define our work ethic …" is used verbatim.
- **Contact lines in the CTA**: the KSA phone number, info.ksa@ and info.egy@ addresses.

## Generic or assumed copy (client to confirm)
- **Sector card descriptions** (8): these are generic capability lines taken from `SECTORS` in site-data. They are hidden on phones.
- **Headline "Expertise across eight sectors"**: the count of 8 is the 6 sectors in the WHO WE ARE sentence plus medical and business. The last two come from "commercial, medical, business, and educational facilities".
- **Sector cards link to `projects.html?sector=<id>`**: the projects page must honour this parameter.
- **Map marker labels and metadata**: "Riyadh" (HQ), "Cairo" (regional office), "Port Whitby" (project).
  - The badges read "Headquarters · Riyadh", "Regional office · Cairo" and "Project · Ontario".
  - The coordinate readout uses the approximate marker coordinates from `world-map.js` and is shown with "≈ …".
- **KSA region image**: `ksa-landmark` is the old site's KSA card image. Its project name is unknown.
- **"Selected work across three continents"**: "three continents" is a fact. Calling these five projects "selected" or "featured" is editorial.
- **Slide sub-captions** ("Villas, lagoons & a tree-lined boulevard", etc.): these describe what each render shows. The "as rendered" caveat lives in the project data.
- **3D Studio teaser features**: "Orbit & zoom through 360°", "Illustrative massing models of featured projects", "Runs in the browser — no plug-ins".
  - These must match the final studio. Adjust them if the studio does not offer orbit or zoom, or does not have a model for every project.
  - The UI states: "Models are illustrative massing studies, not as-built representations."
- **The axonometric drawing in `#studio-embed`** is a generated, illustrative massing study and not Eastmain's real design.
  - It is labelled "Illustrative massing — not to scale".
  - Its labels (Retail / Office / Clinic) follow Eastmain's verbatim programme, but the floor counts and proportions are invented for illustration only.
- **Value descriptions** (Safety / Integrity / Excellence): these come from `VALUES` in site-data.
  - The Integrity and Excellence lines paraphrase the verbatim mission and story text.
  - The Safety line is generic copy.
- **CTA lead**: "From pre-construction planning to delivery and facility management, our teams in Riyadh and Cairo are ready to help." This is generic, built from the capability list and the office locations.

## Descriptive project names (nameIsDescriptive)
Each is marked with `<!-- TODO(content) -->` in the markup:
- **Lagoon Villa Community** (`aerial-compound`), **Innovation Campus** (`campus`) and **Classical Landmark** (`ksa-landmark`, region KSA inferred).
- The client must supply the real name, location, use and status for each.

## Not stated (on purpose)
- No clients, dates (other than 2001), specs, areas, storeys, awards or testimonials.
- Project statuses are unknown and are not shown.
