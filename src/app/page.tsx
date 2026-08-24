import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { FeaturedProjects } from "./featured-projects"
import { getHomePageData } from "./home-data"

export const dynamic = "force-dynamic"

const PAINS = [
  {
    title: "Co-founder roulette",
    body: "Hackathons, Slack groups, cold DMs. You spend months vetting people who talk a great game and disappear at the first commit.",
  },
  {
    title: "Résumé theater",
    body: "Polished profiles hide thin track records. By the time you discover someone can't ship, you've already burned your runway.",
  },
  {
    title: "Vision without traction",
    body: "Investors and early collaborators want evidence, not pitch decks. You need to show momentum before anyone commits.",
  },
]

const STEPS = [
  {
    step: "01",
    title: "Post your vision",
    body: "Describe what you're building and the roles you need. SilkLabs turns your idea into a structured project brief with concrete, fillable positions.",
  },
  {
    step: "02",
    title: "Get matched on proof",
    body: "Our Reality Index ranks builders by their actual shipped work — repos, launches, proofs — not by what their profile claims.",
  },
  {
    step: "03",
    title: "Assemble and ship",
    body: "Review applicants, fill roles with verified talent, and run your build inside a shared workspace built for shipping.",
  },
]

export default async function HomePage() {
  const data = await getHomePageData()
  const projectCount = data?.projectCount ?? 0
  const userCount = data?.userCount ?? 0
  const featuredProjects = data?.featuredProjects ?? []
  const totalTeamMembers = data?.totalTeamMembers ?? 0

  return (
    <div className="flex min-h-screen flex-col">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border-metal bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/silklearn.avif"
              alt="SILKLABS"
              width={36}
              height={36}
              className="shrink-0"
            />
            <span className="font-heading text-lg font-bold tracking-tight text-primary">
              SILKLABS
            </span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/product">
              <Button variant="ghost" className="font-mono text-[11px] uppercase tracking-[0.06em]">
                Product
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost" className="font-mono text-[11px] uppercase tracking-[0.06em]">
                Sign In
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

      <main className="relative z-1 flex-1">
        {/* Hero */}
        <section className="relative flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center overflow-hidden px-6 pt-14 text-center">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,240,255,0.06),transparent_70%)]" />
          <div className="relative">
            <div className="mx-auto mb-6 inline-flex items-center gap-2 border border-border-metal bg-surface/60 px-4 py-1.5">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ff4d4f] opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-[#ff4d4f]" />
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-outline">
                {projectCount} projects looking for their team right now
              </span>
            </div>
            <h1 className="font-heading max-w-3xl text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Find the team
              <br />
              <span className="bg-gradient-to-r from-primary-container to-primary bg-clip-text text-transparent">
                that ships your vision.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl font-mono text-[13px] uppercase tracking-[0.06em] text-outline">
              SilkLabs matches founders with builders whose work proves they can
              deliver. No recruiting roulette. No résumé theater.
            </p>
            <div className="mt-8 flex items-center justify-center gap-4">
              <Link href="/register">
                <Button
                  size="lg"
                  className="h-11 border border-primary-container/40 bg-primary-container/10 px-8 font-mono text-[12px] uppercase tracking-[0.08em] text-primary-container hover:bg-primary-container/20"
                >
                  Start Your Project
                </Button>
              </Link>
              <Link href="/product">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-11 border-border-metal bg-surface/40 px-8 font-mono text-[12px] uppercase tracking-[0.08em] text-outline hover:bg-surface hover:text-primary"
                >
                  How Matching Works
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Problem */}
        <section className="border-y border-border-metal py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-6">
            <p className="text-center font-mono text-[10px] uppercase tracking-[0.08em] text-outline">
              The problem
            </p>
            <h2 className="mt-3 text-center font-heading text-3xl font-bold tracking-tight text-primary sm:text-4xl">
              Most ventures don&apos;t die from bad ideas.
              <br />
              They die waiting for the right people.
            </h2>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {PAINS.map((pain) => (
                <div key={pain.title} className="border border-border-metal bg-surface/40 p-6">
                  <h3 className="font-heading text-lg font-bold text-primary">{pain.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-outline">{pain.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-6">
            <p className="text-center font-mono text-[10px] uppercase tracking-[0.08em] text-outline">
              How it works
            </p>
            <h2 className="mt-3 text-center font-heading text-3xl font-bold tracking-tight text-primary sm:text-4xl">
              From idea to team in three moves
            </h2>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {STEPS.map((s) => (
                <div key={s.step} className="border border-border-metal bg-surface/40 p-6">
                  <p className="bg-gradient-to-r from-primary-container to-primary bg-clip-text font-mono text-sm font-bold text-transparent">
                    {s.step}
                  </p>
                  <h3 className="mt-3 font-heading text-lg font-bold text-primary">{s.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-outline">{s.body}</p>
                </div>
              ))}
            </div>
            <p className="mt-8 text-center font-mono text-[11px] uppercase tracking-[0.06em] text-outline">
              Backed by the{" "}
              <Link href="/product" className="text-primary underline underline-offset-4 hover:text-primary-container">
                Reality Index
              </Link>{" "}
              — matching on evidence, not claims
            </p>
          </div>
        </section>

        {/* Stats */}
        <section className="border-y border-border-metal py-16">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid gap-8 sm:grid-cols-3">
              {[
                { label: "Active Projects", value: projectCount },
                { label: "Builders", value: userCount },
                { label: "Team Members", value: totalTeamMembers },
              ].map((stat) => (
                <div key={stat.label} className="border border-border-metal bg-surface/40 p-6 text-center">
                  <p className="font-heading text-4xl font-bold tracking-tight text-primary sm:text-5xl">
                    {stat.value}
                  </p>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.06em] text-outline">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Projects */}
        {featuredProjects.length > 0 && (
          <section className="py-16 sm:py-24">
            <div className="mx-auto max-w-7xl px-6">
              <div className="mb-10">
                <h2 className="font-heading text-3xl font-bold tracking-tight text-primary">
                  Ventures hiring now
                </h2>
                <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.06em] text-outline">
                  Founders looking for proven builders like you
                </p>
              </div>
              <FeaturedProjects projects={featuredProjects} />
              <div className="mt-10 text-center">
                <Link href="/discover">
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-border-metal bg-surface/40 font-mono text-[11px] uppercase tracking-[0.08em]"
                  >
                    View all projects
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="border-t border-border-metal py-16 sm:py-24">
          <div className="mx-auto max-w-7xl text-center">
            <h2 className="font-heading text-3xl font-bold tracking-tight text-primary sm:text-4xl">
              Your vision is ready. Your team is here.
            </h2>
            <p className="mx-auto mt-4 max-w-lg font-mono text-[12px] uppercase tracking-[0.06em] text-outline">
              Post your project today. Meet builders who&apos;ve already proven
              they can ship it.
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
