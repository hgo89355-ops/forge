# Forge — Product Requirements

Forge turns a one-sentence idea into a finished, narrated explainer video, assembled
in the browser. It is local-first: every project, script, image, and audio file lives
in the user's own browser storage. There is no application database and no account.

---

## 1. Principles and constraints

**Local-first.** All durable state lives in IndexedDB (records) and a blob store
(images, audio). Nothing is persisted server-side. The only network calls are to model
providers, made through Next.js route handlers so provider keys stay off the client.

**Storage is the user's, so it must be portable and defended.**
`navigator.storage.persist()` is requested on first project creation, and project
export/import is a required feature, not a nice-to-have. A browser can evict
non-persisted origin storage without warning; losing a project must never be a
one-click accident.

**One implementation per capability.** Every feature is a set of pure functions in
`src/lib/*` with a thin UI over it. Auto Pilot (§F9) drives those same functions. If a
capability ever exists twice, that is a defect to be refactored, not a fork to be
maintained.

**Model access.** The Vercel AI SDK is the single interface to every model provider —
text, structured output, images, and speech. Provider swaps are configuration, not a
rewrite.

**Framework.** Next.js 16 (App Router), React 19, TypeScript, Tailwind. Zod schemas
are the contract for every model call that returns structured data.

**Output.** Preview in the browser plus a ZIP bundle of all assets and a timeline
manifest. Server-side MP4 rendering is deliberately out of scope for this version.

---

## 2. Data model

These record types are the shared vocabulary. Every feature — manual or automated —
reads and writes exactly these.

| Record | Holds |
| --- | --- |
| `projects` | Idea sentence, target length, created/updated timestamps, status |
| `references` | A reference video's identity and how its material was supplied |
| `style_profiles` | The derived style fingerprint. Never the raw transcript. |
| `facts` | The researched facts, with source and quality-bar verdict |
| `scripts` | Hook candidates, the chosen hook, the full body, revision history |
| `scenes` | Ordered script segments with image prompts and duration intent |
| `images` | Generated stills, keyed to a scene, with prompt and provenance |
| `narrations` | Voiceover audio for a script, with voice and provider metadata |
| `narration_words` | Word-level timings — the spine that aligns picture to speech |
| `timelines` | Tracks, clips, transitions, and the current playhead state |
| `runs` | Auto Pilot runs: stage states, artifacts produced, costs, errors |

Assets live in a separate blob store addressed by content hash; records reference them
by key. Export walks the record graph, collects the referenced blobs, and writes both
into one ZIP.

---

## 3. Features

### F1 — Projects and local-first storage
Create, open, rename, and delete projects. Request persistent storage on first use and
surface quota. Export a project to a single ZIP (records + assets + manifest); import
one back, including on a different machine or browser. Import validates the manifest
version and refuses silently-incompatible bundles.

### F2 — Research: the ten obscure facts
From the idea sentence, produce exactly ten facts.

The quality bar is the feature. A fact must be specific, checkable, and genuinely
non-obvious to someone who already knows the topic casually. Generic restatements,
near-duplicates of each other, and unsourced assertions are rejected and regenerated.
Each fact carries its source and the reason it cleared the bar.

Source material defaults to paste or file upload. No YouTube Data API key is required
to use Forge; where a key is absent, URL-based ingestion degrades to asking the user to
paste the material rather than failing.

### F3 — Style modelling from a reference video
Given a reference video, derive a **style profile**: pacing, hook shape, sentence
rhythm, how it opens and closes, how it hands off between beats, the register it
speaks in.

The profile is the only thing persisted. The raw transcript is used to derive it and is
then discarded — it is never stored, never shown, and never fed into script generation.
What Forge learns from a reference is *form*, not content.

### F3.1 — Storytelling engine
Generates the script from the style profile and the ten facts: several hook candidates,
one chosen with a stated reason, then the body built around the facts in an order the
engine argues for. Structured output validated against a schema at every step.

Regeneration on a failed validation is capped at **2 retries** per step. After that the
step fails loudly with what was wrong; it does not spin.

### F4 — Scene segmentation
Split the script into ordered scenes, each with narration text, a visual intent, and an
image prompt.

### F5 — Image generation
Generate a still per scene, with per-scene regeneration and prompt editing. Images are
content-addressed blobs.

### F6 — Voiceover and word timings
Generate narration audio for the script and capture **word-level timings** into
`narration_words`. Timings are what make automatic alignment possible; a narration
without them is incomplete, not merely unpolished.

### F7 — Timeline and Configure My Video
A timeline of picture and audio tracks. **Configure My Video** is the alignment pass: it
reads `narration_words` and the scene boundaries and sets each image's in-point and
duration so the picture changes when the narration reaches that scene. The result is
editable afterwards — alignment is a starting point, not a lock.

### F8 — Preview and export
Play the timeline in the browser. Export a ZIP containing every asset and a timeline
manifest describing how they assemble. MP4 rendering is not in this version.

---

## 4. §F9 — Auto Pilot (one-click video)

**What it is.** One page that takes an idea, a reference, and a length, and runs the
entire pipeline for the user — pausing exactly once, in the middle, for approval.

**Input.** A single screen: the idea in a sentence, a YouTube URL of a video whose
format should be matched, and a target length. Then Generate.

**Before anything runs**, Forge shows an estimated cost in USD and an estimated
runtime, and the user can cancel. Nothing is spent before that screen is dismissed
forward.

### The run

**Stages 1–3 — unattended.**
1. Derive the style profile from the reference URL, via F3. Profile only; the raw
   transcript is never retained.
2. Research the ten facts on the idea, via F2. The F2 quality bar applies unchanged —
   Auto Pilot does not get a relaxed standard because it is running unattended.
3. Generate the script through the full F3.1 storytelling engine, including hook
   candidates and selection.

**Stage 4 — the gate. Required.**
The run stops. One screen shows the chosen hook and all ten facts, with **Approve**,
**Regenerate**, and **Edit**. No downstream stage — no scene segmentation, no image
generation, no voiceover, nothing that costs money past this point — begins until the
user approves. This gate cannot be skipped, disabled, or configured away. It is the
point of the feature: the expensive half of the pipeline runs only on work the user has
actually looked at.

Regenerate re-runs the script step. Edit accepts the user's changes and treats them as
approved content.

**Stages 5–6 — unattended, on approval.**
Segment scenes (F4), generate every image (F5), generate the voiceover with word
timings (F6), create the timeline, add everything to it, and run Configure My Video
(F7). The run ends by landing the user in the editor with a finished, aligned timeline
they can immediately play and edit.

### Live progress

Throughout the run: which stage is executing right now, which are finished, which are
pending, and a **running USD cost** that accumulates as real calls complete — not the
pre-flight estimate replayed, but what has actually been spent.

### Failure behaviour

A failing stage **stops the run at that stage** with a clear, specific error and a
**Retry** button. Three rules, all hard:

- It never silently continues past a broken stage.
- It never discards work already completed. A run that fails at voiceover still has its
  style profile, facts, approved script, scenes, and images intact and on disk.
- Retry resumes from the failed stage using what came before, and does not re-pay for
  stages that already succeeded.

Run state — per-stage status, the artifacts each stage produced, accumulated cost — is
persisted in `runs` as the run proceeds, so a closed tab or a reload does not lose a
run in flight.

### Auto Pilot is an orchestrator, not a second implementation

Every record Auto Pilot produces is byte-for-byte the same kind of record the manual
tools produce: the same `scripts`, `scenes`, `narration_words`, `timelines`. A project
built by Auto Pilot is indistinguishable from one built by hand, and can be opened and
edited by every manual tool afterwards.

This is a structural requirement, not an aspiration. Auto Pilot calls the same functions
the manual UI calls. If implementing a stage requires duplicating logic that already
exists behind a manual feature, the correct response is to refactor that logic into a
shared function that both paths call — never to write a second copy inside Auto Pilot.

---

## 5. Build order

Auto Pilot is built last, on top of features that already work on their own.

| Step | Scope |
| --- | --- |
| 1 | Foundation: Next.js 16 scaffold, IndexedDB data layer, blob store, project CRUD, persistence request, export/import (F1) |
| 2 | Research and the fact quality bar (F2) |
| 3 | Style profile and the storytelling engine (F3, F3.1) |
| 4 | Scene segmentation (F4) |
| 5 | Image generation (F5) |
| 6 | Voiceover and word timings (F6) |
| 7 | Timeline, Configure My Video, preview and ZIP export (F7, F8) |
| 8 | Auto Pilot (F9) |

---

## 6. Out of scope for this version

- Server-side MP4 rendering. Preview plus ZIP export is the delivery path.
- Accounts, sync, and any server-side persistence of user projects.
- Publishing or upload integrations.
