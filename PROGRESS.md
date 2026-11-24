# Progress

## Now
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
