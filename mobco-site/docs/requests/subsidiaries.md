# Shared-change requests — Subsidiaries page

Each item has a local workaround already in place in `subsidiaries.js` / `subsidiaries.css`.

1. **core/motion.js: deep links land one header-height too low when Lenis is active.**
   `scrollTo(element)` passes an element target to `lenis.scrollTo` with `offset: -(header + 16)`. Lenis also
   subtracts `html { scroll-padding-top }`, which main.css sets to header + 16. When the hash is the `:target`, it
   also subtracts main.css `:target { scroll-margin-top }`. Measured on desktop: anchor clicks land at about 208px
   from the top instead of 104px, and deep links on load land at about 320px.
   *Fix suggestion:* in `scrollTo()`, when Lenis is active, compute a numeric y:
   `el.getBoundingClientRect().top + window.scrollY + off`, then call `lenis.scrollTo(y, …)`. Read the position
   from `window.scrollY`, not `lenis.scroll`, which lags behind a native fragment jump.
   *Local workaround:* `scrollToEl()` in subsidiaries.js. In-page links inside `<main>` are handled in the capture
   phase, which sets `defaultPrevented`, so core skips them.

2. **core/motion.js: `hashchange` is not handled.** Only the initial hash and anchor clicks are handled, so
   back/forward between in-page hashes jumps natively without the header offset. The page handles this locally
   for its company anchors.

3. **site-data.js: `SUBSIDIARIES['mobco-real-estate'].focus`** still reads "Residential development / Commercial
   assets / Asset management". The verbatim client copy now says "leasing & property management for
   multi-functional buildings". Suggest "Office leasing" (تأجير المساحات المكتبية), "Property management"
   (إدارة العقارات) and "Multi-functional buildings" (المباني متعددة الوظائف), pending client confirmation.
   *Local workaround:* `COS[].focus` override in subsidiaries.js. Remove it once the data matches. Other
   consumers of the data (search, the mobco-real-estate page, the mega menu) still show the generic list.

4. **site-data.js: Elite Education Group** has no `tagline`, `about`, `facts` or `page`. The page falls back to
   `short`/`long`. Add these when the client supplies them; the page picks them up automatically.

5. **contact.html (owner): optional query parameters.** CTAs on this page link to
   `contact.html?company=<subsidiary id>[&office=ksa|egypt]#inquiry`. It would be nice to preselect the
   company/office in the inquiry form, or ignore the parameters silently.

6. **tools/check.mjs: section screenshots on touch/mobile are taken mid smooth-scroll.**
   `html:not(.lenis) { scroll-behavior: smooth }` makes `window.scrollTo(0, y)` animate, and the shot is taken
   350ms later. Mobile `-sNN` shots therefore show half-scrolled states: the header area looks dark or empty and
   sticky elements are offset. Suggest `window.scrollTo({ top: y, behavior: 'instant' })` in the screenshot loop.

7. **icons (nice to have):** `concierge-bell` (hospitality) and `key-round` (leasing) would suit the
   capability and finder options. `hotel` and `landmark` are used for now.

