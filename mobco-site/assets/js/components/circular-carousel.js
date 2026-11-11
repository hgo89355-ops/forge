/**
 * Circular Carousel: a framework-free 3D ring carousel.
 *
 * Ported from React Bits "CircularCarousel" (https://reactbits.dev, JS + CSS variant) to a plain
 * ES module: no React, no build step, no network. The maths (presets, ring radius, curved tile
 * strips, fit-to-container, intros, spring snapping, momentum) is reproduced faithfully; wherever
 * the React version re-rendered on state changes (active index, dragging, ready) this version
 * patches the DOM directly and minimally.
 *
 * ── USAGE ───────────────────────────────────────────────────────────────────────────────────────
 *   <link rel="stylesheet" href="/assets/css/components/circular-carousel.css">
 *   <div id="ring" style="height: 520px"></div>      ← the container must have a size
 *
 *   import { createCircularCarousel } from '/assets/js/components/circular-carousel.js';
 *   const carousel = createCircularCarousel(document.querySelector('#ring'), {
 *     items: [{ src: 'img/a.webp', alt: 'Aerial view of …', title: 'A', subtitle: 'Sub', href: '…', data: {…} }],
 *     preset: 'cylinder',
 *     captions: true,
 *     onItemClick: (item, index) => { location.href = item.href; }
 *   });
 *
 * ── API (all methods return the instance, so calls chain) ──────────────────────────────────────
 *   update(partial)   merge options and re-apply live (keeps the current angle; cards are only
 *                     rebuilt when their markup changes; a new `intro` replays it).
 *   setItems(items)   replace the items (new image sources reload and replay the intro).
 *   focus(i)          spin to item i.      next() / prev()   one item forward / back (reading order).
 *   pause() / play()  hold / resume autoplay (wire to a visible button, WCAG 2.2.2).
 *   .paused  .active  .element   read-only: held by pause()? / index in front / root element.
 *   destroy()         stop timers, observers and listeners; remove the DOM.
 *   One carousel per container: creating a second one destroys the first (with a warning).
 *
 * ── OPTIONS (React Bits prop names and defaults; see DEFAULTS) ─────────────────────────────────
 *   items          [{ src, alt, title, subtitle, href, data }]; non-objects are ignored. href/data are
 *                  never rendered, only passed back to onItemClick / onChange. A missing or failed
 *                  image gets data-error on its card and a flat placeholder (--cc-placeholder).
 *   preset         'cylinder' | 'orbit' | 'wheel' (vertical) | 'panorama' (camera inside the ring).
 *   intro          'rise' | 'assemble' | 'spin' | 'none'          (played once images are ready)
 *   cardWidth 220  aspectRatio 1 (w/h)  gap 25  cornerRadius 12
 *   curve / tilt / perspective   undefined → the preset's value (pass undefined to reset).
 *   autoplay       'drift' (speed 14 deg/s) | 'step' (interval 3 s) | 'off'
 *   direction      'left' | 'right'; undefined → 'left', or 'right' on horizontal rings in RTL.
 *   draggable true  momentum 0.6  snap true  pauseOnHover true  focusOnClick true
 *   parallax 0.3  stretch 0.5  depthFade 0.55  fadeColor '#000000' (match the page bg)  innerShade 0.6
 *   captions false (title + subtitle + 01/10 counter under the ring)
 *   onChange(index, item)  onItemClick(item, index)  className  style (object or CSS string)
 *   An option passed as `undefined` means "use the default", as with React props.
 *
 * ── I18N: labels ───────────────────────────────────────────────────────────────────────────────
 *   labels: { region, carousel, slideRole, slide, live, untitled, description }, any subset.
 *   Each is a string with {title} {index} {count} {alt} placeholders (index is 1-based), or a
 *   function ({ title, index, count, item, alt }) => string. Defaults: DEFAULT_LABELS (English).
 *     labels: { region: 'معرض صور', slide: ({ title, index, count }) => `${title}، ${index} من ${count}` }
 *
 * ── RTL ────────────────────────────────────────────────────────────────────────────────────────
 *   rtl: true sets dir="rtl" on the root and makes item 2 appear to the LEFT of item 1 on the
 *   horizontal presets (cylinder/orbit mirror the order; panorama already reads that way), so
 *   ArrowLeft, next() and autoplay all advance to the next item. The vertical wheel is unaffected.
 *   Arrow keys always move the ring the way they point. Toggling rtl keeps the current item.
 *
 * ── ACCESSIBILITY ──────────────────────────────────────────────────────────────────────────────
 *   Focusable region (Tab) with arrows / Home / End / Enter (= onItemClick). Keyboard focus pauses
 *   autoplay; slide changes are announced politely except while autoplay is turning the ring.
 *   Item alt text becomes the card's aria-description when it differs from the title.
 *   prefers-reduced-motion: no intro, no autoplay, no parallax/stretch (also when toggled live).
 *   CSS hooks: --cc-focus (focus ring colour, default currentColor), --cc-placeholder.
 */

/* ------------------------------------------------------------------------------------------------
 * Constants (identical to the React source)
 * --------------------------------------------------------------------------------------------- */

export const PRESETS = Object.freeze({
  cylinder: Object.freeze({
    axis: 'y',
    tilt: -5,
    perspective: 2500,
    curve: 1,
    spread: 1,
    inward: false,
    billboard: false,
    backfaces: true,
    window: 0
  }),
  orbit: Object.freeze({
    axis: 'y',
    tilt: -16,
    perspective: 1500,
    curve: 0,
    spread: 1.45,
    inward: false,
    billboard: true,
    backfaces: false,
    window: 0
  }),
  wheel: Object.freeze({
    axis: 'x',
    tilt: 0,
    perspective: 1800,
    curve: 0,
    spread: 1,
    inward: false,
    billboard: false,
    backfaces: true,
    window: 1.7
  }),
  panorama: Object.freeze({
    axis: 'y',
    tilt: 0,
    perspective: 0,
    curve: 1,
    spread: 1,
    inward: true,
    billboard: false,
    backfaces: false,
    window: 0
  })
});

export const INTRO_LENGTH = Object.freeze({ assemble: 1500, rise: 1400, spin: 1800, none: 0 });

const TILES = 8; // strips per card when the card is curved
const OVERLAP = 2.5; // px of overlap between strips (hides hairline seams)
const DRAG_THRESHOLD = 5; // px before a press becomes a drag
const SPRING = 118; // snap spring stiffness (critically damped)
const SETTLE_SPEED = 9; // deg/s below which a free-spinning ring starts snapping
const CAPTION_SPACE = 76; // px reserved under the ring when captions are on
const TO_RAD = Math.PI / 180;

/** Default option values, the React props' defaults, plus `labels` and `rtl`. */
export const DEFAULTS = Object.freeze({
  items: [],
  preset: 'cylinder',
  intro: 'rise',
  cardWidth: 220,
  aspectRatio: 1,
  gap: 25,
  curve: undefined, // undefined → preset value
  tilt: undefined, // undefined → preset value
  perspective: undefined, // undefined → preset value
  autoplay: 'drift', // 'drift' | 'step' | 'off'
  speed: 14, // deg/s for drift
  interval: 3, // s between steps
  direction: undefined, // 'left' | 'right'; undefined → 'left' ('right' when rtl)
  draggable: true,
  momentum: 0.6,
  snap: true,
  pauseOnHover: true,
  focusOnClick: true,
  parallax: 0.3,
  stretch: 0.5,
  depthFade: 0.55,
  fadeColor: '#000000',
  innerShade: 0.6,
  cornerRadius: 12,
  captions: false,
  onChange: undefined,
  onItemClick: undefined,
  className: '',
  style: undefined,
  labels: undefined,
  rtl: false
});

/**
 * Accessible strings. Each may be a string with {title} {index} {count} placeholders or a
 * function receiving `{ title, index, count, item }` (index is 1-based) and returning a string.
 */
export const DEFAULT_LABELS = Object.freeze({
  region: 'Image carousel', // aria-label of the carousel region
  carousel: 'carousel', // aria-roledescription of the region
  slideRole: 'slide', // aria-roledescription of each card
  slide: '{title}, {index} of {count}', // aria-label of each card
  live: '{title}, {index} of {count}', // polite live-region announcement
  untitled: 'Image {index}', // fallback title when an item has neither title nor alt
  description: '{alt}' // aria-description of a card whose alt text differs from its title
});

/* ------------------------------------------------------------------------------------------------
 * Helpers
 * --------------------------------------------------------------------------------------------- */

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const wrap = degrees => ((((degrees + 180) % 360) + 360) % 360) - 180;
const easeOut = t => 1 - Math.pow(1 - t, 4);
const easeOutQuint = t => 1 - Math.pow(1 - t, 5);
const hasOwn = (object, key) => typeof key === 'string' && Object.prototype.hasOwnProperty.call(object, key);

/** Finite number or the fallback (accepts numeric strings, e.g. from <input> values). */
const num = (value, fallback) => {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
};

const rotateX = (p, degrees) => {
  const r = degrees * TO_RAD;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c];
};

const rotateY = (p, degrees) => {
  const r = degrees * TO_RAD;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
};

const format = (label, context) =>
  typeof label === 'function'
    ? String(label(context))
    : String(label ?? '').replace(/\{(\w+)\}/g, (match, key) => (key in context ? String(context[key]) : match));

const element = (tag, className, attributes) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (attributes) for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  return node;
};

const px = value => `${value}px`;

const toggleAttribute = (node, name, on) => {
  if (on) node.setAttribute(name, '');
  else node.removeAttribute(name);
};

// CSS properties React leaves unitless when given a number.
const UNITLESS = new Set([
  'opacity',
  'zIndex',
  'flex',
  'flexGrow',
  'flexShrink',
  'order',
  'lineHeight',
  'fontWeight',
  'zoom',
  'aspectRatio',
  'scale'
]);
const kebab = name => (name.startsWith('--') ? name : name.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`));

/* ------------------------------------------------------------------------------------------------
 * Derived settings, the React component body, minus the JSX
 * --------------------------------------------------------------------------------------------- */

/**
 * Merges `partial` into `base` the way React default parameters behave: an explicit `undefined`
 * means "use the default", so it is skipped, except for options whose default *is* undefined
 * (curve, tilt, perspective, direction, callbacks, style, labels), where it resets to auto.
 */
function mergeOptions(base, partial) {
  const merged = { ...base };
  if (partial && typeof partial === 'object') {
    for (const key of Object.keys(partial)) {
      const value = partial[key];
      if (value === undefined && hasOwn(DEFAULTS, key) && DEFAULTS[key] !== undefined) continue;
      merged[key] = value;
    }
  }
  return merged;
}

const flag = (value, fallback) => Boolean(value ?? fallback);

function derive(options, reduced) {
  const raw = Array.isArray(options.items) ? options.items : [];
  const items = raw.filter(item => item !== null && typeof item === 'object');
  const dropped = raw.length - items.length;
  const count = items.length;
  const shape = hasOwn(PRESETS, options.preset) ? options.preset : 'cylinder';
  const layout = PRESETS[shape];
  const axis = layout.axis;
  const tilt = options.tilt == null ? layout.tilt : num(options.tilt, layout.tilt);
  const curve = layout.billboard ? 0 : clamp(options.curve == null ? layout.curve : num(options.curve, layout.curve), 0, 1);
  const rtl = Boolean(options.rtl);

  const cardW = Math.max(40, num(options.cardWidth, DEFAULTS.cardWidth));
  const cardH = cardW / clamp(num(options.aspectRatio, DEFAULTS.aspectRatio), 0.2, 5);
  const along = axis === 'x' ? cardH : cardW;
  const gap = num(options.gap, DEFAULTS.gap);
  const step = count ? 360 / count : 360;

  // Ring radius: blend between the polygon chord (flat cards touching) and the true arc (cards
  // bent onto the circle) by `curve`.
  const n = Math.max(count, 3);
  const pitch = (along + gap) * layout.spread;
  const chord = pitch / (2 * Math.sin(Math.PI / n));
  const arc = (n * pitch) / (2 * Math.PI);
  const radius = Math.max(chord + (arc - chord) * curve, along * 0.6);

  // Curved cards are built from TILES overlapping strips, each pushed/rotated onto an arc of
  // radius `radius / curve`.
  const total = curve > 0.001 ? TILES : 1;
  const length = along / total;
  const bend = curve > 0.001 ? radius / curve : 0;
  const tiles = Array.from({ length: total }, (_, index) => {
    const start = index * length - (index > 0 ? OVERLAP / 2 : 0);
    const end = (index + 1) * length + (index < total - 1 ? OVERLAP / 2 : 0);
    const center = (start + end) / 2 - along / 2;
    const alpha = bend ? center / bend : 0;
    const shift = bend ? bend * Math.sin(alpha) : center;
    const sink = bend ? bend * (1 - Math.cos(alpha)) : 0;
    const depth = layout.inward ? sink : -sink;
    const turn = ((layout.inward ? -alpha : alpha) * 180) / Math.PI;
    const move =
      axis === 'x'
        ? `translate3d(0px, ${shift}px, ${depth}px) rotateX(${-turn}deg)`
        : `translate3d(${shift}px, 0px, ${depth}px) rotateY(${turn}deg)`;
    return { index, total, start, end, size: end - start, move };
  });

  const dragSign = layout.inward ? -1 : 1;
  // RTL only concerns horizontal rings. On an outward ring (cylinder, orbit) item 2 would sit to
  // the right of item 1, so the order is mirrored; inside a panorama it already sits to the left
  // (the camera is inside the ring), so only the default drive direction flips there. The
  // vertical wheel is unaffected by RTL.
  const horizontalRtl = rtl && axis === 'y';
  const direction = options.direction ?? (horizontalRtl ? 'right' : 'left');
  const introName = hasOwn(INTRO_LENGTH, options.intro) ? options.intro : 'rise';

  return {
    items,
    count,
    shape,
    layout,
    axis,
    tilt,
    curve,
    cardW,
    cardH,
    along,
    step,
    radius,
    tiles,
    perspective: layout.inward ? radius : options.perspective == null ? layout.perspective : num(options.perspective, layout.perspective),
    intro: reduced ? 'none' : introName,
    autoplay: reduced ? 'off' : options.autoplay ?? DEFAULTS.autoplay,
    speed: num(options.speed, DEFAULTS.speed),
    interval: Math.max(0.5, num(options.interval, DEFAULTS.interval)),
    draggable: flag(options.draggable, DEFAULTS.draggable),
    momentum: clamp(num(options.momentum, DEFAULTS.momentum), 0, 1),
    snap: flag(options.snap, DEFAULTS.snap),
    pauseOnHover: flag(options.pauseOnHover, DEFAULTS.pauseOnHover),
    focusOnClick: flag(options.focusOnClick, DEFAULTS.focusOnClick),
    parallax: reduced ? 0 : clamp(num(options.parallax, DEFAULTS.parallax), 0, 1),
    stretch: reduced ? 0 : clamp(num(options.stretch, DEFAULTS.stretch), 0, 1),
    depthFade: clamp(num(options.depthFade, DEFAULTS.depthFade), 0, 1),
    innerShade: clamp(num(options.innerShade, DEFAULTS.innerShade), 0, 1),
    cornerRadius: Math.max(0, num(options.cornerRadius, DEFAULTS.cornerRadius)),
    captions: Boolean(options.captions),
    reduced,
    dragSign,
    directionSign: (direction === 'right' ? 1 : -1) * dragSign,
    rtl,
    // Screen-space mirroring: in RTL item 2 must end up to the LEFT of item 1.
    mirror: horizontalRtl && !layout.inward,
    labels: { ...DEFAULT_LABELS, ...(options.labels || {}) },
    dropped
  };
}

/* ------------------------------------------------------------------------------------------------
 * Factory
 * --------------------------------------------------------------------------------------------- */

const INSTANCES = new WeakMap(); // container → live instance

/**
 * Mounts a circular carousel inside `container`.
 * @param {Element} container
 * @param {object} [options] see DEFAULTS
 * @returns {{update(o:object):object, setItems(items:object[]):object, focus(i:number):object,
 *   next():object, prev():object, readonly active:number, readonly element:HTMLElement, destroy():void}}
 */
export function createCircularCarousel(container, options = {}) {
  if (!container || typeof container.appendChild !== 'function') {
    throw new TypeError('createCircularCarousel: a container element is required');
  }

  // One carousel per container: a second create() replaces the first instead of stacking roots.
  const previous = INSTANCES.get(container);
  if (previous) {
    console.warn('[circular-carousel] container already has a carousel, destroying the previous instance.');
    previous.destroy();
  }

  let opts = mergeOptions(DEFAULTS, options);
  const motionQuery = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  let reduced = Boolean(motionQuery?.matches);
  let s = derive(opts, reduced); // current derived settings
  let destroyed = false;
  let warnedEmpty = false;
  let warnedDropped = false;

  /* ---- DOM skeleton (mirrors the React JSX) ---- */
  const root = element('div', 'circular-carousel', { role: 'region', tabindex: '0' });
  const view = element('div', 'circular-carousel__view');
  const stage = element('div', 'circular-carousel__stage');
  const camera = element('div', 'circular-carousel__camera');
  const ring = element('div', 'circular-carousel__ring');
  const live = element('div', 'circular-carousel__live', { 'aria-live': 'polite', 'aria-atomic': 'true' });
  camera.append(ring);
  stage.append(camera);
  view.append(stage);
  root.append(view, live);

  let cards = []; // card elements, indexed by item index
  let domKey = ''; // signature of everything the card DOM depends on
  let appliedStyle = []; // style properties set from options.style (cleared on update)
  let caption = null; // { root, title, digits, total, shown }
  let lastDirectionSign = null;

  /* ---- Runtime state (React: stateRef + a few useState) ---- */
  let active = 0;
  let ready = false;
  let sourcesKey = null;
  let loadToken = 0;
  let loadTimer = 0;
  let loadingImages = [];

  const state = {
    angle: 0,
    velocity: 0,
    target: null,
    dir: 0,
    press: null,
    drag: false,
    hover: false,
    focused: false, // keyboard focus inside the carousel (pauses autoplay)
    halted: false, // pause() / play()
    pointer: { inside: false, x: 0, y: 0 },
    yaw: 0,
    pitch: 0,
    intro: null,
    introDone: false,
    holdUntil: 0,
    stepAt: 0,
    wakeAt: 0,
    suppressClick: false,
    wheelTimer: 0,
    fit: 1,
    shift: 0,
    drop: 0,
    last: 0
  };

  let raf = 0;
  let sleepTimer = 0; // parks the loop until the next autoplay step / end of a hold
  let visible = true;

  /* ---- Slot mapping: which angular slot an item occupies (mirrored in RTL) ---- */
  const slotOf = index => (s.mirror ? (s.count - index) % s.count : index);
  const nearest = angle => Math.round(angle / s.step) * s.step;
  const titleOf = (item, index) =>
    (item && (item.title || item.alt)) || format(s.labels.untitled, { index: index + 1, count: s.count, item, title: '' });

  /* ================================================================================================
   * Building the DOM
   * ============================================================================================= */

  function buildTile(item, tile, back) {
    const { axis, cardW, cardH, along } = s;
    const strip = back ? tile.total - 1 - tile.index : tile.index;
    const first = strip === 0;
    const last = strip === tile.total - 1;
    const r = 'var(--cc-radius)';
    const frameRadius =
      axis === 'x'
        ? `${first ? r : 0} ${first ? r : 0} ${last ? r : 0} ${last ? r : 0}`
        : `${first ? r : 0} ${last ? r : 0} ${last ? r : 0} ${first ? r : 0}`;
    const offset = back ? along - tile.end : tile.start;
    const size = tile.size;
    const box =
      axis === 'x'
        ? { left: -cardW / 2, top: -size / 2, width: cardW, height: size }
        : { left: -size / 2, top: -cardH / 2, width: size, height: cardH };
    const photo =
      axis === 'x' ? { left: 0, top: -offset, width: cardW, height: cardH } : { left: -offset, top: 0, width: cardW, height: cardH };
    const flip = axis === 'x' ? ' rotateX(180deg)' : ' rotateY(180deg)';

    const tileNode = element('div', 'circular-carousel__tile', { 'aria-hidden': 'true' });
    tileNode.style.left = px(box.left);
    tileNode.style.top = px(box.top);
    tileNode.style.width = px(box.width);
    tileNode.style.height = px(box.height);
    tileNode.style.transform = tile.move + (back ? flip : '');

    const frame = element('div', 'circular-carousel__frame');
    frame.style.height = px(axis === 'x' ? size : cardH);
    frame.style.borderRadius = frameRadius;

    const img = element('img', 'circular-carousel__photo', { alt: '', draggable: 'false', decoding: 'async' });
    img.style.left = px(photo.left);
    img.style.top = px(photo.top);
    img.style.width = px(photo.width);
    img.style.height = px(photo.height);
    if (item.src) img.src = item.src;

    frame.append(img);
    if (back) frame.append(element('div', 'circular-carousel__inner'));
    frame.append(element('div', 'circular-carousel__shade'));
    tileNode.append(frame);
    return tileNode;
  }

  function buildCards() {
    const fragment = document.createDocumentFragment();
    cards = s.items.map((item, index) => {
      const card = element('div', 'circular-carousel__card', { 'data-cc-index': String(index), role: 'group' });
      if (!item.src) card.setAttribute('data-error', ''); // nothing to show: use the placeholder
      for (const tile of s.tiles) card.append(buildTile(item, tile, false));
      if (s.layout.backfaces) for (const tile of s.tiles) card.append(buildTile(item, tile, true));
      fragment.append(card);
      return card;
    });
    ring.replaceChildren(fragment);
  }

  function labelCards() {
    const { labels, count } = s;
    cards.forEach((card, index) => {
      const item = s.items[index];
      const title = titleOf(item, index);
      const alt = typeof item.alt === 'string' ? item.alt.trim() : '';
      const context = { title, index: index + 1, count, item, alt };
      card.setAttribute('aria-roledescription', format(labels.slideRole, {}));
      card.setAttribute('aria-label', format(labels.slide, context));
      // The photos themselves are decorative (alt="" on every strip), so the image description
      // travels on the slide, unless the label already says it.
      const label = card.getAttribute('aria-label');
      const description = alt && alt !== title && !label.includes(alt) ? format(labels.description, context) : '';
      if (description) card.setAttribute('aria-description', description);
      else card.removeAttribute('aria-description');
    });
  }

  /** A card photo failed to load: hide the broken image and show the placeholder instead. */
  function onImageError(event) {
    const target = event.target;
    if (!(target instanceof HTMLImageElement) || !target.classList.contains('circular-carousel__photo')) return;
    target.closest('.circular-carousel__card')?.setAttribute('data-error', '');
  }

  /** Sets the reel digits for the caption counter (React: <Digits value={active + 1} />). */
  function setDigits(container, value) {
    const chars = String(value).padStart(2, '0').split('');
    while (container.children.length > chars.length) container.lastElementChild.remove();
    while (container.children.length < chars.length) {
      const digit = element('span', 'circular-carousel__digit');
      const reel = element('span', 'circular-carousel__reel');
      for (let n = 0; n < 10; n++) {
        const glyph = element('span');
        glyph.textContent = String(n);
        reel.append(glyph);
      }
      digit.append(reel);
      container.append(digit);
    }
    chars.forEach((char, index) => {
      const reel = container.children[index].firstElementChild;
      reel.style.transform = `translateY(${-Number(char) * 10}%)`;
    });
  }

  function titleContent(node, item) {
    node.replaceChildren(document.createTextNode((item && (item.title || item.alt)) || ''));
    if (item && item.subtitle) {
      const subtitle = element('span', 'circular-carousel__subtitle');
      subtitle.textContent = item.subtitle;
      node.append(subtitle);
    }
  }

  /** Caption + live region. `refresh` re-writes text even when the active index is unchanged. */
  function syncCaption(refresh) {
    const current = s.items[active] || s.items[0];

    if (s.captions && current) {
      if (!caption) {
        const box = element('div', 'circular-carousel__caption', { 'aria-hidden': 'true' });
        const count = element('span', 'circular-carousel__count');
        const digits = element('span', 'circular-carousel__digits');
        const slash = element('span', 'circular-carousel__slash');
        slash.textContent = '/';
        const total = element('span');
        count.append(digits, slash, total);
        box.append(element('span', 'circular-carousel__title'), count);
        root.insertBefore(box, live);
        caption = { root: box, count, digits, total, shown: -1 };
      }
      if (caption.shown !== active) {
        // New node → the title animation replays (React keyed the span by `active`).
        const title = element('span', 'circular-carousel__title');
        titleContent(title, current);
        caption.root.firstElementChild.replaceWith(title);
        caption.shown = active;
      } else if (refresh) {
        titleContent(caption.root.firstElementChild, current);
      }
      setDigits(caption.digits, active + 1);
      caption.total.textContent = String(s.count).padStart(2, '0');
    } else if (caption) {
      caption.root.remove();
      caption = null;
    }

    const text = current
      ? format(s.labels.live, { title: titleOf(current, active), index: active + 1, count: s.count, item: current })
      : '';
    if (live.textContent !== text) live.textContent = text;
  }

  function setActive(index) {
    active = index;
    syncCaption(false);
    try {
      opts.onChange?.(index, s.items[index]);
    } catch (error) {
      console.error(error);
    }
  }

  /* ================================================================================================
   * Root attributes, styles and options
   * ============================================================================================= */

  function applyRootAttributes() {
    root.className = `circular-carousel ${opts.className || ''}`.trim();

    for (const name of appliedStyle) root.style.removeProperty(name);
    appliedStyle = [];
    const style = opts.style;
    if (typeof style === 'string') {
      for (const declaration of style.split(';')) {
        const at = declaration.indexOf(':');
        if (at < 0) continue;
        const name = declaration.slice(0, at).trim();
        if (!name) continue;
        root.style.setProperty(name, declaration.slice(at + 1).trim());
        appliedStyle.push(name);
      }
    } else if (style && typeof style === 'object') {
      for (const [key, value] of Object.entries(style)) {
        if (value == null || value === false) continue;
        const name = kebab(key);
        const css = typeof value === 'number' && value !== 0 && !UNITLESS.has(key) && !key.startsWith('--') ? `${value}px` : String(value);
        root.style.setProperty(name, css);
        appliedStyle.push(name);
      }
    }

    root.style.setProperty('--cc-fade', String(opts.fadeColor ?? DEFAULTS.fadeColor));
    root.style.setProperty('--cc-radius', `${s.cornerRadius}px`);
    root.style.setProperty('--cc-inner', (1 - s.innerShade).toFixed(3));

    root.setAttribute('aria-roledescription', format(s.labels.carousel, {}));
    root.setAttribute('aria-label', format(s.labels.region, { count: s.count }));
    root.setAttribute('data-axis', s.axis);
    root.setAttribute('data-shape', s.shape);
    toggleAttribute(root, 'data-draggable', s.draggable);
    toggleAttribute(root, 'data-ready', ready);
    if (s.rtl) root.setAttribute('dir', 'rtl');
    else root.removeAttribute('dir');
  }

  /** Re-derives settings from `opts` and patches the DOM, rebuilding cards only when needed. */
  function apply() {
    const before = s;
    s = derive(opts, reduced);
    applyRootAttributes();

    if (s.dropped && !warnedDropped) {
      console.warn(`[circular-carousel] ignored ${s.dropped} item(s) that are not objects.`);
      warnedDropped = true;
    }

    if (!s.count) {
      active = 0;
      if (!warnedEmpty) {
        console.warn('[circular-carousel] `items` is empty, nothing is rendered.');
        warnedEmpty = true;
      }
      stop();
      ring.replaceChildren();
      cards = [];
      domKey = '';
      sourcesKey = null;
      ready = false;
      root.removeAttribute('data-ready');
      caption?.root.remove();
      caption = null;
      root.remove();
      return;
    }
    if (root.parentNode !== container) container.appendChild(root);

    // Everything the card/tile markup depends on.
    const key = [
      s.items.map(item => item.src).join('|'),
      s.axis,
      s.cardW,
      s.cardH,
      s.layout.backfaces,
      s.tiles.map(tile => `${tile.start},${tile.end},${tile.move}`).join(';')
    ].join('#');
    if (key !== domKey) {
      domKey = key;
      buildCards();
    }
    labelCards();

    if (active >= s.count) active = 0;
    // Switching rtl flips the slot mapping: turn the ring so the same item stays in front.
    if (before.mirror !== s.mirror && before.count) {
      state.angle = -slotOf(active) * s.step;
      state.target = null;
      state.velocity = 0;
    }
    syncCaption(true);

    if (s.directionSign !== lastDirectionSign) {
      lastDirectionSign = s.directionSign;
      state.dir = s.directionSign;
    }

    const sources = s.items.map(item => item.src).join('|');
    if (sources !== sourcesKey) preload(sources);

    measure();
    render(performance.now());
    wake();
  }

  /* ================================================================================================
   * Image preloading → data-ready (and intro replay)
   * ============================================================================================= */

  function cancelPreload() {
    loadToken++;
    clearTimeout(loadTimer);
    loadTimer = 0;
    for (const image of loadingImages) image.onload = image.onerror = null;
    loadingImages = [];
  }

  function preload(key) {
    cancelPreload();
    sourcesKey = key;
    ready = false;
    root.removeAttribute('data-ready');
    const token = loadToken;
    const sources = key.split('|').slice(0, 12);
    const load = src =>
      new Promise(resolve => {
        const image = new Image();
        image.decoding = 'async';
        image.onload = () => (image.decode ? image.decode().then(resolve, resolve) : resolve());
        image.onerror = resolve;
        loadingImages.push(image);
        image.src = src;
      });
    const timeout = new Promise(resolve => {
      loadTimer = setTimeout(resolve, 2400);
    });
    Promise.race([Promise.all(sources.map(load)), timeout]).then(() => {
      if (token !== loadToken || destroyed) return;
      clearTimeout(loadTimer);
      loadTimer = 0;
      loadingImages = [];
      state.introDone = false;
      state.intro = null;
      ready = true;
      root.setAttribute('data-ready', '');
      wake();
    });
  }

  /* ================================================================================================
   * Geometry: fit the projected ring inside the container
   * ============================================================================================= */

  function measure() {
    if (!s.count) return;
    const rect = root.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const room = s.captions ? CAPTION_SPACE : 0;
    const width = rect.width * 0.94;
    const height = (rect.height - room) * 0.92;
    const P = s.perspective;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    if (s.layout.inward) {
      minX = -width / 2;
      maxX = width / 2;
      minY = -s.cardH / 2;
      maxY = s.cardH / 2;
    } else {
      const corners = [
        [-s.cardW / 2, -s.cardH / 2],
        [s.cardW / 2, -s.cardH / 2],
        [-s.cardW / 2, s.cardH / 2],
        [s.cardW / 2, s.cardH / 2]
      ];
      // Sweep every card position (or just the visible window for the wheel) and project corners.
      //
      // Deviation from the React source: there the ring was pushed back by -radius *before* the
      // tilt rotation, i.e. tilted about the front card. The camera transform in render() is
      // `translate3d(0, 0, -R) rotateX(tilt)`, which tilts about the ring's centre and *then*
      // pushes it back, so the original fit was off-centre by ≈ R·sin(tilt), ~30px low for
      // 'cylinder' and ~115px low for 'orbit' (its front cards ran into the captions). Projecting
      // in the same order as the camera makes the fit/centring do what it was meant to.
      const limit = s.layout.window ? s.layout.window * s.step : 180;
      for (let a = -limit; a <= limit; a += limit / 24) {
        for (const [cx, cy] of corners) {
          let p;
          if (s.axis === 'x') {
            p = rotateY(rotateX([cx, cy, s.radius], -a), s.tilt);
          } else if (s.layout.billboard) {
            const c = rotateY([0, 0, s.radius], a);
            p = rotateX([c[0] + cx, cy, c[2]], s.tilt);
          } else {
            p = rotateX(rotateY([cx, cy, s.radius], a), s.tilt);
          }
          p[2] -= s.radius;
          if (p[2] >= P * 0.95) continue;
          const k = P / (P - p[2]);
          minX = Math.min(minX, p[0] * k);
          maxX = Math.max(maxX, p[0] * k);
          minY = Math.min(minY, p[1] * k);
          maxY = Math.max(maxY, p[1] * k);
        }
      }
    }
    const spanX = Math.max(maxX - minX, 1);
    const spanY = Math.max(maxY - minY, 1);
    const fit = Math.min(1, width / spanX, height / spanY);
    state.fit = fit;
    state.shift = -((minY + maxY) / 2) * fit - room / 2;
    state.drop = s.axis === 'x' ? (rect.width / fit) * 0.55 + s.cardW : (rect.height / fit) * 0.55 + s.cardH;
    stage.style.perspective = `${P}px`;
    stage.style.transform = `translate3d(0, ${state.shift}px, 0) scale(${fit})`;
  }

  /* ================================================================================================
   * Animation loop
   * ============================================================================================= */

  /** Per-card intro modifiers: radius multiplier and lift (px) for a card landing at `landing`°. */
  function introCard(elapsed, landing) {
    if (!state.intro) return { radius: 1, lift: 0 };
    const type = state.intro.type;
    const reach = Math.abs(wrap(landing + state.angle));
    if (type === 'assemble') {
      const delay = (reach / 180) * 420;
      const p = easeOut(clamp((elapsed - delay) / 1080, 0, 1));
      return { radius: 1 + 0.6 * (1 - p), lift: 0 };
    }
    if (type === 'rise') {
      const delay = (reach / 180) * 480;
      const p = easeOutQuint(clamp((elapsed - delay) / 900, 0, 1));
      return { radius: 1, lift: (1 - p) * state.drop };
    }
    if (type === 'spin') {
      const p = easeOut(clamp(elapsed / INTRO_LENGTH.spin, 0, 1));
      return { radius: 1 + 0.28 * (1 - p), lift: 0 };
    }
    return { radius: 1, lift: 0 };
  }

  /** Physics step. Returns true while anything is still moving (keeps the RAF alive). */
  function advance(dt, now) {
    if (!state.introDone && ready) {
      if (!state.intro) {
        if (s.intro === 'none') state.introDone = true;
        else state.intro = { type: s.intro, start: now };
      }
      if (state.intro && now - state.intro.start >= INTRO_LENGTH[state.intro.type]) {
        state.intro = null;
        state.introDone = true;
      }
    }

    const paused =
      (s.pauseOnHover && state.hover) || state.focused || state.halted || state.drag || now < state.holdUntil;
    const cruise = s.autoplay === 'drift' && !paused && !state.intro ? s.speed * state.dir : 0;
    let busy = Boolean(state.intro) || state.drag;
    state.wakeAt = 0;

    // While autoplay is turning the ring on its own, slide changes are not announced (APG
    // carousel pattern); user-driven or paused changes are announced politely.
    const politeness = (s.autoplay === 'drift' || s.autoplay === 'step') && !paused ? 'off' : 'polite';
    if (live.getAttribute('aria-live') !== politeness) live.setAttribute('aria-live', politeness);

    if (state.drag || state.intro) {
      state.velocity = state.drag ? state.velocity : 0;
    } else if (state.target !== null) {
      // Critically damped spring towards the snap target, sub-stepped at 240 Hz.
      let remaining = dt;
      const damping = 2 * Math.sqrt(SPRING);
      while (remaining > 0) {
        const h = Math.min(remaining, 1 / 240);
        const accel = SPRING * (state.target - state.angle) - damping * state.velocity;
        state.velocity += accel * h;
        state.angle += state.velocity * h;
        remaining -= h;
      }
      if (Math.abs(state.target - state.angle) < 0.004 && Math.abs(state.velocity) < 0.03) {
        state.angle = state.target;
        state.velocity = 0;
        state.target = null;
      }
      busy = true;
    } else {
      // Free spin: ease velocity towards the cruise speed (momentum = longer time constant).
      const tau = 0.18 + s.momentum * 1.5;
      state.velocity += (cruise - state.velocity) * (1 - Math.exp(-dt / tau));
      state.angle += state.velocity * dt;
      if (cruise === 0 && s.snap && Math.abs(state.velocity) < SETTLE_SPEED) {
        const goal = nearest(state.angle);
        // Already resting on a slot: stay idle. (The React original re-armed the spring here on
        // every frame, so its RAF never stopped once autoplay was off or paused.)
        if (Math.abs(goal - state.angle) < 0.004 && Math.abs(state.velocity) < 0.03) {
          state.angle = goal;
          state.velocity = 0;
        } else {
          state.target = goal;
        }
      }
      busy = busy || cruise !== 0 || Math.abs(state.velocity) > 0.01 || state.target !== null;
    }

    if (s.autoplay === 'step' && !paused && !state.intro && state.introDone) {
      if (!state.stepAt) state.stepAt = now + s.interval * 1000;
      if (now >= state.stepAt) {
        state.target = (state.target ?? nearest(state.angle)) + s.step * state.dir;
        state.stepAt = now + s.interval * 1000;
        busy = true;
      }
      // Between steps the ring is still: sleep until the next one instead of spinning the RAF.
      state.wakeAt = state.stepAt;
    } else {
      state.stepAt = 0;
    }

    // Autoplay resumes when a hold ends, wake up then (a timer, not 60 idle frames a second).
    if (now < state.holdUntil && s.autoplay !== 'off' && s.autoplay != null) {
      state.wakeAt = state.wakeAt ? Math.min(state.wakeAt, state.holdUntil) : state.holdUntil;
    }

    // Parallax lean towards the mouse.
    const ease = 1 - Math.exp(-dt / 0.35);
    const aimYaw = state.pointer.inside ? state.pointer.x * s.parallax * 9 : 0;
    const aimPitch = state.pointer.inside ? -state.pointer.y * s.parallax * 6 : 0;
    state.yaw += (aimYaw - state.yaw) * ease;
    state.pitch += (aimPitch - state.pitch) * ease;
    if (Math.abs(aimYaw - state.yaw) > 0.01 || Math.abs(aimPitch - state.pitch) > 0.01) busy = true;

    return busy;
  }

  /** Writes transforms for camera, ring and cards; updates the active index. */
  function render(now) {
    if (!s.count) return;
    const elapsed = state.intro ? now - state.intro.start : 0;
    const swell = 1 + s.stretch * 0.12 * Math.min(1, Math.abs(state.velocity) / 420);
    let spinOffset = 0;
    if (state.intro?.type === 'spin') {
      const p = easeOut(clamp(elapsed / INTRO_LENGTH.spin, 0, 1));
      spinOffset = -300 * state.dir * (1 - p);
    } else if (state.intro?.type === 'assemble') {
      const p = easeOut(clamp(elapsed / INTRO_LENGTH.assemble, 0, 1));
      spinOffset = -32 * state.dir * (1 - p);
    }
    const angle = state.angle + spinOffset;
    const R = s.radius * swell;

    if (s.axis === 'x') {
      camera.style.transform = `translate3d(0, 0, ${-R}px) rotateY(${s.tilt + state.yaw}deg) rotateX(${state.pitch}deg)`;
      ring.style.transform = `rotateX(${-angle}deg)`;
    } else if (s.layout.inward) {
      camera.style.transform = `translate3d(0, 0, ${s.perspective - 1}px) rotateX(${s.tilt + state.pitch}deg) rotateY(${state.yaw}deg)`;
      ring.style.transform = `rotateY(${angle}deg)`;
    } else {
      camera.style.transform = `translate3d(0, 0, ${-R}px) rotateX(${s.tilt + state.pitch}deg) rotateY(${state.yaw}deg)`;
      ring.style.transform = `rotateY(${angle}deg)`;
    }

    for (let index = 0; index < s.count; index++) {
      const card = cards[index];
      if (!card) continue;
      const base = slotOf(index) * s.step;
      const mod = introCard(elapsed, base);
      const r = R * mod.radius;
      let transform;
      if (s.axis === 'x') {
        transform = `rotateX(${-base}deg) translateZ(${r}px)`;
      } else if (s.layout.inward) {
        transform = `rotateY(${base}deg) translateZ(${-r}px)`;
      } else {
        transform = `rotateY(${base}deg) translateZ(${r}px)`;
        if (s.layout.billboard) transform += ` rotateY(${-(base + angle)}deg)`;
      }
      if (mod.lift) transform += s.axis === 'x' ? ` translateX(${mod.lift}px)` : ` translateY(${mod.lift}px)`;
      card.style.transform = transform;

      const world = wrap(base + angle);
      const facing = Math.cos(world * TO_RAD);
      if (s.layout.inward) card.style.visibility = Math.abs(world) > 86 ? 'hidden' : '';
      else if (card.style.visibility) card.style.visibility = '';
      const fade = s.depthFade * Math.pow((1 - facing) / 2, 1.25);
      card.style.setProperty('--cc-depth', fade.toFixed(3));
    }

    const slot = ((Math.round(-state.angle / s.step) % s.count) + s.count) % s.count || 0;
    const index = slotOf(slot);
    if (index !== active) setActive(index);
  }

  function frame(now) {
    raf = 0;
    if (destroyed || !s.count) return;
    const dt = state.last ? Math.min((now - state.last) / 1000, 0.05) : 1 / 60;
    state.last = now;
    const busy = advance(dt, now);
    render(now);
    if (!visible || document.hidden) {
      state.last = 0;
    } else if (busy) {
      raf = requestAnimationFrame(frame);
    } else {
      state.last = 0;
      if (state.wakeAt) {
        sleepTimer = setTimeout(() => {
          sleepTimer = 0;
          wake();
        }, Math.max(0, state.wakeAt - performance.now()) + 4);
      }
    }
  }

  function wake() {
    if (sleepTimer) {
      clearTimeout(sleepTimer);
      sleepTimer = 0;
    }
    if (!raf && !destroyed && s.count && visible && !document.hidden) raf = requestAnimationFrame(frame);
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    clearTimeout(sleepTimer);
    sleepTimer = 0;
    state.last = 0;
  }

  /* ================================================================================================
   * Navigation
   * ============================================================================================= */

  function focusIndex(index) {
    if (!s.count) return;
    const item = ((Math.round(num(index, 0)) % s.count) + s.count) % s.count;
    let target = -slotOf(item) * s.step;
    target += 360 * Math.round((state.angle - target) / 360);
    state.target = target;
    state.holdUntil = performance.now() + 2800;
    wake();
  }

  /** Moves `slots` positions round the ring (positive = angle decreases), stacking rapid calls. */
  function stepSlots(slots) {
    if (!s.count) return;
    const base = state.target ?? Math.round(state.angle / s.step) * s.step;
    state.target = base - slots * s.step;
    state.holdUntil = performance.now() + 2800;
    wake();
  }

  // React's stepBy(delta): arrow keys move the ring the way they point (inward rings flip).
  const stepBy = delta => stepSlots(delta * s.dragSign);

  /* ================================================================================================
   * Events
   * ============================================================================================= */

  function updatePointer(event) {
    const rect = root.getBoundingClientRect();
    const pointer = state.pointer;
    pointer.x = clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
    pointer.y = clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
  }

  function onPointerDown(event) {
    state.suppressClick = false;
    if (!s.draggable || event.button !== 0) return;
    state.press = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      angle: state.angle,
      moved: false,
      origin: 0,
      samples: [{ time: performance.now(), angle: state.angle }]
    };
  }

  function onPointerMove(event) {
    if (event.pointerType === 'mouse') {
      state.pointer.inside = true;
      updatePointer(event);
    }
    const press = state.press;
    if (!press || press.id !== event.pointerId) {
      wake();
      return;
    }
    // The button was released somewhere we never heard about (e.g. outside the window before
    // the drag threshold took pointer capture): end the press instead of dragging with no button.
    if (event.pointerType === 'mouse' && event.buttons === 0) {
      endPress(press, event.pointerType);
      return;
    }
    const delta = s.axis === 'x' ? event.clientY - press.y : event.clientX - press.x;
    const cross = s.axis === 'x' ? event.clientX - press.x : event.clientY - press.y;
    if (!press.moved) {
      if (Math.abs(delta) < DRAG_THRESHOLD) return;
      // Touch gestures that are mostly across the ring are page scrolls: let them go.
      if (Math.abs(cross) > Math.abs(delta) * 1.2 && event.pointerType !== 'mouse') {
        state.press = null;
        return;
      }
      press.moved = true;
      press.origin = delta;
      state.drag = true;
      state.target = null;
      state.velocity = 0;
      root.setAttribute('data-dragging', '');
      try {
        root.setPointerCapture(event.pointerId);
      } catch {
        /* pointer already gone */
      }
    }
    const perPixel = 180 / (Math.PI * s.radius * state.fit);
    state.angle = press.angle + (delta - press.origin) * perPixel * (s.layout.inward ? -1 : 1);
    const now = performance.now();
    press.samples.push({ time: now, angle: state.angle });
    while (press.samples.length > 2 && now - press.samples[0].time > 110) press.samples.shift();
    wake();
  }

  function onPointerRelease(event) {
    const press = state.press;
    if (!press || press.id !== event.pointerId) return;
    endPress(press, event.pointerType);
  }

  /** Ends a press: a plain click does nothing more; a drag is released with momentum/snap. */
  function endPress(press, pointerType) {
    state.press = null;
    if (!press.moved) return;
    state.drag = false;
    root.removeAttribute('data-dragging');
    try {
      if (root.hasPointerCapture?.(press.id)) root.releasePointerCapture(press.id);
    } catch {
      /* pointer already gone */
    }
    state.suppressClick = true;
    const first = press.samples[0];
    const last = press.samples[press.samples.length - 1];
    const span = (last.time - first.time) / 1000;
    const velocity = span > 0.008 ? clamp((last.angle - first.angle) / span, -1400, 1400) : 0;
    state.velocity = velocity;
    // A throw sets the autoplay direction.
    if (Math.abs(velocity) > 60) state.dir = Math.sign(velocity);
    const coasting = s.autoplay === 'drift' && !(s.pauseOnHover && state.hover && pointerType === 'mouse');
    if (s.snap && !coasting) {
      const tau = 0.18 + s.momentum * 1.5;
      state.target = Math.round((state.angle + velocity * tau * 0.55) / s.step) * s.step;
    }
    wake();
  }

  function onPointerEnter(event) {
    if (event.pointerType !== 'mouse') return;
    state.hover = true;
    wake();
  }

  function onPointerLeave(event) {
    if (event.pointerType === 'mouse') {
      state.hover = false;
      state.pointer.inside = false;
    }
    // A press that never became a drag has no pointer capture, so its pointerup may land
    // outside the carousel: forget it now rather than resurrect it on re-entry.
    if (state.press && !state.press.moved && state.press.id === event.pointerId) state.press = null;
    wake();
  }

  function onFocusIn() {
    // Only keyboard focus pauses autoplay (a mouse click focuses the root too, and React keeps
    // drifting after a click; hover-pause already covers the mouse).
    let keyboard = true;
    try {
      keyboard = root.matches(':focus-visible') || root.querySelector(':focus-visible') !== null;
    } catch {
      /* :focus-visible unsupported → treat all focus as keyboard focus */
    }
    if (state.focused !== keyboard) {
      state.focused = keyboard;
      wake();
    }
  }

  function onFocusOut(event) {
    if (event.relatedTarget && root.contains(event.relatedTarget)) return;
    if (state.focused) {
      state.focused = false;
      wake();
    }
  }

  function onClick(event) {
    if (state.suppressClick) {
      state.suppressClick = false;
      return;
    }
    const card = event.target.closest?.('[data-cc-index]');
    if (!card || !root.contains(card)) return;
    const index = Number(card.getAttribute('data-cc-index'));
    if (s.focusOnClick) focusIndex(index);
    opts.onItemClick?.(s.items[index], index);
  }

  function onKeyDown(event) {
    // Leave browser / OS shortcuts (Alt+ArrowLeft = Back, Ctrl+Home, …) alone.
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    // Any navigation key means the keyboard is in use: pause autoplay from here on.
    if (!state.focused) {
      state.focused = true;
      wake();
    }
    const forward = s.axis === 'x' ? 'ArrowDown' : 'ArrowRight';
    const backward = s.axis === 'x' ? 'ArrowUp' : 'ArrowLeft';
    if (event.key === forward) stepBy(1);
    else if (event.key === backward) stepBy(-1);
    else if (event.key === 'Home') focusIndex(0);
    else if (event.key === 'End') focusIndex(s.count - 1);
    else if (event.key === 'Enter' || event.key === ' ') opts.onItemClick?.(s.items[active], active);
    else return;
    event.preventDefault();
  }

  /** Horizontal trackpad swipes rotate the ring; vertical wheel scrolls the page as usual. */
  function onWheel(event) {
    if (!s.draggable || !s.count) return;
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : 0;
    if (!delta) return;
    event.preventDefault();
    const perPixel = 180 / (Math.PI * s.radius * state.fit);
    state.target = null;
    state.angle -= delta * perPixel * (s.layout.inward ? -1 : 1);
    state.velocity = -delta * perPixel * (s.layout.inward ? -1 : 1) * 30;
    state.holdUntil = performance.now() + 1600;
    clearTimeout(state.wheelTimer);
    state.wheelTimer = setTimeout(() => {
      state.wheelTimer = 0;
      if (s.snap) state.target = nearest(state.angle + state.velocity * 0.12);
      wake();
    }, 140);
    wake();
  }

  function onVisibility() {
    if (document.hidden) stop();
    else wake();
  }

  function onMotionChange() {
    reduced = Boolean(motionQuery?.matches);
    if (reduced && state.intro) {
      // Cut a running intro short, apply() alone would only stop future ones.
      state.intro = null;
      state.introDone = true;
    }
    apply();
  }

  const resizeObserver =
    typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => {
          measure();
          wake();
        })
      : null;

  const intersectionObserver =
    typeof IntersectionObserver === 'function'
      ? new IntersectionObserver(entries => {
          visible = entries[entries.length - 1].isIntersecting;
          if (visible) wake();
          else stop();
        })
      : null;

  const listeners = [
    [root, 'pointerdown', onPointerDown],
    [root, 'pointermove', onPointerMove],
    [root, 'pointerup', onPointerRelease],
    [root, 'pointercancel', onPointerRelease],
    [root, 'pointerenter', onPointerEnter],
    [root, 'pointerleave', onPointerLeave],
    [root, 'click', onClick],
    [root, 'keydown', onKeyDown],
    [root, 'focusin', onFocusIn],
    [root, 'focusout', onFocusOut],
    [root, 'error', onImageError, true], // <img> errors don't bubble: capture them
    [root, 'wheel', onWheel, { passive: false }],
    [document, 'visibilitychange', onVisibility]
  ];
  for (const [target, type, handler, options] of listeners) target.addEventListener(type, handler, options);
  motionQuery?.addEventListener?.('change', onMotionChange);
  resizeObserver?.observe(root);
  intersectionObserver?.observe(root);

  apply();

  /* ================================================================================================
   * Instance API
   * ============================================================================================= */

  const api = {
    /** Merges `partial` into the options and re-applies them (keeps the current angle). */
    update(partial = {}) {
      if (destroyed || !partial) return api;
      const previousIntro = opts.intro;
      opts = mergeOptions(opts, partial);
      // Changing the intro replays it (handy for previews; React only played it on load).
      if (opts.intro !== previousIntro && ready) {
        state.intro = null;
        state.introDone = false;
      }
      apply();
      return api;
    },
    /** Replaces the items (a new set of image sources reloads them and replays the intro). */
    setItems(items) {
      return api.update({ items });
    },
    /** Spins to item `index`. */
    focus(index) {
      if (!destroyed) focusIndex(index);
      return api;
    },
    /** Spins to the next item (in reading order: follows `rtl`). */
    next() {
      if (!destroyed) stepSlots(s.mirror ? -1 : 1);
      return api;
    },
    /** Spins to the previous item. */
    prev() {
      if (!destroyed) stepSlots(s.mirror ? 1 : -1);
      return api;
    },
    /** Pauses autoplay until play() (e.g. for a visible pause button, WCAG 2.2.2). */
    pause() {
      if (!destroyed) {
        state.halted = true;
        wake();
      }
      return api;
    },
    /** Resumes autoplay after pause(). */
    play() {
      if (!destroyed) {
        state.halted = false;
        wake();
      }
      return api;
    },
    /** True while autoplay is held by pause(). */
    get paused() {
      return state.halted;
    },
    /** Index of the item currently facing the viewer. */
    get active() {
      return active;
    },
    /** The carousel's root element. */
    get element() {
      return root;
    },
    /** Stops everything and removes the carousel from the DOM. */
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stop();
      cancelPreload();
      clearTimeout(state.wheelTimer);
      state.wheelTimer = 0;
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      for (const [target, type, handler, options] of listeners) target.removeEventListener(type, handler, options);
      motionQuery?.removeEventListener?.('change', onMotionChange);
      if (state.press) {
        try {
          root.releasePointerCapture(state.press.id);
        } catch {
          /* not captured */
        }
      }
      state.press = null;
      cards = [];
      caption = null;
      root.remove();
      if (INSTANCES.get(container) === api) INSTANCES.delete(container);
    }
  };

  INSTANCES.set(container, api);
  return api;
}

export default createCircularCarousel;
