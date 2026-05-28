// Replace this with your brand. See skills/customize-workstation Step 6.
// The hero copy below mirrors the README hero; swap it for your own value prop.
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Monetize your AI expertise",
};

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center animate-fade-in">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-ink mb-6">
          Monetize your AI expertise.
        </h1>
        <p className="text-lg text-ink-muted mb-10 leading-relaxed">
          Package the AI stack you've built — vendors, prompts, agent loops — as a metered{" "}
          <strong className="text-ink">API + CLI + MCP</strong> your clients' agents pay to call.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="/signup"
            className="inline-block px-6 py-3 rounded-lg bg-ink text-surface text-sm font-medium hover:bg-ink/90 transition-colors"
          >
            Get an API key
          </a>
          <a
            href="https://docs.example.com"
            className="inline-block px-6 py-3 rounded-lg border border-border text-ink text-sm font-medium hover:bg-surface-alt transition-colors"
          >
            Read the docs
          </a>
        </div>
        <p className="text-xs text-ink-light mt-12">
          Replace this scaffold with your brand. See <code>skills/customize-workstation</code> Step 6.
        </p>
      </div>
    </main>
  );
}
