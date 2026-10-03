# Shared-file requests from the media page builder

All of these are worked around locally in `media.css` / `media.js`. None of them blocks the page.

1. **White logo mark asset** (`assets/img/logo-mark-white.svg`).
   - Problem: the press kit has to show and offer the mark on navy. There is only a navy file today.
   - Workaround: the navy-preview card uses `filter: brightness(0) invert(1)`, and only the navy file can be downloaded.
   - Request: add a white version and I will add it as a download.

2. **Outline "GROUP" text in the downloadable logo SVGs** (`logo-mobco-group*.svg`).
   - Problem: "GROUP" is a live `<text>` element in Manrope. Once the file is downloaded and opened without Manrope installed, it falls back to Arial and the letter-spacing shifts.
   - Request: convert the text to paths in the downloadable files. The inline `LOGO` data can stay as it is.

3. **Chip touch target** (`main.css` `.chip`).
   - Problem: `min-block-size` is 40px, below the 44px target in BRIEF §4.
   - Workaround: the media gallery filter chips are overridden locally to 44px.
   - Request: consider 44px globally.

4. **Lightbox caption on language switch** (`core/ui.js`).
   - Problem: the open lightbox renders its caption, counter label and button labels once. If the language changes while the lightbox is open, they stay in the old language until the next image.
   - Request: re-render `lbRender` / the labels on `langchange`.

5. **Optional: `openLightbox` focal crop** (`core/ui.js`).
   - Problem: the gallery's detail crops open the full render in the lightbox.
   - Request: an optional `item.focus = 'x% y%'` that starts zoomed at that point would make the "(detail)" items meaningful. Alternatively, the foundation could export real crop files.

6. **`tools/check.mjs` warnings** about `projects.html#<slug>` anchors.
   - Problem: the shared mega menu links to these anchors, so the warnings appear on every page.
   - Note: the projects page should render those ids statically, or the checker should accept JS-rendered ids. This is not a media-page issue.
