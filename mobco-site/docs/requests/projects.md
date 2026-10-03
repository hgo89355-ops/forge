# Shared-change requests from projects.html

All items below are already worked around locally in projects.css / projects.js; nothing is blocked.

1. **core/motion.js — same-page anchor smooth-scroll swallows `projects.html#<slug>` links.** Its delegated click
   handler `preventDefault()`s any same-page hash link whose id exists and uses `pushState`, so no `hashchange` fires.
   Pages that use hash deep links for overlays can't react. Workaround: projects.js listens in the capture phase and
   handles project slugs first. Request: skip links with `[data-no-scroll]`, or dispatch a `hashchange`-like event.
2. **core/ui.js — modal reopen race.** `closePanel()` sets `el.hidden = true` 650 ms later via `setTimeout`; if the same
   modal is reopened inside that window it gets hidden while "open". Request: cancel the pending timer in `openPanel()`.
3. **i18n — `data-ar-aria-roledescription`** is not supported (projects.js sets the viewer stage's roledescription from JS).
   Request: add `aria-roledescription` to the ATTRS list.
4. **Consent banner over modals.** `--z-consent` (480) sits above modals (300), so the banner covers the bottom of
   full-screen overlays (the viewer's mode buttons) on a first visit. Request: lower the banner below `--z-modal`, or
   hide it while `html.is-locked`.
5. **icon-btn--sm is 40 px** (< 44 px touch target). projects.css bumps it to 44 px locally where used.
6. **Header mega menu** still lists only the five original projects. Suggest featuring a few of the 14 `featured`
   projects (with real photos), all linking `projects.html#<slug>` (the projects page opens its viewer for every slug).
7. **site-data.js**: `classical-landmark` has `category: null`; if the client confirms it is the Red Palace
   (see that project's todo), merge them or set a category so it appears under a tab.
8. **circular-carousel.js (no changes made)**: nice-to-haves — expose `item.data` on the `onChange` callback's
   live-region label hook, and an option to let the root be wider than its container without the fit shrinking it
   (projects.css currently widens the ring container on small screens and lets the hero clip it).
