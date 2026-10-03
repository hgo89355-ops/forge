# Requests & API notes — 3D Project Studio (`studio.html`)

Owner: studio page builder. Files: `studio.html`, `assets/css/pages/studio.css`, `assets/js/studio/*.js`
(except the five model modules), `assets/js/studio/models/_dev-box.js`, `docs/content-notes/studio.md`, this file.

## 1. Shared-file requests (nothing was edited outside the studio's own files)

| # | Shared file | Request | Local workaround in place |
|---|---|---|---|
| 1 | `docs/STYLEGUIDE.md` / `_template.html` | `studio.html` loads its entry from `assets/js/studio/studio.js` (not `assets/js/pages/studio.js`). The brief's ownership table already lists `assets/js/studio/*.js`; please mention this in STYLEGUIDE §2 so nobody creates an empty `pages/studio.js`. | n/a |
| 2 | `assets/css/main.css` | Optional: a shared `.glass` surface token (`--glass-bg`, `--glass-line`, `--glass-blur`) — the studio defines `--studio-glass*` locally. | `body[data-page="studio"]` custom properties |
| 3 | `assets/js/core/ui.js` | The range helper overwrites `<output>` with the raw value on every `input`. A `data-format="none"` opt-out (or a `rangeformat` hook) would let pages format values (%/time) without racing the core listener. | The studio's own `input` listener runs after the core one and re-writes the output. |
| 4 | `assets/js/core/ui.js` tooltips | Tooltips read `data-tooltip` at show time — fine. Request: hide the tooltip on `pointerdown` too (clicking a toolbar button that opens a modal leaves the tooltip until pointer-out). | none (cosmetic) |
| 5 | Home page (`index.html` owner) | A compact studio embed is available — see §2. | — |
| 6 | `assets/icons/sprite.svg` | Nice-to-have icons: `box-select` (isolate level), `sun-moon` (time of day), `scissors`/`slice` (section). | Using `boxes`, `sun`/`sunset`/`moon`, `ruler`. |

## 2. Engine API — `createStudio(container, options)` (for a compact home-page embed)

```js
import { createStudio, hasWebGL } from './assets/js/studio/engine.js';
// the page must declare the three.js import map (see BRIEF §4)
if (hasWebGL()) {
  const studio = createStudio(document.querySelector('.home-studio__canvas'), {
    compact: true,          // lighter quality (DPR ≤ 1.5, 1024px shadows), narrower lens
    model: 'campus',        // loads immediately; studio.ready resolves when shown (null on failure)
    autoRotate: true,       // ignored under prefers-reduced-motion
    controls: false,        // no orbit / picking / keyboard — a pure turntable
    ui: false,              // no HTML is created by the engine in any case
    hotspots: false,
    quality: 'auto',        // 'auto' | 'high' | 'low'
    reducedMotion: undefined, // force true/false; default = prefers-reduced-motion
  });
  await studio.ready;
}
```
The container must be positioned and sized by CSS; the engine appends a `<canvas class="studio-canvas">` and
follows the container size (ResizeObserver, DPR changes). It pauses when the container is off-screen or the tab
is hidden. `hasWebGL()` → `false` means WebGL2 is unavailable (three r163+ requires WebGL2): show an image instead.

| Method | Description |
|---|---|
| `load(id, {instantCamera, retry})` → `Promise<meta>` | Dynamic-imports `./models/<id>.js`, builds, swaps (old model fully disposed), compiles shaders, glides the camera in. Rejects on a missing/failed module (the previous model stays). |
| `setView('aerial'|'street'|'top'|'front', {instant})` | Animated preset from `meta.camera`. |
| `setExplode(0..1)` · `setSection(0..1)` (1 = off) · `setTime(hours 6–22)` | Eased explode; section plane with teal caps; sun path from `meta.sun`. |
| `setMode('realistic'|'clay'|'blueprint'|'xray')` | Material swap (originals restored), edges for blueprint / x-ray. |
| `setAutoRotate(bool)` · `setHotspots(bool)` · `select(levelIndex|-1)` · `selectStep(±1)` | |
| `focusPoint([x,y,z])` · `focusAt(clientX, clientY)` · `zoom(factor)` · `reset()` | |
| `setInsets({left,right,top,bottom})` | CSS px covered by overlay UI; the projection centre shifts (animated) so the model frames in the free area. |
| `snapshot()` → `<canvas>` · `renderThumbnail(id, {w,h})` → `Promise<dataURL|null>` | Snapshot renders on demand (no `preserveDrawingBuffer`). Thumbnails render in a corner viewport and copy within one task (no flicker). |
| `getState()` · `on(type, cb)` → `off` · `invalidate()` · `dispose()` | Events: `loadstart`, `progress {value}`, `load {id, meta, floors, hotspots}`, `error {id, error, stage}`, `change {state}`, `frame {hotspots:[{id,x,y,visible,occluded}]}`, `hover {floor}`, `select {floor}`, `focus`, `interact`, `contextlost`. |

`studio.html` also exposes a read-only debug handle `window.MOBCO_STUDIO = { engine, ui, entries }` and dispatches
`window` events `studio:ready` (`detail: {model, ok, webgl}`, once) and `studio:modelchange` (`detail: {model}`).

## 3. Engine conventions the model modules rely on (contract clarifications)

- **Sun:** `meta.sun = {azimuth, elevation}` is the key-light direction at the studio's default time (14:30).
  Direction *towards* the sun = `(sin az·cos el, sin el, cos az·cos el)` — azimuth from **+Z towards +X**.
  The time-of-day slider moves the sun ±15°/h around it; after dusk a cool moon light takes over.
- **Lamps:** intensity at full night = `light.userData.nightIntensity` (falls back to `userData.intensity`, then
  26 for point lights / 90 for spot lights). Lamps never cast shadows.
- **Night materials:** `emissiveIntensity` is set to `night × (material.userData.__nightMax ?? 1)`.
- **Floors:** each floor group moves `level × gap × ease(explode)` with `gap = clamp(40 / maxLevel, 2.2, 6)` m.
  Meshes are mapped to the floor group that contains them; hover/selection uses the group's world box at load.
- **Site:** may be a child of `root` or a separate group; it never explodes and is never ghosted.
- **Materials:** the engine sets `clippingPlanes` / `clipShadows` on every model material and patches opaque ones
  with a back-face "cap" (teal) via `onBeforeCompile` (chained with any existing hook). Transparent / glass
  materials (opacity < 0.95 or transmission > 0.05) are not patched.
- **Thumbnails** build a second, `quality:'low'` instance of each model in idle time; `dispose()` must free it.
- three r186: `PCFSoftShadowMap` was removed — the engine uses `PCFShadowMap` (soft-filtered) with `shadow.radius`.

## 4. Dev model

`assets/js/studio/models/_dev-box.js` is a contract-conformant test model. It is not listed in the library;
reach it with `studio.html?dev=1` (adds it as item 06) or `studio.html?model=_dev-box`.
`?nogl=1` forces the no-WebGL fallback; `?perf=1` logs load/frame timings to the console.
