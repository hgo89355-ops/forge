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

7. **Accent `<em>` contrast in headings on light sections** (`main.css`).
   - Problem: `.h2 em` on white or sand uses `--teal-600` (#3fa89c). On white that is 2.88:1, below the 3:1 AA minimum for large text (measured on "Every detail" at 56px).
   - Workaround: none. The media page keeps the shared style so the headings match every other page.
   - Request: use `--teal-700` for heading accents on light sections, or darken `--teal-600` slightly.

8. **Note for the foundation: the `--focus` token name.** `:focus-visible` uses `outline: 2px solid var(--focus)`. If a component sets its own custom property called `--focus` (for example a focal point), the shorthand becomes invalid and the focus ring disappears without any error. The media page hit this and has renamed its property to `--focal`. Consider a more specific token name such as `--focus-ring`, and a note in STYLEGUIDE §3. A `var()` fallback would not help, because the overriding value is set but is not a colour.
