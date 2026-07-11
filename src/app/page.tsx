import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { FeaturedProjects } from "./featured-projects"
import { getHomePageData } from "./home-data"

export const dynamic = "force-dynamic"

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
            <Link href="/login">
              <Button variant="ghost" className="font-mono text-[11px] uppercase tracking-[0.06em]">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button className="border border-primary-container/40 bg-primary-container/10 font-mono text-[11px] uppercase tracking-[0.06em] text-primary-container hover:bg-primary-container/20">
                Get Started
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
                {projectCount} projects looking for collaborators
              </span>
            </div>
            <h1 className="font-heading max-w-3xl text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Find your team.
              <br />
              <span className="bg-gradient-to-r from-primary-container to-primary bg-clip-text text-transparent">
                Build something great.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl font-mono text-[13px] uppercase tracking-[0.06em] text-outline">
              SILKLABS connects builders with the projects they care about. Discover roles, join
              teams, and ship together.
            </p>
            <div className="mt-8 flex items-center justify-center gap-4">
              <Link href="/register">
                <Button
                  size="lg"
                  className="h-11 border border-primary-container/40 bg-primary-container/10 px-8 font-mono text-[12px] uppercase tracking-[0.08em] text-primary-container hover:bg-primary-container/20"
                >
                  Create Account
                </Button>
              </Link>
              <Link href="/discover">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-11 border-border-metal bg-surface/40 px-8 font-mono text-[12px] uppercase tracking-[0.08em] text-outline hover:bg-surface hover:text-primary"
                >
                  Browse Projects
                </Button>
              </Link>
            </div>
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
                  Featured Projects
                </h2>
                <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.06em] text-outline">
                  Discover projects looking for talent like yours
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
          <div className="mx-auto max-w-7xl px-6 text-center">
            <h2 className="font-heading text-3xl font-bold tracking-tight text-primary sm:text-4xl">
              Ready to build something?
            </h2>
            <p className="mx-auto mt-4 max-w-lg font-mono text-[12px] uppercase tracking-[0.06em] text-outline">
              Join thousands of builders finding their next team. Create your profile and start
              exploring projects today.
            </p>
            <div className="mt-8">
              <Link href="/register">
                <Button
                  size="lg"
                  className="h-11 border border-primary-container/40 bg-primary-container/10 px-8 font-mono text-[12px] uppercase tracking-[0.08em] text-primary-container hover:bg-primary-container/20"
                >
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border-metal py-8">
        <div className="mx-auto max-w-7xl px-6 text-center font-mono text-[10px] uppercase tracking-[0.06em] text-outline">
          SILKLABS &mdash; Build your next project with the right team.
        </div>
      </footer>
    </div>
  )
}
