# Progress

## Now
- **Channel setup kit (2026-11-28)**: channel/CHANNEL_SETUP_PROMPT.md (paste into the Claude Chrome extension; it sets
  name/handle/description/keywords/branding/upload defaults = Unlisted, category, comments, playlists; stops for any
  password/code), channel/avatar.png + channel/banner.png (made in code), channel/POST_LAUNCH_ANALYSIS_PROMPT.md
  (read-only Studio numbers 48 h / 7 days after posting). From the owner's reference video (ViewMax analysis of
  "Complete Blueprint to Create a Faceless AI YouTube Channel"): 2-step verification, proper channel setup, phone
  verification, channel keywords, upload as Unlisted then publish, rename the file to the title, auto-dubbing.
  Channel name "Hidden Engineering" is my recommendation — owner can change it before pasting the prompt.
- **Long video #1 plan (awaiting owner ✓)**: videos/lock-long/PLAN.md — ~5½ min, 6 chapters (ancient wooden lock →
  Yale → inside the pins → master keys → why no lock is perfect → better/smart locks), burglar story throughout,
  3 thumbnail variants for Test & Compare. vidIQ check on Nov 30; first long video ≈ Dec 8.
- **Owner guide**: channel/OWNER_STEP_BY_STEP.md (7 phases, 33 steps; owner does security/phone/upload; the extension
  does Studio settings via channel/CHANNEL_SETUP_PROMPT.md in parallel).
- **Lock Short v21 (owner 2026-11-28)**: same as v20 but the part after the hook plays at 1.12× (owner couldn't hear
  1.05×) → 25.6 s. Render: renders/lock-short-v21.mp4. Waiting for owner ✓ + title.
- New channel / spam check (owner asked): no official waiting period exists; YouTube's spam policy targets fake
  engagement, bulk/automated uploads and re-uploads, not new channels posting original work. Plan: finish the
  channel basics (name, picture, banner, description), upload by hand, 1–2 Shorts a day max at first, never buy views.
- **Lock Short v20 (owner 2026-11-28)**: stronger effort face while he pulls (new 'maxEffort' expression: squeezed
  eyes, hard brows, clenched teeth; head jerks back on each yank; strain lines). Everything after the hook (5.4 s →
  end) plays at 1.05× (video setpts, audio atempo — voice pitch unchanged) for retention → 26.99 s.
  Render: renders/lock-short-v20.mp4. Waiting for owner ✓ + title.
- **Lock Short v19 (owner 2026-11-28)**: hook "A burglar is sneaking into your house in the middle of the night. But he
  can't get in. And the reason is hiding inside." (Liam take B, starts 0.26 s; anchors 'burglar>wrong', 'but>lock',
  'cant>wont'). Low, hunched tiptoe sneak; freezes at a sound (head snaps, eyes wide, then worried); key in → blocked
  → eyes widen → full-body pull (braced legs, leaning back, rhythmic yanks) while the camera pushes in → keyhole dive.
  Owner feedback saved permanently in docs/OWNER_TASTE.md (linked from CLAUDE.md). View estimate:
  deliver/VIEW_PREDICTION_v19.md (3K–20K most likely). Render: renders/lock-short-v19.mp4.
- **Lock Short v18 (owner 2026-11-28)**: new spoken hook "Your neighbor is sneaking into your house at 2 a.m. But his
  key won't turn. And the reason is hiding inside." (ElevenLabs Liam, eleven_v4, take A, pauses trimmed, ×1.08,
  starts at 0.2 s; 216 free-tier credits). Approach = three bursts of quick steps (3+3+2) with stops to look around
  (behind him, at the camera); key in on "key", struggle fills "won't turn", let-go + deadpan + gesture + keyhole dive
  on "the reason is hiding inside". Everything after 5.4 s is unchanged from v17 (only 0–5.4 s re-rendered).
  Files: transcript_v18.json, voice_v18.wav, words-liam18.js (sets window.FILM_ORDER aliases 'neighbor>wrong',
  'key>lock'), v7_events_liam18.json (ORDER env), door2d_events_v18.json, sfx_v7_liam18.wav.
  Render: renders/lock-short-v18.mp4. Waiting for owner ✓ + title.
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
