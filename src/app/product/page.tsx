import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "How SilkLabs Matching Works",
  description:
    "The Reality Index matches founders with builders on shipped work, not claims. Backed by a genome map of 36,103 companies decomposed into 478 building blocks.",
  openGraph: {
    title: "How SilkLabs Matching Works",
    description:
      "Matching on evidence, not claims — powered by the Reality Index and a genome map of the global economy.",
  },
}

const GENOME_STATS = [
  { value: "36,103", label: "Companies mapped" },
  { value: "478", label: "Typed atoms" },
  { value: "325", label: "Market tags" },
  { value: "148", label: "Countries" },
]

const MODES = [
  {
    name: "Decompose",
    body: "Break any company down to its atomic building blocks — industry, business model, delivery, technology, labor and revenue model.",
  },
  {
    name: "Recombine",
    body: "Swap and evolve atoms to explore what your venture could become, and which proven models it should borrow from.",
  },
  {
    name: "Gaps",
    body: "Scan the whitespace. Find market combinations nobody is serving yet — before you commit months to a crowded idea.",
  },
  {
    name: "Validate",
    body: "Classify any idea against the map. Know instantly whether you're entering occupied territory or genuine whitespace.",
  },
]

export default function ProductPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border-metal bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/silklearn.avif" alt="SILKLABS" width={36} height={36} className="shrink-0" />
            <span className="font-heading text-lg font-bold tracking-tight text-primary">SILKLABS</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" className="font-mono text-[11px] uppercase tracking-[0.06em]">
                Home
              </Button>
            </Link>
            <Link href="/register">
              <Button className="border border-primary-container/40 bg-primary-container/10 font-mono text-[11px] uppercase tracking-[0.06em] text-primary-container hover:bg-primary-container/20">
                Start Your Project
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-1 flex-1 pt-14">
        {/* Hero */}
        <section className="relative overflow-hidden px-6 py-20 text-center sm:py-28">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,240,255,0.06),transparent_70%)]" />
          <div className="relative mx-auto max-w-3xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-outline">
              The machinery behind the match
            </p>
            <h1 className="mt-4 font-heading text-4xl font-bold tracking-tight text-primary sm:text-5xl lg:text-6xl">
              Matched on{" "}
              <span className="bg-gradient-to-r from-primary-container to-primary bg-clip-text text-transparent">
                evidence, not claims.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl font-mono text-[13px] uppercase tracking-[0.06em] text-outline">
              Anyone can write &ldquo;senior full-stack&rdquo; in a bio. SilkLabs verifies what people have actually built before they touch your venture.
            </p>
          </div>
        </section>

        {/* Reality Index */}
        <section className="border-y border-border-metal py-16 sm:py-24">
          <div className="mx-auto grid max-w-7xl gap-12 px-6 md:grid-cols-2 md:items-center">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-outline">Reality Index</p>
              <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-primary sm:text-4xl">
                Proof of work beats promises of work
              </h2>
              <p className="mt-6 leading-relaxed text-outline">
                Every builder on SilkLabs accumulates a Reality Index — a verified record of what
                they&apos;ve actually shipped. Repos, launches, ingested proofs of work. When you post a role,
                candidates are ranked by demonstrated capability in exactly the atoms your venture needs.
              </p>
              <p className="mt-4 leading-relaxed text-outline">
                The same index works in reverse. Before you commit to a co-founder or early hire,
                you can see their track record — not their self-description.
              </p>
            </div>
            <div className="grid gap-4">
              {[
                { k: "Claims", v: "\"I've built marketplaces at scale.\"", tone: "text-muted-foreground line-through decoration-destructive/60" },
                { k: "Reality", v: "Shipped and maintains two marketplace codebases · 4 launched products · verified ingest", tone: "text-primary" },
              ].map((row) => (
                <div key={row.k} className="border border-border-metal bg-surface/40 p-6">
                  <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-outline">{row.k}</p>
                  <p className={`mt-2 font-mono text-sm ${row.tone}`}>{row.v}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Genome map */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-6 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-outline">The Genome Map</p>
            <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-primary sm:text-4xl">
              We read the genome of the global economy
            </h2>
            <p className="mx-auto mt-6 max-w-2xl leading-relaxed text-outline">
              SilkLabs decomposes tens of thousands of companies into typed atoms — the reusable
              building blocks of business. That map powers whitespace discovery, venture concepts,
              and team assembly: we know which combinations of capabilities your idea needs, and
              which builders carry them.
            </p>
            <div className="mt-12 grid gap-6 grid-cols-2 lg:grid-cols-4">
              {GENOME_STATS.map((s) => (
                <div key={s.label} className="border border-border-metal bg-surface/40 p-6">
                  <p className="font-heading text-3xl font-bold tracking-tight text-primary sm:text-4xl">{s.value}</p>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.06em] text-outline">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Console modes */}
        <section className="border-y border-border-metal py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-6">
            <p className="text-center font-mono text-[10px] uppercase tracking-[0.08em] text-outline">Genome Console</p>
            <h2 className="mt-3 text-center font-heading text-3xl font-bold tracking-tight text-primary sm:text-4xl">
              Interrogate the map before you build
            </h2>
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {MODES.map((m) => (
                <div key={m.name} className="border border-border-metal bg-surface/40 p-6">
                  <h3 className="bg-gradient-to-r from-primary-container to-primary bg-clip-text font-mono text-sm font-bold uppercase tracking-[0.08em] text-transparent">
                    {m.name}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-outline">{m.body}</p>
                </div>
              ))}
            </div>
            <p className="mt-8 text-center font-mono text-[11px] uppercase tracking-[0.06em] text-outline">
              Available in-app on every dashboard
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-6 text-center">
            <h2 className="font-heading text-3xl font-bold tracking-tight text-primary sm:text-4xl">
              Stop recruiting. Start matching.
            </h2>
            <p className="mx-auto mt-4 max-w-lg font-mono text-[12px] uppercase tracking-[0.06em] text-outline">
              Post your vision and meet builders whose track record fits it — precisely.
            </p>
            <div className="mt-8">
              <Link href="/register">
                <Button
                  size="lg"
                  className="h-11 border border-primary-container/40 bg-primary-container/10 px-8 font-mono text-[12px] uppercase tracking-[0.08em] text-primary-container hover:bg-primary-container/20"
                >
                  Start Your Project
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border-metal py-8">
        <div className="mx-auto max-w-7xl px-6 text-center font-mono text-[10px] uppercase tracking-[0.06em] text-outline">
          SILKLABS &mdash; Matched on proof. Built to ship. &nbsp;&middot;&nbsp;{" "}
          <Link href="/terms" className="hover:text-primary">
            Terms
          </Link>
        </div>
      </footer>
    </div>
  )
}
