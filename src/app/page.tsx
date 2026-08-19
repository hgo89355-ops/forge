import { NotBuiltYet, Section } from "@/components/Section";
import { ScriptSection } from "@/components/ScriptSection";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <header className="pb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Forge</h1>
        <p className="mt-1 text-sm text-muted">
          A script and your own recording, aligned into a finished timeline. Everything
          stays in this browser.
        </p>
      </header>

      <div className="space-y-10">
        <Section
          number={1}
          title="Script"
          subtitle="Paste it in and split it into scenes. Each scene's text is kept exactly as you wrote it."
        >
          <ScriptSection />
        </Section>

        <Section number={2} title="Images" subtitle="FLUX Schnell on Cloudflare Workers AI.">
          <NotBuiltYet>
            Next step: a Generate all button, six requests in flight at a time with
            retries, and a grid that fills in as images land.
          </NotBuiltYet>
        </Section>

        <Section number={3} title="Voice" subtitle="Your own recording, normalised and transcribed.">
          <NotBuiltYet>
            After images: upload, loudness normalisation toward &minus;16 LUFS, and
            in-browser Whisper for word-level timestamps.
          </NotBuiltYet>
        </Section>

        <Section number={4} title="Timeline" subtitle="Configure My Video, preview, and export.">
          <NotBuiltYet>
            Last: the image and audio tracks, automatic alignment, preview playback, and
            the CapCut-ready ZIP.
          </NotBuiltYet>
        </Section>
      </div>
    </main>
  );
}
