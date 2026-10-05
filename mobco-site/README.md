# MOBCO Group website

A static, bilingual (English / Arabic with full RTL) marketing site for MOBCO Group. It is plain HTML, CSS and ES modules
with **no build step at runtime** and **no CDN**. Every library (GSAP, ScrollTrigger, Lenis, three.js) and font is
vendored under `assets/`. The only third-party request is the consent-gated Google Maps iframe on the contact page.

## Run locally

ES modules do not load from `file://`, so serve the folder over HTTP:

```bash
python3 -m http.server 8080 -d mobco-site      # from the repo root
# open http://localhost:8080/   (add ?lang=ar for Arabic, ?qa=1 to disable animations)
```

## Structure

| Path | What it is |
|---|---|
| `*.html` | Public pages: `index`, `about`, `subsidiaries`, `mobco-construction`, `mobco-developments`, `mobco-real-estate`, `projects`, `studio` (3D viewer), `media`, `careers`, `contact`, `404` |
| `styleguide.html`, `_template.html`, `demos/` | Developer-only pages (component gallery, page skeleton, a demo). `noindex`, disallowed in `robots.txt`, not in the sitemap, and nothing public links to them |
| `partials/header.html`, `partials/footer.html` | Shared header (mega menus, mobile nav) and footer. They are **inlined** into every page by `tools/build.mjs`. Never edit the copies inside the pages |
| `assets/css/main.css` | Design system: tokens, layout, typography, components, RTL. Page styles are in `assets/css/pages/<page>.css` |
| `assets/js/core/` | Shared behaviour: i18n, header, motion (Lenis/GSAP reveals), UI components, search (Ctrl/⌘+K), consent, preloader, transitions |
| `assets/js/pages/` | One module per page. The three company pages share `subsidiary.js` / `subsidiary.css` |
| `assets/js/studio/` | 3D Studio engine and the illustrative massing models (three.js, loaded through the import map in `studio.html`) |
| `assets/js/data/` | Content data: `site-data.js`, `logo-data.js`, `world-map.js` |
| `assets/img/`, `assets/icons/sprite.svg`, `assets/fonts/` | Photos (`.webp` + `.jpg` + `thumbs/`), logos, icon sprite (Lucide), fonts |
| `docs/` | `BRIEF.md` (brand, approved facts, honesty rules), `STYLEGUIDE.md` (developer contract), `content-notes/` (placeholders the client still has to supply), `requests/` |
| `tools/` | Node scripts: build, QA, generators |

## Editing content

- **Text on a page:** edit the page HTML. English is the element text; Arabic goes in attributes on the same element:
  `data-ar` (text), `data-ar-html`, `data-ar-placeholder`, `data-ar-aria-label`, `data-ar-alt`, `data-ar-title`,
  `data-ar-content` (meta). See `docs/STYLEGUIDE.md` §9.
- **Header / footer:** edit `partials/*.html`, then run `node tools/build.mjs`.
- **Structured content** lives in `assets/js/data/site-data.js`. Every string is `{ en, ar }`:
  - `PROJECTS`: 33 projects (`slug`, `name`, `category`, `region`, `location`, `featured`, `image`, `gallery`, `summary`, `studioModel`).
    Deep links are `projects.html#<slug>`. `featured: true` puts a project in the home carousel. If you change the
    number of projects, also update "View all 33 projects" in `partials/header.html` (the build fails until they match).
  - `PROJECT_CATEGORIES`, `SECTORS`, `REGIONS`: filters on the projects and media pages.
  - `SUBSIDIARIES`: the four companies (copy, facts, logos, page links). `OFFICES` / `COMPANY`: addresses, phones, emails.
    `STATS`: home counters. `PAGES` / `QUICK_LINKS`: the search index.
  - After you change projects, regenerate the static (no-JS / SEO) markup in `projects.html`: `node tools/gen-projects-static.mjs`.
- **Honesty rules:** state only the facts approved in `docs/BRIEF.md` §2. Mark missing content with `data-placeholder` plus
  `<!-- TODO(content): … -->` and log it in `docs/content-notes/`. Placeholders show a thin dashed outline on purpose, so
  the client can see what still needs their input.

## Build & QA

```bash
node tools/build.mjs                         # inline header/footer partials into every page (idempotent)
node tools/build.mjs --check                 # verify the includes are current (no writes)
node tools/check.mjs --port 8400 --shots /tmp/qa      # Playwright QA: desktop + mobile × EN + AR
node tools/check.mjs --pages about.html --port 8401   # one page
node tools/build-icons.mjs                   # rebuild the icon sprite after adding Lucide icons
```

`check.mjs` uses the globally installed Playwright (`/opt/node22/lib/node_modules/playwright`) with Chromium. It reports
console and page errors, failed requests, horizontal overflow, broken images, missing `alt`, duplicate ids, links to
missing files or anchors, and reveal content that never became visible. Read the screenshots it writes.

## Deployment

- Any static host works (Netlify, Vercel static, S3 + CloudFront, Nginx, Apache). Upload the folder as-is. There is no
  bundling step. Deploy only the runtime files: the `*.html` pages, `assets/`, `robots.txt`, `sitemap.xml` and
  `site.webmanifest`. Leave out `docs/`, `tools/`, `partials/`, `shots/` and this README. If you keep the dev pages
  (`styleguide.html`, `_template.html`, `demos/`) they are already `noindex`.
- **404:** `404.html` sits at the site root. Configure the host to serve it for missing paths (Netlify and GitHub Pages do
  this automatically; Nginx: `error_page 404 /404.html;`; Apache: `ErrorDocument 404 /404.html`). It uses relative asset
  paths, so serve it for top-level URLs or rewrite to the root.
- **Domain:** canonical / `og:url` tags, `sitemap.xml` and `robots.txt` use the placeholder `https://mobco-group.com/`
  (search for `TODO(deploy)`). Replace it with the production domain.
- **Serve `.webmanifest`** as `application/manifest+json` and `.glb` (if any are added) as `model/gltf-binary`.
  Enable gzip/brotli and long cache lifetimes for `assets/`.
- **Forms need a backend.** Nothing is sent anywhere today:
  - Contact enquiry wizard and quick form (`contact.html`) and the careers application (`careers.html`, with CV upload):
    after validation they show a success screen and open a pre-filled `mailto:` to the right team. For production,
    connect a form endpoint (e.g. Formspree, Netlify Forms, or your own API with spam protection). Careers needs file-upload
    support.
  - Newsletter (footer on every page, and on `media.html`): shows a "subscribed" toast only. Connect it to the mailing
    provider (Mailchimp, Brevo, …).
  - Cookie consent is stored in `localStorage` (`mobco-consent`). It gates only the Google Maps embed. Add analytics
    behind the same consent (`core/consent.js` → `onConsent()`).
