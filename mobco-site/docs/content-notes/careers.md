# Careers page — content notes (`careers.html`)

Owner: careers builder · Files: `careers.html`, `assets/css/pages/careers.css`, `assets/js/pages/careers.js`.

## 1. Verbatim client facts used (BRIEF §2)
| Where | Fact |
|---|---|
| Hero stats | **10,000+** talented professionals · **600+** engineers & technicians (labels from `STATS`) |
| Hero lead | founded **2001**; "creative, innovative, people-oriented"; sectors construction, development, education, facility management (KSA blurb) |
| Hero towers | "We plan. We build. We manage." (`COMPANY.motto`) |
| Why MOBCO quote | "MOBCO Group is a creative, innovative, and people-oriented organization providing individual opportunity, personal satisfaction, and rewarding challenges to all members of the firm." (Vision, verbatim, + Arabic from `COMPANY.vision`) |
| Why MOBCO values line | "Our core values of safety, integrity and excellence define our work ethic and guide our workforce in today's rapidly changing and challenging world." (verbatim) |
| Image badge | **25+** years of experience |
| Benefit cards | sectors list (skyscrapers, commercial malls, residential compounds, governmental & educational institutions, luxury hotels); "on time, within budget and to the highest quality standards" (About narrative) |
| Locations | KSA office (HQ) & Egypt office addresses/phones exactly as BRIEF; careers emails **careers@mobco-group.com** (KSA) and **hr.egy@mobco-group.com** (Egypt) via `CAREERS` |

## 2. Generic / assumed copy — client to confirm
All of the following is generic capability copy written to be obviously true for a construction group. Nothing
here names a vacancy, salary, benefit package, person, award or certification.

- **Benefit cards (4)** — "Individual opportunity", "Personal satisfaction", "Rewarding challenges",
  "People-oriented culture": derived from the vision sentence; supporting lines are generic.
- **Disciplines (8)** — Engineering (civil, structural, MEP) · Project management & controls · Quantity surveying &
  commercial · Health, safety & environment (HSE) · Design & BIM · Procurement · Facility management · Corporate
  functions. Short and long descriptions and the "Typical areas of work" lists are generic (several items reuse
  `CAPABILITIES` wording). **These are disciplines, not vacancies** — the UI says so in the section lead, the drawer
  note and FAQ 01. Client to confirm the list (add/remove disciplines) and wording.
  - Drawer header images are re-used project renders under the blueprint treatment (decorative, `alt=""`); they do
    not imply that discipline worked on that project.
- **Hiring journey (5 steps)** — Apply → Review → First conversation → Interviews → Offer & onboarding.
  Generic; marked `<!-- TODO(content): client to confirm the actual hiring stages -->` in markup and the section lead
  says "Exact steps can vary by role and location".
- **FAQ (6)** — generic and honest. FAQ 06 ("What happens after I apply?") is marked
  `<!-- TODO(content): client to confirm response process / timelines -->`. No response-time promise is made.
- **Experience stages** shown next to the slider (Early career 0–2 · Experienced 3–7 · Senior 8–14 · Leadership 15+)
  are UI helpers only, not company grades.
- **Country dial codes** in the phone field: a short list of common codes + "Other code". Client may want a full list.
- **Map** — illustrative (labelled "Illustrative map"); coordinates readout uses the approximate `OFFICES[].geo`
  values (`approx: true`), shown with "≈".

## 3. Placeholders (`data-placeholder`)
None — no visible placeholder blocks were needed on this page.

## 4. Backend need (important)
The site is static, so **the application form does not upload anything**:
- On a valid submit the page shows a success panel and opens a **pre-filled `mailto:`** to the right team
  (`careers@mobco-group.com` for KSA, `hr.egy@mobco-group.com` for Egypt) with subject
  `Job application – <discipline> – <name>` and a body containing name, email, phone (dial code + number), location,
  discipline, experience, LinkedIn, CV file name and the cover note (cover note trimmed to ~700 chars to keep the
  mailto URL short). Subject/body are written in the visitor's current language (EN/AR).
- Browsers cannot attach files to `mailto:` — the success panel (and the form note + FAQ 04) tell the visitor to
  attach their CV before sending, and offer "Open email again", "Copy email address" and a direct mail link.
- **Recommended for production:** replace with a real endpoint (ATS or serverless function + storage) that accepts
  `multipart/form-data` (fields: `name, email, dialCode, phone, linkedin, location, discipline, experience, note,
  consent, cv`), virus-scans the CV, routes by `location`, stores consent with a timestamp and sends an
  acknowledgement email. A privacy notice / retention policy link should then be added next to the consent box.
  The JS hook is the `validsubmit` listener in `assets/js/pages/careers.js` (`initForm`).

## 5. Cross-page contracts (for other builders)
- Deep links: `careers.html?discipline=<id>&location=ksa|egypt#apply` preselects the form (and the office tab).
  Discipline ids: `engineering`, `project-management`, `quantity-surveying`, `hse`, `design-bim`, `procurement`,
  `facility-management`, `corporate`, `other`.
- Anchors: `#why`, `#disciplines`, `#locations`, `#journey`, `#apply`, `#faq`.

## 6. Notes
- The page uses home-page stats (10,000+, 600+) only; it does not repeat the 430+/150 project counts.
- No social-media links, testimonials, employee names/photos, benefits packages, salaries or certifications are shown.
- TODO(content): real photography of MOBCO people/sites would greatly strengthen this page (currently only project
  renders exist — used in the hero "skyline", the Why image and as textures).

## 7. QA review (fresh-eyes pass) — changes
- Benefit panels: the expanding-panel layout now starts at **1200px** (it was 1024px). Below that, the panels show as a
  2-column grid (640–1199px) or stacked cards. At 1024px the collapsed panels were too narrow, and the numerals ran into the icons. Titles
  now share one baseline; the supporting copy sits at the bottom of the panel.
- Form: the phone + LinkedIn row uses a container query on the form card. It splits into two columns only when the
  card is ≥700px wide, which fixes the truncated "Country code" and "Phone number" labels at 1024–1199px.
- Map: removed the meaningless "02" label from the map header. Office tags now slide to stay inside the frame on narrow
  maps; the pin stays on the city.
- Hiring journey: step columns are top-aligned, so titles no longer drift when one step's text wraps to more lines (seen in AR).
- Disciplines (mobile): compact cards (no fixed 300px height) to cut scrolling.
- Drawer: shorter "Apply now" label under 480px (the long label was clipped). A polite live region announces the
  discipline when moving with prev/next. The placeholder heading has its Arabic text.
- FAQ: "Still have a question?" now follows the questions on small screens (three-area grid on desktop).
- Hero: the height cap is raised to 1200px, so 1080p screens get a full-bleed hero. Buttons go full width under 480px.
