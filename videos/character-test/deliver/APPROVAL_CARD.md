# Approval card — THE character in 3D (toon render) · nothing uses him until the owner's ✓

**Design kept (model sheet):** pure white skin, messy black hair (no hat), small black oval eyes, expressive brows,
electric-blue t-shirt with a small white gear, dark navy jeans, white sneakers, ~18-year-old build.
**Render changed:** 3D toon/cel shading (3 tones) + thin dark outline, lit like the lock and door scenes, soft contact
shadow. Built entirely in code: lib/components/hero3d.js (Three.js), no AI images or video.

## Files to check
1. `1-turnaround.png` — front, 3/4, side, back.
2. `2-expressions.png` — curious, oops, shocked, confident, amazed, scared, proud, confused (face textures, swappable).
3. `3-animation-poses.png` — library poses: idle, walk, point, reach, jump back, celebrate, think.
4. `../renders/hero3d-motion-test.mp4` — 5 s: idle + blink → walk → point → reach and turn a key → door springs
   open → jump back → celebrate. Camera travels with him.

## What's in the rig
- Rounded head with a slightly longer jaw; hair = one sculpted shell + 10 chunky stylised clumps.
- Rounded t-shirt torso; short sleeves ride on the upper arms like fabric; smooth tapered white arms with real elbow
  bends; mitt hands (open, point, fist, hold-a-key); jeans legs with knee bends; rounded sneakers.
- Animation library (pure functions of time, so HyperFrames can seek any frame): idle (breathing + blinks), walk,
  point, reach (two-bone arm IK onto any object), turn key, jump back, celebrate, think — with anticipation,
  overshoot and settle.

## Notes
- The two reference images in the request didn't come through; built from the model sheet + the written spec.
- After ✓: he replaces the figure in the lock Short and becomes the master character (lib/components/hero3d.js,
  noted in CLAUDE.md and docs/CREATIVE_ENGINE.md). Until then the stickman stays as the locked character.
