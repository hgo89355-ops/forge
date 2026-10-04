# Requests & API notes — 3D Project Studio (`studio.html`)

Owner: studio page builder. Files: `studio.html`, `assets/css/pages/studio.css`, `assets/js/studio/*.js`
(except the five model modules), `assets/js/studio/models/_dev-box.js`, `docs/content-notes/studio.md`, this file.

## 1. Shared-file requests (nothing was edited outside the studio's own files)

| # | Shared file | Request | Status |
|---|---|---|---|
| 1 | `docs/STYLEGUIDE.md` / `_template.html` | Mention that `studio.html` loads `assets/js/studio/studio.js` (no `pages/studio.js`). | **Done** (STYLEGUIDE §2). |
| 2 | `assets/css/main.css` | Optional: a shared glass surface token (`--glass-bg`, `--glass-line`, `--glass-blur`). | Open (nice-to-have) — the studio keeps its local `--studio-glass*` custom properties. |
| 3 | `assets/js/core/ui.js` | Range helper opt-out so pages can format the `<output>`. | **Done** (`data-format="none"`); the studio's three sliders now use it and set `aria-valuetext` from the formatted readout. |
| 4 | `assets/js/core/ui.js` tooltips | Hide the tooltip on `pointerdown` (toolbar button that opens a modal). | **Done** (core). |
| 5 | Home page (`index.html` owner) | A compact studio embed is available — see §2. | Info. |
| 6 | `assets/icons/sprite.svg` | Icons `box-select`, `sun-moon`, `scissors`. | **Done**; the studio now uses `box-select` (isolate a level) and `scissors` (section cut). |

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
- **Lamps (alias):** `userData.intensity` is accepted as well as `userData.nightIntensity` (residential-tower uses
  the former) — every model's lamps light at night.
- **Materials:** the engine sets `clippingPlanes` / `clipShadows` on every model material and patches opaque ones
  with a back-face "cap" (teal) via `onBeforeCompile` (chained with any existing hook). **Not** patched:
  transparent / glass materials (opacity < 0.95 or transmission > 0.05), materials the author made
  `side: DoubleSide` (open surfaces — palm fronds, parasols, lathe shells), cut-outs (`alphaTest > 0`) and any
  material flagged `userData.noCap = true`. Back faces of those stay real surfaces in every mode and under a cut.
- **Replacement materials** (Clay / Blueprint / X-ray / isolation ghost) keep the original `.side`: a DoubleSide
  original gets a DoubleSide twin of the mode material (never cap-patched). X-ray uses normal alpha blending
  (no additive white-out where many layers overlap, e.g. the landmark drum).
- **Per-material env maps:** three r186 ignores `scene.environmentIntensity` for a material with its own `envMap`.
  The engine therefore scales `envMapIntensity` of every such material by the day/night factor, from
  `userData.baseEnvMapIntensity` when present (else the authored value), so glass/water reflections dim at night.
  Night `scene.environmentIntensity` is 0.035 (day 0.82).
- **Framing:** preset positions (except Street) and the explode pull-back are fitted so the building bounds
  (exploded height included — the campus tower rises ~40 m) stay inside the canvas area not covered by the
  panels: the camera moves back along the preset's direction as far as needed, or in by up to 28 % when the
  authored preset leaves the buildings small, so every model fills the free area alike.
- **Thumbnails** build a second, `quality:'low'` instance of each model in idle time; `dispose()` must free it.
- three r186: `PCFSoftShadowMap` was removed — the engine uses `PCFShadowMap` (soft-filtered) with `shadow.radius`.

## 4. Dev model

`assets/js/studio/models/_dev-box.js` is a contract-conformant test model. It is not listed in the library;
reach it with `studio.html?dev=1` (adds it as item 06) or `studio.html?model=_dev-box`.
`?nogl=1` forces the no-WebGL fallback; `?perf=1` logs load/frame timings to the console.

## 5. Low-power profile (CPU rasterisers) & QA params

When the WebGL implementation is a software rasteriser (SwiftShader / llvmpipe — headless CI, blocklisted
GPUs), the engine switches to a low-power profile: no MSAA, render scale 0.6, 1024px shadows, no damping,
no tweened motion (camera moves, explode easing, reveal), ambient model animation only on frames that render
anyway, no idle thumbnail generation, and instant UI fades. Rendering is always on demand (nothing renders while
idle), paused off-screen and when the tab is hidden. Overrides: `?lowpower=0|1`, `?hq=1` (full-resolution stills for
screenshots). Headless SwiftShader in this container needs ~15–30 s to compile the first model's shaders, so
QA scripts should wait for `window` `studio:ready` / `[data-studio][data-ready="true"]`.
