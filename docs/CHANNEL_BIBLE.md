# Channel bible (style v4)

Open this when making or reviewing any video. Owner-supplied references: the guide character sheet
(curious / oops / shocked / confident) and the escalator frame "The Two Hidden Tracks".

## 1. The look
- **Ground:** light cool grey studio (about #D8DCE0 → #E9ECEF), soft floor shadow under the machine.
- **The machine (hero, ≥ 50% of the frame):** stylized-realistic 3D cutaway made in Three.js:
  brushed steel and aluminium, glass shells cut away, rounded bevels, soft studio light (key upper-left,
  fill, rim), contact shadows. Cut faces are clean and readable.
- **Colour-coding of key parts** (one strong colour per part family, consistent across a video):
  moving parts that matter = saturated blue (#1F4FE0 / light #4FA3E8), drive parts = red (#D7262B),
  motors = orange (#F08A24), edges/trim = yellow (#F2C230). Everything else stays neutral metal.
- **Labels:** white rounded boxes (radius ~10 px), dark bold text (Inter 800), thin dark leader line
  ending in a white dot with a dark ring on the part. Labels appear when the voice names the part.
- **Title tag:** top-left, white box with a 12 px blue accent bar on its left; bold dark text.
- **Precision:** proportions, part counts and motion follow the real machine. A beautiful wrong diagram
  is worse than none.

## 2. The guide character
**Current (2026-11-24, owner decision): 3D stickman, signature look** — lib/components/stick3d.js, test sheet
videos/lock-short/tests/guide3d-sheet.html?rig=stick. Built in Three.js from code. ~165 cm.
- Head: big glossy white sphere with an ink outline; face = black oval eyes with a glint, ink brows, ink mouth
  (open mouths show a dark-red inside, teeth, tongue). Black messy hair tufts peek out under the cap.
- Signature cap: blue crown, white gear logo on the front, yellow brim and top button.
- Signature tee: blue (#1F4FE0), white gear logo on the left chest, yellow hem and sleeve trim.
- Black stick limbs (r ≈ 2 cm) with ink outlines, ball hands (a finger appears for "point"), white sneakers.
- Same API as the old rig: pose(), reach() (two-bone IK), POSES (idle, curious, oops, shocked, confident, point,
  wave, cheer, push, struggle). Shoot him from his front side; in close-ups grip the END of what he holds so the
  ball hand doesn't cover the subject.
- Retired: the realistic 3D guide (lib/components/guide3d.js) — owner rejected the look.

### Retired 2D rig (lib/components/guide.js)
- Young guy, messy swept black hair, white face/skin with black outlines, simple eyes and eyebrows,
  open expressive mouth.
- Blue short-sleeve tee (#1F4FE0) with a small white gear logo on the chest; dark navy slim jeans
  (#2A3347); white sneakers with grey laces.
- Flat 2D, bold even black outline, minimal shading (one soft shadow tone at most). Never 3D.
- Human build (v2, 2026-11-23): shaped head with jaw + ear, tapered arms/legs, hands with a thumb, shirt and sleeves
  outlined as one piece. Never boxy. In door/close-up shots his hand is placed on the object with two-bone IK.
- Moods: **curious** (hand on chin), **oops** (hand behind head, sheepish grin), **shocked** (hands up,
  open mouth, motion lines), **confident** (hands on hips, grin). Plus action poses: point, push, pull,
  struggle, jump, wave.
- Size: small next to the machine (he stands on it, peeks in, points). He is the sidekick, the machine
  is the star. 1–3 jokes per video (tries the wrong thing, gets surprised, gets bonked).
- Acting: mood changes go through anticipation → pose → settle; offset body parts; feet touch surfaces.

## 3. Motion
- Spring physics for arrivals (damping 0.55–0.8); camera moves ease in-out; no linear moves except
  rotation of machine parts that really rotate at constant speed.
- Something new every 2–3 s (part moves, label lands, camera moves, character acts).
- Transitions have a cause on screen (whip, zoom through a part, object becomes the world).

## 4. Words, captions, voice
- Script ≈ 2.2–2.7 spoken words per second; each claim checked (SOURCES.md per video).
- Captions (v6, competitor standard): white Inter 900 with a thick black outline, keywords in yellow (#FFD21F),
  1–3 words at a time, lower third (top ≈ 1150 px). Big word-timed groups, inside the safe area
  (Shorts: text between y 168 and 1330 px of 1920; not under the right-hand action rail).
- Voice: the owner's own recording is preferred (cut pauses with lib/audio/trim_pauses.py, re-time with the word anchors).
  Otherwise AI voice, labelled "AI voice" in the description. Default local Kokoro `am_fenrir` @ 1.0
  (free, commercial OK). ElevenLabs "Liam" works on the free tier but the free tier has no commercial
  licence and needs attribution — check before monetising.

## 5. Sound
- Sound effects made in code, only on visible actions (parts moving, clicks, whooshes on cuts, a
  "wrong" buzz). Peaks land one frame after the picture. Mix ≈ −14 LUFS, true peak ≤ −1 dBTP.
- Music: none yet (no free licensed source set up) — see OWNER_TODO.md.

## 6. Long videos and chapters
- 8–10 minutes, never longer. Built one chapter per day, assembled on Sunday.
- Description timestamps: first chapter at 0:00, at least 3 chapters, each ≥ 10 s, clear searchable
  chapter titles.
- Escalator draft chapters: hook (stuck on an escalator) → the two hidden tracks → why every step
  stays flat → chain + motor → handrail → the upside-down trip back → safety (comb plates, brakes,
  emergency stop) → recap.
- Reusable cutaways: build each machine as a component that works in 9:16 and 16:9, so Shorts and the
  long video share it.

## 7. Shorts pacing (from v5, automatic Frame Critic fails)
Run `python3 lib/critic/pacing_check.py <video.mp4> --voice <voice.wav>` on every Short. Automatic FAIL if:
longer than 35 s · any silence over 0.3 s · any 1.5 s with no visual change · no motion in the first second ·
end card longer than 0.5 s. Targets: 26–32 s, 75–85 words, speech from frame 1, pauses < 0.25 s, a cut on every
sentence, camera always moving, subject ≥ 60% of the frame, no "follow" line — end on a line that loops to the
first. Put the timing chart (duration, cuts per 10 s, total silence) on the approval card next to the last version.

## 8. Proven Short framework (from the 2026-11-23 research, videos/lock-short/RESEARCH.md)
0.0 s action + bold "If you…" line · problem shown before the explanation · "the reason is hiding inside" →
colour-coded cutaway · one shot per beat, camera always moving, 2–4-word captions · payoff + character win ·
tiny-difference twist · end on "and that's why…" back on frame 1 (loop) · quiet music bed + crisp mechanical
SFX. Also cut a 6–10 s silent "X vs Y" mechanism loop from every Short (the biggest lock videos are silent loops).
