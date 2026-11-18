# Short report: "How a Lock Knows It's Your Key" (style test)

**What it is:** a 39-second vertical YouTube Short, built as the test for our new channel look (v4). It explains
how a normal pin-tumbler door lock checks your key: pins, springs, the "shear line", the right key versus a wrong
key, how many different keys exist, and the fact that the idea is ancient.

**How it was made (no money spent):**
- Everything on screen is animated in code (3D lock made with Three.js, rendered with HyperFrames). No AI image
  or video generators, no stock footage.
- The lock is built from real Schlage-style measurements. The animation follows the physics: the cylinder can
  only turn when all five pin gaps line up on the shear line; the wrong key is cut 0.76 mm too deep at one pin,
  and the lock visibly jams. This was checked in code, not just drawn.
- The guide character is the owner's own design, rebuilt as a reusable animated character.
- Voice: a free AI voice (Kokoro, "am_fenrir"), labelled as AI voice. Word-timed captions. Sound effects
  generated in code (key sliding, pin clicks timed to the physics, the click, a "wrong" buzz).
- Facts were checked against sources (saved in SOURCES.md). Two lines of the draft script were corrected:
  "thousands of keys" → "tens of thousands", and "4,000 years / Egyptians" → "thousands of years old", because
  the 4,000-year figure is disputed.

**Quality check:** three review rounds on contact sheets. 10 of 13 scenes scored 8/10 or better; three scenes
(a close-up, the key-counting grid, the ancient wooden lock) are at 7–7.5 and would get another polish before
publishing.

**Costs:** $0. Free credits used: about 566 ElevenLabs characters (a test voice, not used in the final),
40 vidIQ credits (topic research).

**Status:** waiting for the owner's approval. It has not been published and will not be without the owner's ✓.

**Reusable for later:** the lock cutaway works as a component for the long video "10 Genius Mechanisms Hiding
in Your House, Visualized" (Chapter 1), and the character rig is shared by every future video.
