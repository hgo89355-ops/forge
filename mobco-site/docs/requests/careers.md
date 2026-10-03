# Requests from the careers page (`careers.html`) to the foundation

Each item is already worked around locally in `assets/css/pages/careers.css` / `assets/js/pages/careers.js`;
nothing shared was edited.

## 1. BUG — `core/ui.js` duplicates error messages for `.check` checkboxes
`errorEl(el)` looks for an existing `.field__error` **inside** the wrapper (`label.check`), but appends the new one to
the wrapper's **parent**. So the lookup never finds it and every validation (focusout/change/submit) appends another
`<p class="field__error">`; stale messages stay on screen even after the box is ticked (seen in styleguide pattern too).
**Suggested fix** (ui.js `errorEl`):
```js
const host = w.classList.contains('check') ? w.parentElement : w;
let err = host.querySelector(':scope > .field__error');
if (!err) { err = document.createElement('p'); err.className = 'field__error'; host.appendChild(err); }
```
Same issue would affect `.check--radio` groups (one error per radio). Workaround on careers: the consent checkbox sits
in a `div.field` with a page-local `label.careers-check` (the radio group uses `fieldset.field`).

## 2. BUG — select chevron points sideways in RTL
`.field--select::after` draws the chevron with `border-inline-end` + `border-block-end` and `rotate(45deg)`; in RTL the
logical borders flip to the left side, so the chevron points left/right instead of down.
**Suggested fix** (main.css): `[dir='rtl'] .field--select::after { transform: rotate(-45deg); }`.
Workaround: same rule scoped to `body[data-page="careers"]`.

## 3. Forms — long `<select>` options overflow narrow containers
`.field` is `display:grid` with an implicit `auto` track and `.form__row` has no explicit mobile columns, so a select
whose longest option is wide (e.g. "Engineering (civil, structural, MEP)") forces the form wider than its card at
360px. **Suggested fix** (main.css): `.field { grid-template-columns: minmax(0, 1fr); } .field__input { min-inline-size: 0; }
.form, .form__row { grid-template-columns: minmax(0, 1fr); }` (then the existing `--2/--3` rules at ≥768px).
Workaround: scoped under `.careers-form`.

## 4. Range output ignores language changes
`setupRange` writes `${data-prefix}${value}${data-suffix}` once per input; suffixes cannot be localised and the output
is not re-rendered on `langchange`. **Suggestion:** support `data-suffix` + `data-ar-suffix` and re-run `update()` in
`onLang`, or dispatch a `rangeformat` hook. Workaround: careers.js formats the output (incl. Arabic plurals) and sets
`aria-valuetext`.

## 5. Optional — reusable pieces that other pages could use
- **Data**: a `DISCIPLINES` array (id, category, icon, `{en,ar}` title/description/focus) currently lives in
  `careers.js`. If search should index disciplines (keywords "BIM", "HSE", "quantity surveyor"…), consider moving it to
  `data/site-data.js` and adding a search group.
- `PAGES.careers.keywords` could add `bim`, `hse`, `quantity surveying`, `procurement`, `facility management`
  (+ Arabic) so ⌘K finds the careers page for those queries.
