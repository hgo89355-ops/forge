import { describe, expect, it } from "vitest";
import { countWords, findSentences, splitIntoScenes } from "./split";
import { buildImagePrompt, extractKeywords } from "./prompt";

describe("findSentences", () => {
  it("splits on terminators and keeps the punctuation", () => {
    const script = "One thing happened. Then another! And a third?";
    const spans = findSentences(script);
    expect(spans.map((s) => script.slice(s.start, s.end))).toEqual([
      "One thing happened.",
      "Then another!",
      "And a third?",
    ]);
  });

  it("does not split on abbreviations or initials", () => {
    const script = "Dr. Smith met J. R. R. Tolkien in St. Louis. Then he left.";
    const spans = findSentences(script);
    expect(spans).toHaveLength(2);
    expect(script.slice(spans[0].start, spans[0].end)).toBe(
      "Dr. Smith met J. R. R. Tolkien in St. Louis.",
    );
  });

  it("does not split inside decimals", () => {
    const script = "The cable is 3.5 centimetres thick. That is all.";
    expect(findSentences(script)).toHaveLength(2);
  });

  it("treats a blank line as a boundary even without punctuation", () => {
    const script = "A beat with no full stop\n\nAnother beat";
    const spans = findSentences(script);
    expect(spans.map((s) => script.slice(s.start, s.end))).toEqual([
      "A beat with no full stop",
      "Another beat",
    ]);
  });

  it("keeps a closing quote with its sentence", () => {
    const script = 'He said "it is fine." Then he left.';
    const spans = findSentences(script);
    expect(script.slice(spans[0].start, spans[0].end)).toBe('He said "it is fine."');
  });
});

describe("splitIntoScenes", () => {
  const sentence = (n: number) =>
    `Sentence number ${n} carries exactly ten words in total here.`;
  const script = Array.from({ length: 12 }, (_, i) => sentence(i + 1)).join(" ");

  it("stores every scene as a verbatim slice of the script", () => {
    const scenes = splitIntoScenes(script);
    for (const scene of scenes) {
      expect(script.slice(scene.start, scene.end)).toBe(scene.text);
    }
  });

  it("reassembles into the original script with nothing lost or added", () => {
    const scenes = splitIntoScenes(script);
    const joined = scenes
      .map((s, i) => (i === 0 ? "" : script.slice(scenes[i - 1].end, s.start)) + s.text)
      .join("");
    expect(joined).toBe(script);
  });

  it("preserves interior whitespace and line breaks exactly", () => {
    const messy = "First   beat  here with   odd spacing.\n\tSecond beat follows on.";
    const scenes = splitIntoScenes(messy, { targetSeconds: 100 });
    expect(scenes).toHaveLength(1);
    expect(scenes[0].text).toBe(messy);
  });

  it("groups sentences to roughly the target narration length", () => {
    const scenes = splitIntoScenes(script);
    // 10 words per sentence, 20 words per 8-second scene.
    expect(scenes).toHaveLength(6);
    for (const scene of scenes) {
      expect(scene.words).toBe(20);
      expect(scene.estimatedSeconds).toBeCloseTo(8, 5);
    }
  });

  it("honours a custom target length", () => {
    const scenes = splitIntoScenes(script, { targetSeconds: 16 });
    expect(scenes).toHaveLength(3);
    expect(scenes[0].words).toBe(40);
  });

  it("never splits a single long sentence", () => {
    const long = `${"word ".repeat(80).trim()}.`;
    const scenes = splitIntoScenes(long);
    expect(scenes).toHaveLength(1);
    expect(scenes[0].text).toBe(long);
  });

  it("folds a stub tail into the previous scene rather than leaving it alone", () => {
    const scenes = splitIntoScenes(`${script} Short tail.`);
    expect(scenes).toHaveLength(6);
    expect(scenes[scenes.length - 1].text.endsWith("Short tail.")).toBe(true);
  });

  it("returns nothing for an empty or blank script", () => {
    expect(splitIntoScenes("")).toEqual([]);
    expect(splitIntoScenes("   \n\n  ")).toEqual([]);
  });
});

describe("countWords", () => {
  it("counts runs of non-whitespace", () => {
    expect(countWords("  one two   three \n four ")).toBe(4);
    expect(countWords("")).toBe(0);
  });
});

describe("image prompts", () => {
  it("keeps content words and drops stopwords", () => {
    const keywords = extractKeywords(
      "The submarine cable was severed by an anchor off the coast of Egypt.",
    );
    expect(keywords).toContain("submarine");
    expect(keywords).toContain("cable");
    expect(keywords).toContain("Egypt");
    expect(keywords).not.toContain("the");
    expect(keywords).not.toContain("was");
  });

  it("is deterministic for the same text", () => {
    const text = "A cable ship hauls a repeater aboard at dawn.";
    expect(buildImagePrompt(text)).toBe(buildImagePrompt(text));
  });

  it("still produces a usable prompt when a scene is all stopwords", () => {
    expect(buildImagePrompt("And so it was that they were there.")).toContain(
      "abstract establishing shot",
    );
  });
});
