# Studio — final site-wide QA notes (pre-demo)

Written by the site-wide QA lead. The studio files (`studio.html`, `assets/css/pages/studio.css`, `assets/js/studio/**`)
were not edited in this pass. The one exception is `node tools/build.mjs`, which re-inlined the shared header partial into
`studio.html` (one line added: an "Elite Education" link in the mobile-nav sub-list). Please keep that include as it is.

## Results on studio.html
- `check.mjs` desktop and mobile, EN and AR: 0 errors and 0 warnings when run alone. The full-site run (12 pages, concurrency 3)
  gave one intermittent error, listed as item 1 below.
- Click-through (header, mega menu, mobile nav, language toggle EN→AR→reload→EN): no console or page errors.

## Items for the studio owner
1. **Intermittent reveal (mobile EN, under load).** One full-site run reported
   `still hidden after scroll: section.section.has-gridlines > div.container > ol.studio-guide__grid > li.card.card--hover`.
   A second full-site run (concurrency 3) flagged `div.studio-keys` and `#studio-cta-title` the same way, again only on mobile EN.
   Neither happened in four standalone studio runs. It looks like a timing race: the WebGL frame on SwiftShader starves the
   scroll/reveal pass. Suggested fix: make sure the guide cards' reveal does not depend on a ScrollTrigger refresh that only
   runs after the model has loaded, or call `ScrollTrigger.refresh()` once the canvas has its final height.
2. **Live-region text stays in the old language.** The visually hidden status text (`strings.js` → `loaded`:
   "Model loaded: Eastmain") is not re-rendered on `langchange`. After EN→AR it still reads "Model loaded: Eastmain", and after
   AR→EN it reads "تم تحميل النموذج: إيست مين". Clear it or re-render it in the `langchange` handler. Screen readers only;
   nothing changes visually.
3. `models/_dev-box.js` is only reachable with `?dev=1` / `?model=_dev-box` and nothing links to it. That is fine to keep;
   just confirm it stays out of the model picker in production.
