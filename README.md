# Forge

One page that turns a script and your own voice recording into a finished,
auto-aligned video timeline. Everything runs in the browser and stays there —
scenes, images, audio, and word timings all live in IndexedDB via Dexie.

The only external service is Cloudflare Workers AI (FLUX Schnell) for images.

## Setup

```bash
npm install
cp .env.local.example .env.local   # then paste your Cloudflare token
npm run dev
```

## Environment

```
CLOUDFLARE_API_TOKEN=...
```

Create it at **Cloudflare dashboard → My Profile → API Tokens → Create Token**,
using the **Workers AI** template (permission: `Account · Workers AI · Read`).
It is read server-side only and never reaches the browser.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on http://localhost:3000 |
| `npm test` | Unit tests (scene splitting, prompt derivation) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run build` | Production build |

## Build order

1. **Page shell, Dexie, script paste and scene splitting** — done
2. Cloudflare image generation with the live grid
3. Audio upload, normalisation, and Whisper word timings
4. Timeline, Configure My Video, preview, and ZIP export
