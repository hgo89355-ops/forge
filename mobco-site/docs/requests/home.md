# Requests from the Home page, Part A builder

Each item below already works through a local, namespaced (`ha-`) workaround in `home.css` or `home.js`. These are
suggestions for the foundation to add shared support. None of them block the page.

1. **`.parallax-frame` picture height (main.css §10).**
   The rule `.parallax-frame > [data-parallax] img { block-size: 100% }` has no effect when the `<img>` is wrapped in a
   `<picture>`, because the picture's height is auto. The image then keeps its intrinsic ratio and leaves an empty navy
   band. Suggested fix: add `.parallax-frame > [data-parallax] picture { display:block; block-size:100%; }`.
   - Workaround: `.ha-about__media [data-parallax] picture, .ha-stats__bg [data-parallax] picture { block-size: 100% }`.
   - The styleguide's parallax demo probably has the same gap.

2. **Logical insets on vertical text (documentation note).**
   An element with `writing-mode: vertical-rl` resolves its own `inset-inline-*` against the vertical axis. To place a
   vertical badge, use an outer element in horizontal mode and put the vertical text on an inner element. This is what
   `.ha-about__badge` and `.ha-about__badge-in` do. A short note in STYLEGUIDE §10 would help other builders.

3. **Optional shared "hero slider" component.**
   `initHero()` in `home.js` could become a core component, e.g. `[data-slider]` with wipe, split titles, autoplay,
   pause, swipe and aria-live, if other pages need one. It is not needed now.

4. **Autoplay and `prefersReducedMotion()`.**
   The home hero does not autoplay under reduced motion or `?qa=1`, because `prefersReducedMotion()` returns true in QA
   mode. As a result, `check.mjs` without `--qa` shows autoplay running, and screenshots may land on a later slide.
   This is expected. No change requested.

5. **Note for Part B (`home-b`), FYI only.**
   On an earlier run, `#hb-projects .carousel--bleed` overflowed the 390px layout viewport (scrollWidth 402). The
   latest run is clean. The overflow came from the shared `.carousel--bleed` rule, so it may be worth keeping an eye on
   at 360px.
