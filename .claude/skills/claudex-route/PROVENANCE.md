# Provenance

`claudex-route` is vendored from [chaseai-yt/claudex-loop](https://github.com/chaseai-yt/claudex-loop)
(MIT, see LICENSE), commit `8cf5e2c`.

Only the `claudex-route` skill is vendored here. Upstream supports this:
Route is self-contained and needs no other skill from that repository.

The sibling skills (`claudex-loop`, `codex-review`, `codex-build`) are
deliberately omitted — they require the OpenAI Codex CLI (`npm i -g @openai/codex`)
and a paid OpenAI account. To add them later, copy `skills/.` from upstream
into this directory.

Update: re-clone upstream and re-copy `skills/claudex-route/`.
