# Progress

## Now
- **Lock Short v17 (owner ✓ night look, 2026-11-28)**: all outside shots at night (porch lamp + lit window + a little
  moonlight, darkness mask), close low camera, door cropped like a wall. Bush far away: he rises from it and takes six
  careful steps (~2.5 s) out of the dark into the lamp light, glances over his shoulder, then the key goes in on "lock".
  Real struggle (turn blocked → other way → jiggle → hand braced on the door, hard turn on "won't" → lets go, sighs →
  deadpan look). To fit the walk the voice starts 1.2 s later: transcript_v17.json / voice_v17.wav / words-liam17,
  events v7_events_liam17.json, SFX sfx_v7_liam17.wav (D2EV=assets/audio/door2d_events_v17.json). The 3D middle is
  reused from v9 shifted by 36 frames (only the 2D parts were rendered). Render: renders/lock-short-v17.mp4.
  Rebuild: `python3 build_v7.py assets/transcript_v17.json assets/audio/voice_v17.wav liam17`.
- **Night look concept (owner 2026-11-28, late)**: owner: too cartoonish → make it NIGHT, no walkway running off to
  the right, crop so the door reads like a wall he's sticking the key into. Built in door2d.js (night palette + porch
  lamp light + falloff; day kept behind window.DOOR2D_DAY). One still sent for approval:
  videos/lock-short/deliver/night-concept-frame.png. Next: on owner ✓, tighten all outside shots to this close crop and
  re-render v17.
- **Lock Short v16 (owner notes 2026-11-28, evening)**: camera low (near eye level) facing the house front, starting
  between the bush and the door and moving in close; he rises from the bush, walks a few steps along the walkway,
  stops, glances over his shoulder and at the camera, then puts the key in (at "lock", 1.42 s) and twists 5×.
  Grown-up faces: smaller eyes, no gritted teeth / star eyes / bug eyes; door-open reaction = cool smirk + small fist
  pump. Render: videos/lock-short/renders/lock-short-v16.mp4. Waiting for owner ✓ + new title. Owner says the
  video will be adjusted again later.
- **Lock Short v15 (owner notes 2026-11-28)**: camera raised and to his right so the yard, a wide sidewalk and the
  front step are clearly visible; he peeks over a bush, takes three big sneaky steps along the sidewalk, faces the
  door; taller/slimmer; clean V cheer with star eyes; bug eyes when the key pops; keyhole zoom lands on the slot.
  Render: videos/lock-short/renders/lock-short-v15.mp4. Waiting for owner ✓ + new title.
- Reference Short (youtube.com/shorts/_vcLT_kLGUk) analysed with ViewMax: 3D cel-shaded stickman "You are…" story,
  hard cut every 3–6 s with 1–2 s sub-cuts, camera always moving, extreme expressions (star eyes, bug eyes, sweat).
  Notes in docs/LESSONS.md.
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
