# Approval card — Lock Short v5 (fast cut) · DRAFT, not for publishing

**Status:** waiting for the owner to pick a voice (ElevenLabs was down when this was made — samples follow).
The draft uses a temporary local voice only to check pacing. The final re-times automatically to the chosen voice.

## Timing chart (measured by lib/critic/pacing_check.py)
| | v4 (rendered) | v5 draft | Target / rule |
|---|---|---|---|
| Duration | 39.0 s | 24.4 s* | 26–32 s (fail > 35 s) |
| Cuts per 10 s | 1.0 | 6.2 | something new every 1–2 s |
| Total silence | 5.8 s | 0.0 s | any silence > 0.3 s = fail |
| Silences > 0.3 s | 11 | 0 | 0 |
| 1.5 s stretches with no change | 1 (36–38.8 s) | 0 | 0 |
| Motion in first second | yes | yes | required |
| Static end card | ~2.5 s (camera drift) | 0 s | ≤ 0.5 s |
| **Pacing checks** | **FAIL** | **PASS** | |

*The temporary voice is fast; the real ElevenLabs read should land at about 27–29 s.

## What changed from v4
- Hook = extreme close-up of the key sliding in, pins jumping, speech on frame 1.
- Mini-story with our guide at his front door: wrong key → a pin stops 0.76 mm short of the line → jams
  (he strains, then panics); right key → pins line up → click → door swings open, he cheers.
- One shot per sentence (15 cuts), camera always moving; subject fills the frame.
- Bigger, fewer-word captions in the lower third. No "follow" line, no end card: the last line
  ("…which is why") loops into the first ("your key is a password made of metal").
- Dropped: the key-grid and ancient-lock scenes (the weak v4 scenes) — replaced by a fast 79,666-keys beat.

## Voice
- 3 ElevenLabs hook samples (natural, energetic, conversational male): **pending** (service errors).
  Planned voices: Liam (energetic social), Chris (down-to-earth), Charlie (confident, energetic).
- Cost estimate: ≈ 1 credit per character → ~80 credits per hook sample, **~450–500 credits per full Short**
  (free plan: 10,000 / month ≈ 20 Shorts).
