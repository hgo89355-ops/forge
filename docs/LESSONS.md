# Lessons (what worked / what failed)

Add 1–3 lines at the end of every run. Newest at the bottom.

## 2026-11-18
- Worked: Three.js scene + flat 2D canvas characters + Playwright frame capture + ffmpeg (vending-machine
  test, 60 s). CPU-only rendering ≈ 5 s per 1080×1920 frame per worker; 4 workers ≈ 30 min for 60 s.
- Worked: HyperFrames (plugin 0.9.65) SVG + GSAP scene drawn from a pure `stateAt(t)` function, driven by
  the timeline's onUpdate + an `hf-seek` listener. `snapshot --at …` gives contact sheets to review.
- Worked: physically-driven lock cutaway (real Schlage-style numbers); unit-test the physics in node
  before animating (gaps 0.000 mm with the right key, 0.762 mm with the wrong one).
- Voice: Kokoro via `kokoro-onnx` + model files from the kokoro-onnx GitHub release (the torch install
  from download.pytorch.org is blocked). ElevenLabs generation works on the free tier, but downloading
  from elevenlabsusercontent.com needs that host allowed AND the download was refused by the
  auto-permission check — fall back to Kokoro or ask the owner.
- faster-whisper: set `HF_HUB_DISABLE_XET=1` (the xet CAS host is blocked); PyAV 19 breaks its file
  decoding — decode with ffmpeg to a 16 kHz float array and pass the array.
- Fact-check: only Wikipedia opened from the build machine; other sites came back as search snippets.
  Mark snippet-only sources in SOURCES.md.
- Draft review lesson: the first layout made the machine and the sidekick too small — hero ≥ 50% of the
  frame, character ≈ 15–20% of the frame height.
- v4 build: offline CSG (three-bvh-csg in node) → JSON geometry loaded by a plain <script>; Three.js r158 UMD
  vendored locally. HyperFrames render of 39 s 9:16 3D at 30 fps: 15m44s on 4 CPU workers (software GL).
- Character rule that fixed most critic notes: guide on top of the machine in wide shots, on the floor for
  push/pull actions, off-camera in close-ups. Pick wide-shot camera distance so machine + guide fit above captions.
- Frame Critic: 3 rounds took the film from mostly 5–7 to mostly 8; the weakest scenes were the ones built
  last (key grid, ancient lock) — schedule extra time for scenes that leave the main machine.
- v5 pacing: anchor every shot to a spoken word (sequential word search) so a new voice re-times the film
  automatically; the pacing checker (lib/critic/pacing_check.py) fails v4 on length, 11 long silences and a dead end.
- ElevenLabs can be down (timeouts / HTTP 500). Never retry a generation after a timeout — it may still charge;
  retry the free usage call first to see if the service is back.

## 2026-11-23
- ElevenLabs Liam (eleven_v4) full Short read = 422 credits for 395 characters (≈ 1.07 credits/char), 29.2 s raw.
  lib/audio/trim_pauses.py cut 11 pauses to 0.18 s → 26.8 s with no silence > 0.2 s. Download from
  elevenlabsusercontent.com worked this time with plain curl.
- Character v2: draw limbs as tapered filled outlines (outline pass, then fill pass) and outline shirt + sleeves
  together so they read as one garment; round end caps must be built as explicit points (SVG arcs flipped the wrong way).
- Door shots: a 168 cm guide next to a lock at ~95 cm can't share a 9:16 frame with lower-third captions. Use an
  extreme close-up (hand + key + lock only) for the hook, and wide shots (≥ 380 cm away) with IK hand-on-key for the story.
- Background renders stop at the 30-minute default limit (v6 died at 93%). Start renders with a 90-minute limit.
- Topic research: search the exact topic sorted by view count with duration=short as well as outliers — the first pass
  missed Zack D. Films' 16.5M "How A Keys Unlocks" Short. Also check for copycats from the last 60 days.

## 2026-11-24
- ElevenLabs voice cloning needs a paid plan (free plan: 0 cloning; Starter ≈ $6/mo) — owner chose to record his own
  voice instead. Vocaroo is blocked by this machine's network; take recordings through Google Drive.
- 3D guide in Three.js: lathe limbs + deformed-sphere head + one sculpted hair shell (hairline mask, swept quiff,
  strand ridges) look far more real than cone spikes. Eyes must sit proud of the head surface or they vanish.
  Euler order 'ZXY' on the shoulder (twist, then forward, then out) makes poses easy to reason about.
- Hand on an object: two-bone IK onto the key bow; in an extreme close-up scale the key up (0.22) and pull the camera
  back (~70 cm) so the real-size hand doesn't hide the key.
- Owner rejected the realistic 3D guide ("awful") and chose a 3D stickman in the signature look (cap + tee). Show
  a pose sheet + face close-up before building scenes around a new character — it took ~20 min to make, vs ~40 min a render.
- 3D ink outlines: inverted hull (BackSide material, vertices pushed along normals in onBeforeCompile) gives the
  2D brand's black line on a 3D figure for free.
- Owner feedback on the stickman: loose pants (not stick legs), many facial expressions, and a cap that doesn't read as a
  police cap (no band, no badge-sized logo, six panels + curved brim). Faces: swap whole parts (white eyes + pupils for
  panic, arcs for joy, gritted-teeth bar, wavy mouth, blush) and add blinks every ~2.3 s.
- View prediction method: compare (A) every same-topic Short from small channels in the last ~2 months (the realistic
  median) with (B) top breakout Shorts in the niche (the ceiling). Lock topic median ≈ 2.4K views; 1 in 14 broke out.
- Toon 3D character (hero3d.js): MeshToonMaterial + a 3-step DataTexture ramp (NearestFilter) + inverted-hull outline
  gives a cel look that still matches the 3D machines. Faces as CanvasTextures on a shell over the head front
  (150°×110° sphere patch, u flipped) make expressions cheap to add. Check close-ups at the right canvas size —
  a mismatched viewport rendered blank frames.
- "Less bot-like" movement, deterministic: evaluate the pose function at t − 0.07 s for the head and t − 0.1 s for the
  arms (overlapping action), add sum-of-sines micro-motion (breath, weight shift, head micro-looks), replace jitter with
  slow smooth effort cycles, and cross-fade pose changes over ~0.3 s. Refined edges = thinner outline (0.4 cm body,
  0.26 cm small parts) + denser geometry (40-segment limbs, 72-segment torso) + heavier bevels on the shoes.
- Natural reactions read better than more motion: react ~0.12 s after the cue word, hold a 0.15 s "freeze" face before
  a big reaction, flick the eyes between object and camera, drop the head before an "oops", and spring (not lerp) into
  the new pose. Release IK before hands go to the head so the arm doesn't snap.
- Hair notes from the owner: "curly" = a curly top with a short taper (ringlet spirals on top falling forward over the
  forehead, close sides), not a dome of blobs. Ask for a reference photo before restyling hair; it saved two rounds.
  Dark-charcoal hair (#33363F) instead of pure black lets the outline show individual curls.
- Owner feedback: personality beats polish. A character "toy" that only poses reads childish; give him intent and
  comedy beats (sneak, yank, pratfall, deadpan stare to camera) with holds. New moves live in Hero3D.ANIM (sneak, tug,
  sit, adjustPhones) and expressions (suspicious, deadpan, annoyed).
- Re-render only what changed: `hyperframes render --start/--end` for the changed shots, then
  `python3 lib/render/splice.py base.mp4 out.mp4 FRAME:seg.mp4 …` (frame-exact, keeps base audio). Door-scene-only
  re-render of the lock Short ≈ 12 min instead of ≈ 40. Pick cut frames inside shot boundaries (30 fps).
- three.js gotcha: materials that differ only in onBeforeCompile share one cached shader program — set
  `customProgramCacheKey` or every outline gets the first one's thickness. (Our outlines were silently thin until fixed.)
- Owner's target style = flat 2D-looking toon (Rick's-Clips-like): 2-step ramp + 50% emissive for flat colour, thick
  outline (1.45 cm body), bold straight eyebrows, black stick limbs; customised with our hair, headphones and tee.
- Never put the character in a void: every story shot needs a place (house front with siding, porch, lawn, bushes,
  window, lamp, sky). Give him something to hide behind or lean on — it creates action and depth for free.
- "Walks like a box" fix: step–pause rhythm with eased steps, knee lift only on the stepping leg, hips side-sway,
  shoulders counter-twist, body rises on each step; keep the root moving with the steps so feet don't slide.
- 2026-11-26: owner rejected the 3D outside scenes ("too boxed", "looks like a bot"). Flat 2D SVG with rubber-hose
  limbs (quadratic curves shoulder→hand, hip→foot) reads flexible and alive instantly, and renders far faster than 3D.
  Feet live in ground space so crouch/bob/sit move only the hip (no sliding). `Guide2D.reach()` puts a hand exactly on a
  point (key bow) — use it for every grab. 2D→3D handoff: exponential zoom into the keyhole + 0.15 s darken, then cut.
- Pin 2D action to the existing SFX times (clacks, pop, thud) so a video-only re-render can keep the old audio.
- 2026-11-28: a 3/4 side view in flat 2D = one oblique projection P3(xw,y,z) for every wall/ground shape; the key
  then points at the character and the twist shows as the bow narrowing. Taller/slimmer: change only guide2d.js
  constants (LEG, BRY, BRX), poses keep working because feet are in ground space.
- YouTube links can't be opened from this workspace; vidIQ's watcher needs credits (10 per Short).
- Pacing reference (owner, 2026-11-28; ViewMax analysis of a stickman story Short): hard cut every 3–6 s, quick
  1–2 s sub-cuts inside a scene, camera never static (dolly/pan/track), comedic gag every 2–3 s, extreme cartoon
  expressions (star eyes on wins, bug eyes + jaw drop on shock, sweat drops on stress), pose-to-pose with short holds.
- 2D staging: owner wants to SEE where he stands. Raise the oblique camera (ZY ≈ 0.5) so the ground plane, sidewalk
  and step read clearly; side-on/edge-on ground (ZY < 0.2) looks like he stands on a thin strip.
- YouTube links can't be fetched here, but ViewMax analyze_video can watch them (≈2 credits for a Short; slow, ~10 min).
