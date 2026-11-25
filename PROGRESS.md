# Progress

## Now
- **Lock Short v12**: real place (house front, porch, bush, window, lamp, sky); he hides behind a bush, peeks, tiptoes
  out with a proper step rhythm; cheer beside the open door; falls toward camera. Door scenes spliced into v9 →
  renders/lock-short-v12.mp4. Owner's last message was cut off ("So then just maybe make…").
- **Lock Short v11** (final look: flat-toon stickman, white arms, thick black legs, curly top, headphones, bigger
  eyes) → videos/lock-short/renders/lock-short-v11.mp4. Waiting for owner ✓ + new title. Movement test:
  videos/character-test/renders/character-motion-10s.mp4 (waiting for owner feedback on motion).
- **Lock Short v11** (final look: full stickman 'rick', thicker legs, slimmer body) — door scenes re-rendered and spliced
  into v9 → renders/lock-short-v11.mp4. Then owner ✓ + new title → post.
- **Lock Short v9 (personality pass)** rendering: sneaks up suspiciously, strains, plants a foot and yanks the stuck key,
  deadpan stare, smug cheer, key pops out → pratfall → deadpan stare. Character = curly-top stickman, normal build.
  Personality bible: docs/CHARACTER.md (use in every video).
- **Lock Short v9** rendering with the stickman build (headphones, sculpted hair, natural reactions) →
  videos/lock-short/renders/lock-short-v9.mp4. Then owner's ✓ + a new title before posting.
- **Stickman build demo (awaiting owner ✓):** `Hero3D.create(THREE, { build: 'stick' })` — same design, big round head, simple
  body, normal-thickness limbs. Demo: videos/character-test/deliver/5-stickman-build-demo.png. If ✓: switch the films to
  build 'stick' and re-render the lock Short.
- **Master character = Hero3D (owner ✓ 2026-11-25)**: refined edges, human-like movement layers. Lock Short v8 with him is
  rendering → videos/lock-short/renders/lock-short-v8.mp4 (then owner's ✓ to publish).
- **Lock Short v7** — 3D stickman guide (lib/components/stick3d.js: normal blue baseball cap with a small gear logo +
  yellow brim, blue gear tee with yellow trim, loose navy pants, white sneakers, 14 expressions + blinks), Liam voice.
  Render: videos/lock-short/renders/lock-short-v7.mp4. Rebuild: `python3 build_v7.py assets/transcript_v6.json
  assets/audio/voice_v6.wav liam`; SFX: `WORDS=assets/words-liam.json node tests/v6_events.cjs > assets/audio/v7_events_liam.json
  && /home/user/tts-venv/bin/python sfx_v6.py assets/audio/v7_events_liam.json assets/audio/sfx_v7_liam.wav`.
  View prediction: deliver/VIEW_PREDICTION.md (most likely 2K–10K in 30 days). Waiting for the owner's ✓.
- Retired looks: 2D guide (guide.js), realistic 3D guide (guide3d.js).

## Next up
- Pick a fresh title (not "How a Lock Knows Your Key" — taken by a copycat).
- Escalator Short with the stickman (component, script, sources ready), then the Sunday long video.
- Bonus 6–10 s silent "right key vs wrong key" loop.
- Renders take ~40 min for a 27 s Short with the 3D guide: run with a 90-minute background limit.
