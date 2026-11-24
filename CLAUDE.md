# Channel brain — read this first, every run

This file is the only thing a run needs to start. Do not rely on old chats or chat history.
Open the detail files below **only when the task needs them**.

## Who I am (the owner)
- Non-technical. Explain everything in plain words, short. No jargon without a one-line explanation.
- I decide on money, publishing exceptions, and style changes. Ask me only for real decisions.

## The channel
- Faceless YouTube channel: **hidden engineering, visualized** — how everyday machines really work
  (escalators, tanks, airplanes, locks…), shown as big, accurate 3D cutaways with one cartoon guide.
- Formats: Shorts (9:16, 30–45 s) and long videos (16:9, **8–10 min, never longer**) with chapters.
- Every week's Shorts tease the NEXT long videos; each teaser Short gets its long video set as its
  Related video once that video is out.

## Rules (never break)
1. **Spend no money.** Free tiers and included credits only (vidIQ plan credits, ElevenLabs free
   characters). If something would cost money, stop and put it in OWNER_TODO.md.
2. **YouTube = "posts unless I stop it".** Scheduled uploads go out on their date unless I say stop.
   Exception: test / style-check videos are never published without my ✓.
3. **No password storage.** Never write passwords, API keys or tokens into any file or message.
4. **Never touch bank accounts** or any payment / finance account.
5. **Animate everything ourselves, in code** (HyperFrames: SVG + GSAP, Three.js for 3D). No AI image or
   video generators, no stock footage.
6. **Facts are checked.** Every number and claim has a source, saved with the video (SOURCES.md).
   Physics shown on screen must be correct.

## Current style decision: v4 (details: docs/CHANNEL_BIBLE.md)
- The machine is the star: a big 3D cutaway (metal, glass, colour-coded key parts), light grey studio
  background, soft shadows.
- White rounded label boxes with a thin line to a dot on the part. Title tag top-left: white box with a
  blue accent bar ("The Two Hidden Tracks").
- The guide (owner decision 2026-11-24): a **3D guy with realistic proportions, built in code**
  (lib/components/guide3d.js): messy swept black hair, blue tee with a white gear logo, dark jeans, white sneakers.
  Lives in the 3D scene, casts shadows, hands placed by IK; points, reacts, 1–3 jokes per video.
  Moods: curious · oops · shocked · confident. (Old flat 2D rig lib/components/guide.js is retired.)
- Motion: spring physics, nothing linear; something new every 2–3 s. Big word-timed captions (white, black outline,
  yellow keywords) in the lower third. Sound effects made in code. Voice: the owner's own recording when available
  (videos/<slug>/RECORD_YOUR_VOICE.md), else AI voice labelled as AI voice.

## Where things are (open only when needed)
| File | What's in it |
|---|---|
| docs/CHANNEL_BIBLE.md | Full style, character, voice, music, captions and chapter rules |
| docs/CALENDAR.md | Posting plan, topic-check evidence, what's been posted |
| docs/LESSONS.md | What worked / what failed (tools, renders, network, timings) |
| PROGRESS.md | What's in progress right now and the next step |
| OWNER_TODO.md | Things only the owner can do (accounts, approvals, money decisions) |
| videos/<slug>/ | One folder per video: project, SCRIPT, SOURCES.md, REVIEW.md, renders |
| lib/ | Reusable components (character rig, machine cutaways, captions, SFX) |

## Every run
1. Read this file. Open PROGRESS.md. Open other files only if the task needs them.
2. Do the task. Keep outputs in videos/<slug>/ or lib/.
3. **End every run** by adding 1–3 lines each to docs/CALENDAR.md (if the plan changed or something
   was posted), docs/LESSONS.md (what worked/failed), and PROGRESS.md (current state + next step).
4. Commit and push to the working branch. Report to the owner in plain words.

## Weekly
- Before locking next week's topics: topic check with vidIQ outliers (long-form + Shorts, last 1–2
  years). Keep a topic only if strong outliers exist; match the best angle and title style (never copy);
  swap weak topics and say why. Record evidence (titles, views, links) in docs/CALENDAR.md.
- Long videos are built one chapter per day during the week and assembled on Sunday.

## Tools that work here (details and gotchas: docs/LESSONS.md)
- HyperFrames CLI via the installed plugin; render locally (CPU only — slow, plan for it).
- Voice: local Kokoro (free) — default `am_fenrir` @ 1.0; ElevenLabs "Liam" on the free tier as an option.
- Word timings: faster-whisper (local). Topic research: vidIQ (5 credits per outlier search).
