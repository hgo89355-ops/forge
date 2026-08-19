/**
 * Sentence-boundary scene splitting.
 *
 * The one hard rule: a scene's text is a *slice* of the original script, taken
 * by offset. Nothing is joined, trimmed, or re-spaced on the way through, so
 * whatever the user pasted is what alignment sees later.
 */

/** Words per second of narration, used to size scenes. 150 wpm. */
export const WORDS_PER_SECOND = 2.5;

/** Roughly how much narration each scene should carry. */
export const TARGET_SECONDS = 8;

/**
 * A remainder shorter than this share of the target is folded into the
 * previous scene rather than left as a stub.
 */
const MIN_TAIL_RATIO = 0.4;

/** Words that end in a period without ending a sentence. */
const ABBREVIATIONS = new Set([
  "mr", "mrs", "ms", "dr", "prof", "sr", "jr", "st", "mt", "ft",
  "vs", "etc", "eg", "ie", "al", "approx", "est", "fig", "no",
  "inc", "ltd", "co", "corp", "dept", "univ", "gov", "sgt", "capt",
  "gen", "lt", "col", "rev", "hon", "pres", "jan", "feb", "mar",
  "apr", "jun", "jul", "aug", "sep", "sept", "oct", "nov", "dec",
]);

export interface Span {
  start: number;
  end: number;
}

function isAbbreviation(text: string, periodIndex: number): boolean {
  let start = periodIndex;
  while (start > 0 && /[A-Za-z]/.test(text[start - 1])) start -= 1;
  const word = text.slice(start, periodIndex).toLowerCase();
  if (word.length === 0) return false;
  // A single letter before the period is an initial: "J. R. R. Tolkien".
  if (word.length === 1) return true;
  return ABBREVIATIONS.has(word);
}

/**
 * Finds sentence spans as [start, end) offsets into the script. Spans exclude
 * the whitespace between sentences and include the terminating punctuation.
 */
export function findSentences(script: string): Span[] {
  const spans: Span[] = [];
  let cursor = 0;

  while (cursor < script.length) {
    // Skip whitespace ahead of the sentence.
    while (cursor < script.length && /\s/.test(script[cursor])) cursor += 1;
    if (cursor >= script.length) break;

    const start = cursor;
    let end = script.length;

    for (let i = cursor; i < script.length; i += 1) {
      const char = script[i];

      // A blank line ends a sentence even without punctuation, which is how
      // scripts written as loose beats usually arrive.
      if (char === "\n") {
        const rest = script.slice(i);
        const blankLine = /^\n\s*\n/.test(rest);
        if (blankLine) {
          end = i;
          break;
        }
      }

      if (char === "." || char === "!" || char === "?" || char === "…") {
        if (char === "." && isAbbreviation(script, i)) continue;

        // Consume runs of terminators and any closing quotes or brackets.
        let stop = i + 1;
        while (stop < script.length && /[.!?…]/.test(script[stop])) stop += 1;
        while (stop < script.length && /["'’”)\]]/.test(script[stop])) stop += 1;

        // A terminator only ends a sentence if whitespace or the end follows.
        if (stop >= script.length || /\s/.test(script[stop])) {
          end = stop;
          break;
        }
      }
    }

    if (end > start) spans.push({ start, end });
    cursor = end;
  }

  return spans;
}

export function countWords(text: string): number {
  const matches = text.trim().match(/\S+/g);
  return matches ? matches.length : 0;
}

export interface SplitScene {
  /** Verbatim slice of the original script. */
  text: string;
  start: number;
  end: number;
  words: number;
  estimatedSeconds: number;
}

export interface SplitOptions {
  targetSeconds?: number;
  wordsPerSecond?: number;
}

/**
 * Groups whole sentences into scenes of roughly `targetSeconds` of narration.
 * A sentence is never split, so a single long sentence becomes an oversized
 * scene rather than being cut mid-thought.
 */
export function splitIntoScenes(
  script: string,
  options: SplitOptions = {},
): SplitScene[] {
  const targetSeconds = options.targetSeconds ?? TARGET_SECONDS;
  const wordsPerSecond = options.wordsPerSecond ?? WORDS_PER_SECOND;
  const targetWords = Math.max(1, Math.round(targetSeconds * wordsPerSecond));

  const sentences = findSentences(script);
  if (sentences.length === 0) return [];

  const scenes: SplitScene[] = [];
  let groupStart = sentences[0].start;
  let groupEnd = sentences[0].start;
  let groupWords = 0;

  const flush = () => {
    if (groupEnd <= groupStart) return;
    const text = script.slice(groupStart, groupEnd);
    scenes.push({
      text,
      start: groupStart,
      end: groupEnd,
      words: groupWords,
      estimatedSeconds: groupWords / wordsPerSecond,
    });
  };

  for (const sentence of sentences) {
    if (groupWords === 0) groupStart = sentence.start;
    groupEnd = sentence.end;
    groupWords += countWords(script.slice(sentence.start, sentence.end));

    if (groupWords >= targetWords) {
      flush();
      groupWords = 0;
    }
  }

  // Whatever is left over: its own scene, unless it is a stub.
  if (groupWords > 0) {
    if (scenes.length > 0 && groupWords < targetWords * MIN_TAIL_RATIO) {
      const previous = scenes[scenes.length - 1];
      previous.end = groupEnd;
      previous.text = script.slice(previous.start, groupEnd);
      previous.words += groupWords;
      previous.estimatedSeconds = previous.words / wordsPerSecond;
    } else {
      flush();
    }
  }

  return scenes;
}
