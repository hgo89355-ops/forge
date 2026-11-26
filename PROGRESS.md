# Progress

## Now
- **Lock Short v13 (2D outside, owner request 2026-11-26)**: every outside shot is now flat 2D cartoon (lib/components/
  guide2d.js character with bendy rubber-hose limbs + lib/components/door2d.js house-front scenes). Story: hides in a bush,
  peeks, tiptoes to the door, puts the key in and keeps twisting (6 tries, gets desperate, foot on the door), freezes,
  deadpan stare, points at the keyhole, camera dives into the keyhole → the 3D pin explanation (unchanged). Right key →
  door swings open, he jumps and cheers. End: twists the wrong key, yanks, it pops, pratfall, deadpan stare, back to the
  bush (loops). Only segments A (0–4.2 s), B (19.2–19.87 s), C (24.07 s–end) re-rendered and spliced into v9 →
  videos/lock-short/renders/lock-short-v13.mp4 (sound: new tiptoe steps + bush rustle, sfx_v13.py). Turn 2D off with `window.DOOR2D = false`.
- Waiting for the owner: ✓ on v13 + a new title (copycat uses "How a Lock Knows Your Key"). Owner's earlier message
  cut off ("So then just maybe make…"); Creative Engine Parts B–E never arrived.
- Older renders (v6–v12, 3D outside scenes) are kept in videos/lock-short/renders/ for comparison only.
- Rebuild: `python3 build_v7.py assets/transcript_v6.json assets/audio/voice_v6.wav liam` (copies of guide2d.js and
  door2d.js live in videos/lock-short/assets/components/ — copy again from lib/ after edits).

## Next up
- Pick a fresh title (not "How a Lock Knows Your Key" — taken by a copycat).
- Escalator Short with the stickman (component, script, sources ready), then the Sunday long video.
- Bonus 6–10 s silent "right key vs wrong key" loop.
- Renders take ~40 min for a 27 s Short with the 3D guide: run with a 90-minute background limit.
