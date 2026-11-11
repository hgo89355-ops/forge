# forge

Client and studio web work by Hamza Mounes.

This branch (`claude/sharp-sagan-n45d40`) holds the **MOBCO Group website** in [`mobco-site/`](mobco-site/). Other
branches in this repository are separate projects (Claude Code skill packs, tools and experiments) and do not touch it.

## MOBCO Group website

MOBCO Group is a construction, real estate and education group founded in 2001, with offices in Riyadh and Cairo.
The site is its bilingual marketing website:

- **English and Arabic** on every page, with full right-to-left layout for Arabic (`?lang=ar`).
- **12 pages:** home, about, subsidiaries, the three company pages, projects (33 projects), Explore in 3D, media,
  careers, contact and 404.
- **Explore in 3D:** interactive three.js models of five projects, by day and by night.
- **Plain static site:** HTML, CSS and ES modules. No build step to run it, no framework, no CDN. Every library
  (three.js, GSAP, Lenis) and font is stored under `mobco-site/assets/`.

### Run it locally

ES modules do not load from `file://`, so serve the folder over HTTP:

```bash
python3 -m http.server 8080 -d mobco-site
# then open http://localhost:8080/   (add ?lang=ar for Arabic)
```

On a Mac or Windows PC without a terminal, double-click `Start Website (Mac).command` or
`Start Website (Windows).bat` inside `mobco-site/`. Each starts the same local server and opens the browser.

### Put it online

Upload the **contents** of `mobco-site/` to any static web host, so that `index.html` sits at the top level. Nothing
runs on the server. The `Start Website` launchers, `docs/`, `demos/`, `tools/`, `styleguide.html` and
`_template.html` are for development only and can be left out.

### Work on it

- Header and footer live in `mobco-site/partials/`. After editing them, run `node tools/build.mjs` from
  `mobco-site/` to copy them into every page.
- Project data (names, categories, images, Arabic text) lives in `mobco-site/assets/js/data/site-data.js`.
- `node tools/check.mjs` runs the QA pass (layout, overflow, console errors, English and Arabic, desktop and phone).
  It needs Playwright.
- The full developer guide is [`mobco-site/README.md`](mobco-site/README.md), with the style rules in
  `mobco-site/docs/STYLEGUIDE.md`.
