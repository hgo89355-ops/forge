# Shared-change requests from the About page builder

None of these block `about.html`. Where a workaround was needed, it is local and namespaced (`about-*`).

1. **`core/motion.js` → `scrollTo()` double header offset with Lenis (bug).**
   `scrollTo()` passes `offset: -(header + 16)` to `lenis.scrollTo()`. Lenis also subtracts
   `html { scroll-padding-block-start: calc(var(--header-h) + 16px) }` (it reads `scrollPaddingTop`). In-page
   anchors therefore land ~104px lower than intended on desktop (fine pointers, where Lenis is active).
   On `about.html` "Read our story" lands with `#story` at ~208px from the top instead of ~104px.
   *Suggested fix*: when Lenis is active, call `lenis.scrollTo(target, { offset: 0 })` and let it use the scroll padding,
   or reset `scroll-padding` while Lenis is active.
   *Workaround (QA pass)*: `about.js` `initAnchors()` handles `main a[href^="#"]` itself when Lenis is active
   (`scrollTo(target, { offset: 0 })` + pushState + focus); verified `#story` and `#journey` land at 104px. Remove it once core is fixed.

2. **`core/motion.js` reveal: rare missed reveal on mobile (flaky).**
   In about 1 of 4 `check.mjs` mobile runs, `[data-reveal="scale"]` on `.about-model__diagram` was reported "still hidden after scroll".
   Two immediate re-runs and the interaction script were clean. This looks like the IntersectionObserver missing a fast programmatic
   scroll when the `settle()` debounce does not fire before check.mjs inspects the page. *Suggestion*: run the `settle` check
   once more on `scrollend`, or on a 400ms timer after the last scroll event.

3. **`main.css` lists: `ul[role='list'] { margin: 0 }` beats single-class margins.**
   Its specificity (0,1,1) overrides component classes such as `.about-vm__chips { margin-block-start }` (0,1,0).
   About works around it with `body[data-page='about'] .x` selectors. *Suggestion*: wrap the reset in `:where(ul[role='list'], ol[role='list'])`
   so page and component classes win.

4. **Docs / `.parallax-frame` pattern: `<picture>` needs a height.**
   With `.parallax-frame > [data-parallax] > picture > img`, the `img { block-size: 100% }` rule does not fill the frame, because
   `<picture>` has an auto height. The image covers only part of the frame. About adds
   `.about-story__frame > [data-parallax] > picture { display:block; block-size:100% }` locally.
   *Suggestion*: add `.parallax-frame > [data-parallax] > picture { display:block; block-size:100% }` to main.css.

5. **Logical `inset-inline-*` + `direction: ltr` on the same element.** (FYI, no change needed.)
   Logical insets resolve against the element's *own* direction. Giving a positioned numeral both `direction:ltr` and
   `inset-inline-end` pins it to the physical right in RTL. Worth one line in STYLEGUIDE §10.

6. ~~**`partials/header.html` (latest revision) links to `mobco-construction.html`, `mobco-developments.html`,
   `mobco-real-estate.html`** (mega menu + mobile nav). These files don't exist yet, so `check.mjs` reports 3 "link to missing
   file" errors on every page built with the new header (desktop EN run). They aren't from About content. Please either add them to
   `PLANNED` in `tools/check.mjs` (so they become warnings) or make sure those pages land.~~ Resolved: the three pages now exist.

7. **`main.css` accent `<em>` on light sections fails AA for large text (QA pass).**
   `--teal-600` (#3fa89c) on white is 2.88:1 and on `--sand-50` 2.68:1; WCAG needs 3:1 even for large headings.
   Affects every `.h1/.h2/.display em` on white/sand sections site-wide (About: "of trust", "and how", "& excellence",
   "three continents", "core value"). *Suggestion*: use `#2f9488` or darker (≥ 3.1:1 on sand) for heading accents on light
   sections, keeping `--teal-600` for decorative lines. Not overridden locally so About stays consistent with other pages.
