# Progress

## Now
- **Lock Short v5 (fast Zack-style cut)** — built: word-anchored shots (videos/lock-short/assets/film5.js), mini-story
  with the guide at a front door, loop ending, bigger lower-third captions, v5 sound effects. Draft render with a
  temporary Kokoro voice is for pacing checks only.
  - BLOCKED: ElevenLabs is returning server errors/timeouts (2026-11-18), so the 3 hook voice samples are not made
    yet. Retry, let the owner pick, then: transcribe → `python3 build_v5.py <transcript> <voice>` → render.
  - Pacing checker: lib/critic/pacing_check.py (automatic fails). v4 numbers: deliver/pacing-v4.json.
- **Escalator Short** — started: lib/components/escalator3d.js (physics works: steps stay level, flip at the top,
  return upside down on two tracks); SCRIPT.md + SOURCES.md fact-checked. Next: guide story shots + render.
- v4 lock Short still waiting for the owner's ✓ (videos/lock-short/renders/lock-short-v4.mp4).

## Next up
- Make the 3 ElevenLabs hook samples (≈ 70–80 credits each with flash/v4 — measure), owner picks.
- Finish the escalator Short; then the Sunday long video (escalator, 8–10 min, one chapter per day).
