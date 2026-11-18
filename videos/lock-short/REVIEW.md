# REVIEW — "How a Lock Knows It's Your Key" (style v4 test, 9:16, 39 s)

## Creative calls
- Rebuilt the half-finished flat-diagram version in the owner's v4 look: Three.js 3D cutaway (steel housing,
  brass plug, blue key pins, red driver pins, steel springs, yellow → green shear line), white label boxes,
  blue-bar title tag, and the owner's character as a code rig (lib: assets/components/guide.js).
- The plug physically can only turn when every gap is on the shear line (|gap| < 0.05 mm); the wrong key is
  cut 0.76 mm too deep at pin 3 and the plug is clamped to ~2° of play — checked in code, visible in frames.
- Guide rule: on top of the lock in wide shots, on the floor when pushing the key, off-camera in close-ups.
  Jokes: stomps on a locked plug (oops), strains on the wrong key, gets bonked by a falling key.
- Storylines not built: the flat 2D diagram version (first draft) — kept as LockCutaway's 2D renderer.

## Frame Critic (3 rounds, scores out of 10, from the contact sheets)
| Scene | R1 | R2 | R3 (final) | Note |
|---|---|---|---|---|
| Hook 0–2.7 s | 7 | 8 | 8 | Lock slightly cropped on the right |
| Pins & springs 2.8–7.5 s | 5 | 8 | 8 | Guide removed from the close-up (was cropped) |
| Locked 7.6–11.6 s | 8 | 8 | 8 | |
| Right key in 11.7–14.3 s | 8 | 8 | 8 | |
| Gaps line up 14.3–19 s | 8 | 8 | 8 | |
| Click / turn 19–20.5 s | 8 | 9 | 9 | Best shot |
| Wrong key in 20.5–21.8 s | 7 | 6 | 8* | *fixed after last look (key starts closer) — checked in the final render |
| 0.76 mm close-up 21.8–23.1 s | 6 | 7.5 | 7.5 | Busy: title tag overlaps the pin tops |
| Jams 23.1–24.3 s | 6 | 8 | 8 | |
| Several heights 24.3–26.9 s | 5 | 8 | 8 | |
| 79,666 keys 26.9–29 s | 5 | 6 | 7 | Keys look pale grey; grid crowds the counter |
| Ancient lock 29–34.7 s | 6 | 6 | 7 | Wooden lock is simple boxes; reads, but plain |
| Outro 34.9–39 s | 5 | 8 | 8 | |

Honest verdict: 10 of 13 scenes reach 8+; three sit at 7–7.5 after the 3 allowed rounds (the close-up, the key
grid, the ancient lock). Fine for a style test; I would polish those three before publishing.

## Measured vs looked at
- Measured: physics gaps (unit test), word timings (faster-whisper), pin-click times (from the physics),
  `hyperframes check` (0 errors). Audio levels measured on the render, **not heard** by anyone.
- Looked at: contact sheets of every scene (3 rounds) and the final render's sheet.

## Weakest shot / next time
- The 79,666-keys grid: make the keys brass-coloured and stagger them in depth, move the counter above them.
- Ancient lock: add wood grain texture and a door, and show the key lifting more slowly.
