import Dexie, { type EntityTable } from "dexie";

/**
 * One video at a time. There is no project list and no ownership column -
 * the database holds the video you are working on right now, and starting a
 * new one clears it.
 */

export interface Scene {
  id: number;
  index: number;
  /**
   * The scene's narration text, exactly as it appeared in the pasted script -
   * same characters, same spacing, same punctuation. Configure My Video
   * matches this string against the Whisper transcript, so it must never be
   * trimmed, normalised, or rewritten on the way in.
   */
  text: string;
  imagePrompt: string;
  /** Set once the user edits the prompt, so re-splitting leaves it alone. */
  promptEdited: boolean;
  /** Filled in by Configure My Video. */
  startSec: number | null;
  durationSec: number | null;
  /** Ken Burns direction, assigned at align time. */
  zoom: "in" | "out" | null;
}

export interface SceneImage {
  id: number;
  sceneId: number;
  blob: Blob;
  prompt: string;
  createdAt: number;
}

export interface AudioTrack {
  id: number;
  fileName: string;
  /** The loudness-normalised audio, as a WAV blob. */
  blob: Blob;
  durationSec: number;
  measuredLufs: number;
  gainDb: number;
  createdAt: number;
}

export interface Word {
  id: number;
  index: number;
  word: string;
  startSec: number;
  endSec: number;
}

/** Small odds and ends: the raw script, the last alignment report, undo state. */
export interface MetaEntry {
  key: string;
  value: unknown;
}

export const db = new Dexie("forge") as Dexie & {
  scenes: EntityTable<Scene, "id">;
  images: EntityTable<SceneImage, "id">;
  audio: EntityTable<AudioTrack, "id">;
  words: EntityTable<Word, "id">;
  meta: EntityTable<MetaEntry, "key">;
};

db.version(1).stores({
  scenes: "++id, index",
  images: "++id, sceneId",
  audio: "++id",
  words: "++id, index",
  meta: "key",
});

export const META_SCRIPT = "script";
export const META_ALIGNMENT = "alignment";
export const META_UNDO = "undo";

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await db.meta.get(key))?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value });
}

/** Wipes the current video so a new script can start clean. */
export async function resetAll(): Promise<void> {
  await db.transaction("rw", db.scenes, db.images, db.audio, db.words, db.meta, async () => {
    await Promise.all([
      db.scenes.clear(),
      db.images.clear(),
      db.audio.clear(),
      db.words.clear(),
      db.meta.clear(),
    ]);
  });
}
