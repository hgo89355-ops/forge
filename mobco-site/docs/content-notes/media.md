# Content notes: Media centre (`media.html`)

These are the placeholders, assumptions and backend needs on the media page. The client has to confirm, supply or approve each one.
Sources: `media.html`, `assets/js/pages/media.js` and `assets/js/data/site-data.js`, which is the single source for every project name, location and caption.

## Showreel (hero)
- The reel is built from photos only. There is no video, and the UI never says "video" or "film".
- The reel is a **curated selection of 10 scenes** from the photo library. It is not every image, because the library grew to 40+ photos. The full set is in the gallery.
  The scenes are Lagoon Villa Community (aerial), Raffles Hotel & Branded Residence, Sofitel Hotel, As Safiyyah Museum and Park, Eastmain, Al-Moosa Specialist Hospital, Re-Development of the Red Palace, Victoria 101, Innovation Campus, and the masterplan panorama. The client can choose a different set by editing `SCENES` in `media.js`.
- The kinetic words are brand lines or facts from BRIEF §2:
  - "A legacy of trust"
  - "Integrity & excellence"
  - "Shaping skylines"
  - "Elevating standards", from "Shaping skylines, elevating standards"
  - "We plan. / We build. / We manage."
  - "Three continents"
  - "Since 2001"
  - "Our global footprint"

  Each word is shown as a mood over the image. Pairing a word with a photo does **not** claim that MOBCO planned, built or managed that particular project. Once the client confirms MOBCO's role per project (see the `todo` fields in site-data), these pairings could become literal.
- Captions use `PROJECTS[].name` and `location` (or `typology` when there is no location). Captions are also re-rendered in Arabic.
- High-resolution originals are needed. Most library images are about 790–1022 px wide and are upscaled on large screens. **TODO(content):** supply images at least 2400 px wide for the hero.
- A real showreel video, if one exists, could replace or follow the image reel later.

## Gallery
- The gallery shows **every photo in the library: 49 images**. That is 44 `PROJECTS[].gallery` entries plus 5 photos from the client's subsidiary pages (BRIEF §2b) that are not in any project gallery:
  - `sub-construction-hero`: "A tower under construction above the city" (MOBCO Construction)
  - `sub-construction-render`: "Night render of a timber-clad low-rise building" (MOBCO Construction)
  - `sub-real-estate-hero`: "MOBCO Developments signage on a building façade" (MOBCO Real Estate Development page)
  - `sub-real-estate-office`: "Office interior" (MOBCO Real Estate Development page)
  - `sub-developments-hero`: "Victoria 101 — façade close-up", filed under Victoria 101 (Residential, Canada) as BRIEF §2b says

  The four subsidiary photos have their own **Group companies** filter chip. Their captions only describe what each image shows. **TODO(content):** confirm which projects these photos show, and that they may be offered to the press. The office interior may be stock photography.
- **Detail views.** The detail views for Eastmain, Victoria 101, Lagoon Villa Community, Innovation Campus and Classical Landmark are art-directed crops of the same render: the tile zooms 1.55× into the `pos` focal point. They are spread through the grid. A detail never appears before its full view, and the same project never appears within 8 tiles of itself. The lightbox shows the full image with the "(detail)" caption from the data, because the core lightbox cannot open zoomed (see requests).
- **Filters.** The filter chips come from the `PROJECT_CATEGORIES` that have images (each chip shows its count), plus Group companies and the regions in `REGIONS`. "Classical Landmark" has `category: null`, so it appears only under **All** and **KSA portfolio**.
- **Paging.** The grid shows 16 images at a time. A remainder of 4 or fewer is added to the last page, so there is never a "Show 1 more".
- **Descriptive names.** Projects with `nameIsDescriptive: true` are marked with a ◇ and a footnote saying the official name is to be confirmed. These are Lagoon Villa Community, Innovation Campus and Classical Landmark.
- **Downloads.** Each tile has a **Download JPG** link to the web-resolution file. The footnote sends requests for higher-resolution files to the media enquiries contacts. No "media team" is claimed. **TODO(content):** confirm that high-resolution originals can be supplied.
- **Image rights.** Rights and credits are not known. **TODO(content):** confirm that the renders and photos may be downloaded by the press, and whether credits or watermarks are needed.

## Brand & press kit
- The logo downloads are the existing files:
  - `logo-mobco-group.svg` and `logo-mobco-group-white.svg`
  - `logo-mark.svg`
  - `favicon.svg`, offered as the "app icon"
  - the subsidiary PNGs in `assets/img/logos/`
- These were traced from the old site, so the copy calls them "logos", not "official logos". **TODO(content):** replace them with the official master artwork (EPS/AI/PDF, CMYK/Pantone) when it is supplied.
- The group SVGs render "GROUP" as live `<text>` in Manrope. On machines without Manrope installed, the downloaded SVG will fall back to Arial. See `docs/requests/media.md`.
- There is no white version of the logo mark. On the navy preview, the page shows the navy mark inverted with a CSS filter.
- The **colour palette** values come from the BRIEF §1 tokens. The roles are site usage, not an official brand book. **TODO(content):** confirm the official brand colours and whether CMYK/Pantone references should be added.
- **Typography**: Manrope, Inter and IBM Plex Sans Arabic are the website fonts, all under SIL OFL. **TODO(content):** confirm that these are the corporate typefaces, as the print identity may differ.
- The **usage guidelines** (do / don't) are *recommended defaults*. They are marked `data-placeholder` with the visible note "to be confirmed against the official brand book". No numeric clear-space or minimum-size rules were invented. **TODO(content):** supply the brand book rules.

## Newsroom
- **No news, press releases, dates or articles are shown.** The page shows an empty state ("Stories from our sites are coming soon") with decorative ghost cards that are `aria-hidden`. **TODO(content):** supply real stories. A CMS or JSON feed is needed to publish them.
- **Newsletter form: backend needed.** The form is validated on the client side only: email format, a required consent box, and optional topics (Group news, Project updates, Careers). On submit it shows a success panel and a toast, and **nothing is sent or stored**. To go live it needs:
  - a mailing-list provider or endpoint
  - double opt-in
  - a privacy-policy link next to the consent box. **TODO(content):** provide the privacy policy URL.
- **Media enquiries** uses only the BRIEF contacts:
  - KSA (HQ, Riyadh): info.ksa@mobco-group.com, +966 11 293 5966
  - Egypt (Cairo): info.egy@mobco-group.com, 02-23866591 and 02-23866592

  There is no dedicated press office address. **TODO(content):** supply one if a press@ address or a named media contact exists. No people are named.
- No social links are shown, because none were supplied.

## SEO / misc
- The canonical and OG URLs use the placeholder domain `https://mobco-group.com/media.html` (TODO(deploy)). The OG image is the shared `og-default.jpg`.
- The Arabic copy is a professional translation and should be reviewed by the client.
