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
