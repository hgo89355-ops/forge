# Progress

## Now
- **Lock Short v6** — rendered: videos/lock-short/renders/lock-short-v6.mp4 (26.9 s, Liam voice, character v2,
  competitor-style captions, loop ending). Approval card: videos/lock-short/deliver/APPROVAL_CARD_v6.md.
  Pacing checks PASS. Waiting for the owner's ✓ (test/style video — never publish without it).
  Rebuild: `python3 build_v6.py assets/transcript_v6.json assets/audio/voice_v6.wav`, SFX: `node tests/v6_events.cjs >
  assets/audio/v6_events.json && /home/user/tts-venv/bin/python sfx_v6.py`.
- **Character v2** — lib/components/guide.js (human shape). Copy to each video's assets/components/.
- **Escalator Short** — component + script + sources done (lib/components/escalator3d.js). Next: guide story shots
  using the v6 framework (door-hook → dive inside → payoff → twist → loop), Liam voice (~420 credits), render.

## Next up
- Bonus 6–10 s silent "Right key vs Wrong key" loop (reuse film6.js shots).
- Escalator Short, then the Sunday long video (escalator, 8–10 min, one chapter per day).
- Renders take ~35 min for a 27 s Short: run them with a 90-minute background limit.
