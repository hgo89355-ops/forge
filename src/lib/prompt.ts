/**
 * Local, rule-based image prompts. No model, no network - the scene's own
 * words picked over and dropped into a fixed visual scaffold. It is a starting
 * point the user is expected to correct, so determinism matters more than
 * flair: the same scene text always yields the same prompt.
 */

const STOPWORDS = new Set([
  "a", "about", "above", "after", "again", "all", "also", "am", "an", "and",
  "any", "are", "as", "at", "back", "be", "because", "been", "before", "being",
  "below", "between", "both", "but", "by", "came", "can", "come", "could",
  "did", "do", "does", "doing", "down", "during", "each", "even", "every",
  "few", "for", "from", "further", "get", "got", "had", "has", "have", "having",
  "he", "her", "here", "hers", "him", "his", "how", "however", "i", "if", "in",
  "into", "is", "it", "its", "itself", "just", "like", "made", "make", "many",
  "may", "me", "might", "more", "most", "much", "must", "my", "never", "no",
  "nor", "not", "now", "of", "off", "on", "once", "one", "only", "or", "other",
  "our", "ours", "out", "over", "own", "put", "same", "see", "she", "should",
  "so", "some", "still", "such", "take", "than", "that", "the", "their",
  "theirs", "them", "then", "there", "these", "they", "this", "those",
  "though", "through", "to", "too", "under", "until", "up", "us", "very",
  "was", "way", "we", "well", "were", "what", "when", "where", "which",
  "while", "who", "whom", "why", "will", "with", "would", "you", "your",
  "yours", "thing", "things", "really", "actually", "basically",
]);

/** The look every prompt lands in, so a batch of images hangs together. */
const STYLE_SUFFIX =
  "cinematic wide shot, dramatic natural lighting, photorealistic, " +
  "high detail, shallow depth of field, 16:9";

const MAX_KEYWORDS = 6;

interface Candidate {
  display: string;
  key: string;
  firstIndex: number;
  count: number;
  proper: boolean;
}

/**
 * Pulls the words worth drawing out of a scene: content words, weighted by how
 * often they recur and whether they read as a proper noun, then returned in
 * the order they appear so the prompt still scans like the sentence did.
 */
export function extractKeywords(text: string, limit = MAX_KEYWORDS): string[] {
  const tokens = text.match(/[A-Za-z][A-Za-z'’-]*/g) ?? [];
  const candidates = new Map<string, Candidate>();

  tokens.forEach((raw, position) => {
    const key = raw.toLowerCase().replace(/['’]s$/, "");
    if (key.length < 3 || STOPWORDS.has(key)) return;

    // Capitalised but not sentence-initial reads as a name or place.
    const proper = position > 0 && /^[A-Z]/.test(raw);

    const existing = candidates.get(key);
    if (existing) {
      existing.count += 1;
      existing.proper = existing.proper || proper;
    } else {
      candidates.set(key, {
        display: proper ? raw : key,
        key,
        firstIndex: position,
        count: 1,
        proper,
      });
    }
  });

  return [...candidates.values()]
    .sort((a, b) => {
      const score = (c: Candidate) => c.count * 2 + (c.proper ? 3 : 0);
      const difference = score(b) - score(a);
      return difference !== 0 ? difference : a.firstIndex - b.firstIndex;
    })
    .slice(0, limit)
    .sort((a, b) => a.firstIndex - b.firstIndex)
    .map((candidate) => candidate.display);
}

export function buildImagePrompt(text: string): string {
  const keywords = extractKeywords(text);
  const subject = keywords.length > 0 ? keywords.join(", ") : "abstract establishing shot";
  return `${subject} — ${STYLE_SUFFIX}`;
}
