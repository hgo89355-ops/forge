# Sources & fact-check — "How a Lock Knows It's Your Key"

Checked 2026-11-18. Only Wikipedia could be opened from the build machine (other sites were blocked by the
network policy); quotes marked *(search excerpt)* come from web-search snippets and should be re-read
before publishing a public sources list.

| # | Line in the video | Verdict | Source |
|---|---|---|---|
| 1 | "Inside your lock are tiny pins, stacked in pairs and pushed down by springs." | TRUE | Wikipedia, *Pin tumbler lock* — "Above each key pin is one or more spring-loaded driver pins." https://en.wikipedia.org/wiki/Pin_tumbler_lock · Kwikset Rekey Manual *(search excerpt)*: bottom pins "in .023" increments… tapered on both ends"; top pins "all the same size". https://images.kwikset.com/is/content/Kwikset/Redesign%202019/Literature/Documents/KW-REKEY-MANUAL.pdf |
| 2 | "The top pins cross the gap, so the cylinder can't turn." | TRUE | Wikipedia, *Pin tumbler lock* — "When the key is not in the lock, the pins straddle the shear point, preventing the plug from rotating." |
| 3 | "Each cut lifts its pins… until every gap lines up on one line. Click. It turns." | TRUE | Wikipedia, *Pin tumbler lock* — "the pins will rise causing them to align exactly at the shear point." |
| 4 | "One pin less than a millimetre off, and it jams." (draft said "a fraction of a millimetre") | TRUE | One depth step: Kwikset 0.023 in = 0.58 mm (Kwikset manual above); Schlage 0.015 in = 0.38 mm (*search excerpt*, lockpicking101 forum — verify against a Schlage spec). The wrong key in the animation is cut 2 Schlage steps (0.76 mm) too deep at pin 3. |
| 5 | "Five or six pins, several heights each: tens of thousands of possible keys." (draft said "thousands") | REWORDED | Schlage: 10 depths, MACS 7 (Allegion KB *(search excerpt)* https://kc.allegion.com/kb/article/what-is-the-maximum-adjacent-cut-specification-or-macs) → 5 pins 10⁵ = 100,000 theoretical, 79,666 after MACS; 6 pins 753,754. Kwikset: 6 depths (+1 master), MACS 4 (lockwiki *(search excerpt)*) → 7,776 theoretical, 6,306 after MACS. MACS-reduced counts computed by brute force, not quoted from a source. |
| 6 | "The idea is thousands of years old. Ancient wooden pin locks worked the same way." (draft said "about 4,000 years… ancient Egyptians") | REWORDED | Wikipedia, *Pin tumbler lock* — "may date as far back as 2000 BC in Egypt"; also cites the Khorsabad palace lock (Sargon II, c. 721–705 BC). Wikipedia, *Lock and key* — early lock from Nineveh "developed into the Egyptian wooden pin lock" https://en.wikipedia.org/wiki/Lock_and_key. D.T. Potts, "Lock and Key in Ancient Mesopotamia", *Mesopotamia* 25 (1990) *(search excerpt)* argues the "4,000 years" figure traces to a misread 1957 catalogue; the firm date is ~700 BC (Assyria). Safe claim: thousands of years old. |
| 7 | (background) Modern pin-tumbler lock | — | Linus Yale Sr., 1848; Linus Yale Jr. cylinder patents 1861 (US 31,278) and 1865 (US 48,475). Wikipedia, *Pin tumbler lock*. |

## Geometry used in the animation (illustrative, Schlage-style numbers)

- Plug Ø 12.7 mm, 5 chambers, first cut 5.84 mm from the shoulder, spacing 3.96 mm.
- Depth step 0.381 mm (0.015 in); depth 0 = 8.51 mm above the blade bottom.
- Right key bitting 4-6-2-7-3. Wrong key 4-6-4-7-3 (pin 3 two steps = 0.76 mm too deep).
- Key-pin lengths are computed so the correct key puts every key-pin top exactly on the shear line;
  the plug may only turn when all five gaps are within 0.05 mm of the shear line (checked in code).

## Voice

AI voice: ElevenLabs "Liam" (premade), model eleven_v4, generated on the free tier (566 credits, $0).
Note: ElevenLabs' free tier requires attribution and does not include a commercial licence — check before
monetising, or swap to the local Kokoro voice (free, Apache-2.0).
