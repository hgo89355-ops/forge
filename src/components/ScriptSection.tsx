"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { META_SCRIPT, db, getMeta, resetAll, setMeta, type Scene } from "@/lib/db";
import { splitIntoScenes, TARGET_SECONDS, WORDS_PER_SECOND } from "@/lib/split";
import { buildImagePrompt } from "@/lib/prompt";

function formatSeconds(seconds: number): string {
  const whole = Math.round(seconds);
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  return minutes > 0 ? `${minutes}m ${rest}s` : `${rest}s`;
}

export function ScriptSection() {
  const [script, setScript] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  const scenes = useLiveQuery(() => db.scenes.orderBy("index").toArray(), [], undefined);

  useEffect(() => {
    void getMeta<string>(META_SCRIPT).then((saved) => {
      if (saved) setScript(saved);
      setLoaded(true);
    });
  }, []);

  async function onSplit() {
    if (!script.trim()) return;
    if (
      scenes &&
      scenes.length > 0 &&
      !window.confirm(
        `Re-splitting replaces all ${scenes.length} scenes, including any prompts ` +
          "you have edited and any images already generated. Continue?",
      )
    ) {
      return;
    }

    setBusy(true);
    try {
      const split = splitIntoScenes(script);
      const rows: Omit<Scene, "id">[] = split.map((scene, index) => ({
        index,
        // Verbatim: exactly the slice the splitter took, untouched.
        text: scene.text,
        imagePrompt: buildImagePrompt(scene.text),
        promptEdited: false,
        startSec: null,
        durationSec: null,
        zoom: null,
      }));

      await db.transaction("rw", db.scenes, db.images, db.meta, async () => {
        await db.images.clear();
        await db.scenes.clear();
        await db.scenes.bulkAdd(rows as Scene[]);
        await setMeta(META_SCRIPT, script);
      });
    } finally {
      setBusy(false);
    }
  }

  async function onPromptChange(scene: Scene, value: string) {
    await db.scenes.update(scene.id, { imagePrompt: value, promptEdited: true });
  }

  async function onResetPrompt(scene: Scene) {
    await db.scenes.update(scene.id, {
      imagePrompt: buildImagePrompt(scene.text),
      promptEdited: false,
    });
  }

  async function onStartOver() {
    if (!window.confirm("Clear the script, scenes, images, audio, and timings?")) return;
    await resetAll();
    setScript("");
  }

  const totalWords = scenes?.reduce(
    (sum, scene) => sum + (scene.text.trim().match(/\S+/g)?.length ?? 0),
    0,
  );
  const estimatedTotal = totalWords ? totalWords / WORDS_PER_SECOND : 0;

  return (
    <div className="space-y-5">
      <div>
        <textarea
          value={script}
          onChange={(event) => setScript(event.target.value)}
          disabled={!loaded}
          rows={12}
          placeholder="Paste your script here."
          className="w-full resize-y rounded-md border border-line bg-surface p-4 font-mono text-sm leading-relaxed outline-none focus:border-accent"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onSplit}
            disabled={busy || !script.trim()}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {busy ? "Splitting…" : "Split into scenes"}
          </button>
          <span className="text-sm text-muted">
            Sentence boundaries, about {TARGET_SECONDS}s of narration each.
          </span>
          <button
            type="button"
            onClick={onStartOver}
            className="ml-auto text-sm text-muted hover:text-accent"
          >
            Start over
          </button>
        </div>
      </div>

      {scenes && scenes.length > 0 && (
        <div>
          <p className="text-sm text-muted">
            {scenes.length} scenes · {totalWords} words · about{" "}
            {formatSeconds(estimatedTotal)} of narration
          </p>
          <ol className="mt-3 space-y-3">
            {scenes.map((scene) => {
              const words = scene.text.trim().match(/\S+/g)?.length ?? 0;
              return (
                <li
                  key={scene.id}
                  className="rounded-md border border-line bg-surface p-4"
                >
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-xs text-muted">
                      {String(scene.index + 1).padStart(3, "0")}
                    </span>
                    <p className="flex-1 text-sm leading-relaxed whitespace-pre-wrap">
                      {scene.text}
                    </p>
                    <span className="shrink-0 font-mono text-xs text-muted">
                      {words}w · {formatSeconds(words / WORDS_PER_SECOND)}
                    </span>
                  </div>
                  <div className="mt-3 flex items-start gap-3">
                    <label className="flex-1">
                      <span className="text-xs font-medium text-muted">
                        Image prompt
                      </span>
                      <textarea
                        value={scene.imagePrompt}
                        onChange={(event) =>
                          void onPromptChange(scene, event.target.value)
                        }
                        rows={2}
                        className="mt-1 w-full resize-y rounded-md border border-line bg-background p-2 text-sm outline-none focus:border-accent"
                      />
                    </label>
                    {scene.promptEdited && (
                      <button
                        type="button"
                        onClick={() => void onResetPrompt(scene)}
                        className="mt-5 shrink-0 text-xs text-muted hover:text-accent"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
