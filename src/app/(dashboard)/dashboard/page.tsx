export const dynamic = "force-dynamic"

import Link from "next/link"
import { redirect } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import {
  Plus,
  Users,
  HeartHandshake,
  Gift,
  Network,
  MessageSquare,
  FolderKanban,
  Bell,
  ArrowRight,
  BriefcaseBusiness,
  UserPlus,
} from "lucide-react"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { Button } from "@/components/ui/button"

const STATUS_STYLES: Record<string, string> = {
  Pending: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  Accepted: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  Rejected: "border-red-500/30 bg-red-500/10 text-red-400",
}

export default async function DashboardPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  const userId = session.user.id

  const [
    profile,
    projectCount,
    applicationCount,
    applications,
    unreadCount,
    notifications,
    teamCount,
    twin,
  ] = await Promise.all([
    prisma.profile.findUnique({
      where: { userId },
      select: { tldr: true, topSkill: true, isPublic: true, onboardingCompleted: true },
    }),
    prisma.project.count({ where: { ownerId: userId } }),
    prisma.application.count({ where: { userId } }),
    prisma.application.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        role: {
          select: {
            id: true,
            title: true,
            project: { select: { id: true, title: true } },
          },
        },
      },
    }),
    prisma.notification.count({ where: { userId, read: false } }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.teamMember.count({ where: { userId } }),
    prisma.twinVector.findMany({
      where: { ownerType: "USER", ownerId: userId },
      select: { id: true },
    }),
  ])

  const twinIds = twin.map((t) => t.id)
  const matchesCount =
    twinIds.length > 0
      ? await prisma.alignment.count({
          where: { OR: [{ userTwinId: { in: twinIds } }, { matchTwinId: { in: twinIds } }] },
        })
      : 0

  const myProjects = await prisma.project.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
    take: 4,
    select: {
      id: true,
      title: true,
      tagline: true,
      _count: { select: { teamMembers: true } },
      roles: { where: { isFilled: false }, select: { id: true } },
    },
  })

  const firstName = session.user.name?.split(" ")[0] || "there"

  const stats = [
    { label: "My Projects", value: projectCount, icon: FolderKanban, href: "/projects" },
    { label: "Applications", value: applicationCount, icon: BriefcaseBusiness, href: "/projects" },
    { label: "Matches", value: matchesCount, icon: HeartHandshake, href: "/matches" },
    { label: "Unread", value: unreadCount, icon: Bell, href: "/notifications" },
    { label: "Teams", value: teamCount, icon: Users, href: "/people" },
  ]

  const quickActions = [
    { label: "Create Project", icon: Plus, href: "/projects/new" },
    { label: "Find People", icon: Users, href: "/people" },
    { label: "View Matches", icon: HeartHandshake, href: "/matches" },
    { label: "Offer Builder", icon: Gift, href: "/offer-builder" },
    { label: "Graph", icon: Network, href: "/graph" },
    { label: "Workspace", icon: MessageSquare, href: "/workspace" },
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-8">
      {/* Welcome header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-outline">
            Command Center
          </p>
          <h1 className="font-heading mt-1 text-3xl font-bold tracking-tight text-primary">
            Welcome back, {firstName}
          </h1>
          {profile?.tldr && (
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">{profile.tldr}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {profile?.topSkill && (
            <span className="border border-border-metal bg-surface/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.06em] text-primary">
              {profile.topSkill}
            </span>
          )}
          <Link href="/projects/new">
            <Button className="border border-primary-container/40 bg-primary-container/10 font-mono text-[11px] uppercase tracking-[0.06em] text-primary-container hover:bg-primary-container/20">
              <Plus className="size-3.5" />
              New Project
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats grid */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group border border-border-metal bg-surface/40 p-5 transition-colors hover:border-primary/40 hover:bg-surface"
          >
            <div className="flex items-center justify-between">
              <stat.icon className="size-4 text-outline transition-colors group-hover:text-primary" />
              <ArrowRight className="size-3.5 text-outline opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <p className="font-heading mt-4 text-3xl font-bold tabular-nums text-primary">
              {stat.value}
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.06em] text-outline">
              {stat.label}
            </p>
          </Link>
        ))}
      </section>

      {/* Quick actions */}
      <section className="border border-border-metal bg-surface/40 p-5">
        <h2 className="font-heading text-lg font-bold tracking-tight text-primary">Quick Actions</h2>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.06em] text-outline">
          Jump back in
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="flex items-center gap-2.5 rounded-lg border border-border-metal bg-surface/60 px-3 py-3 transition-colors hover:border-primary/40 hover:bg-surface"
            >
              <action.icon className="size-4 shrink-0 text-outline" />
              <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
                {action.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent applications */}
        <section className="border border-border-metal bg-surface/40">
          <div className="flex items-center justify-between border-b border-border-metal px-5 py-4">
            <div>
              <h2 className="font-heading text-lg font-bold tracking-tight text-primary">
                Applications
              </h2>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-outline">
                Recent activity
              </p>
            </div>
            <Link
              href="/projects"
              className="font-mono text-[10px] uppercase tracking-[0.06em] text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-border-metal/60">
            {applications.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <BriefcaseBusiness className="mx-auto size-6 text-outline" />
                <p className="mt-3 text-sm text-muted-foreground">No applications yet.</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.06em] text-outline">
                  Browse projects and apply to roles
                </p>
                <Link href="/projects">
                  <Button variant="outline" size="sm" className="mt-4 border-border-metal">
                    Browse Projects
                  </Button>
                </Link>
              </div>
            ) : (
              applications.map((app) => (
                <Link
                  key={app.id}
                  href={`/projects/${app.role.project.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-surface"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">
                      {app.role.title}
                      <span className="text-outline"> · </span>
                      <span className="text-muted-foreground">{app.role.project.title}</span>
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-outline">
                      {formatDistanceToNow(new Date(app.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-sm border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em] ${STATUS_STYLES[app.status] ?? ""}`}
                  >
                    {app.status}
                  </span>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Notifications */}
        <section className="border border-border-metal bg-surface/40">
          <div className="flex items-center justify-between border-b border-border-metal px-5 py-4">
            <div>
              <h2 className="font-heading text-lg font-bold tracking-tight text-primary">
                Notifications
              </h2>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-outline">
                Latest updates
              </p>
            </div>
            <Link
              href="/notifications"
              className="font-mono text-[10px] uppercase tracking-[0.06em] text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-border-metal/60">
            {notifications.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Bell className="mx-auto size-6 text-outline" />
                <p className="mt-3 text-sm text-muted-foreground">You&apos;re all caught up.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.link ?? "/notifications"}
                  className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-surface"
                >
                  <span
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read ? "bg-border-metal" : "bg-primary"}`}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">{n.title}</p>
                    {n.body && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{n.body}</p>
                    )}
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-outline">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>

      {/* My projects */}
      <section className="border border-border-metal bg-surface/40">
        <div className="flex items-center justify-between border-b border-border-metal px-5 py-4">
          <div>
            <h2 className="font-heading text-lg font-bold tracking-tight text-primary">
              My Projects
            </h2>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-outline">
              {myProjects.length > 0
                ? `${projectCount} total · ${myProjects.reduce((n, p) => n + p.roles.length, 0)} open roles`
                : "Start something new"}
            </p>
          </div>
          <Link
            href="/projects/new"
            className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.06em] text-primary hover:underline"
          >
            <Plus className="size-3.5" />
            New Project
          </Link>
        </div>
        <div className="grid gap-px bg-border-metal/40 sm:grid-cols-2">
          {myProjects.length === 0 ? (
            <div className="bg-surface/40 px-5 py-10 text-center sm:col-span-2">
              <UserPlus className="mx-auto size-6 text-outline" />
              <p className="mt-3 text-sm text-muted-foreground">
                You haven&apos;t created any projects yet.
              </p>
              <Link href="/projects/new">
                <Button size="sm" className="mt-4 border border-primary-container/40 bg-primary-container/10 font-mono text-[11px] uppercase tracking-[0.06em] text-primary-container hover:bg-primary-container/20">
                  Create your first project
                </Button>
              </Link>
            </div>
          ) : (
            myProjects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="group bg-surface/40 p-5 transition-colors hover:bg-surface"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-heading font-bold tracking-tight text-primary group-hover:underline">
                    {p.title}
                  </h3>
                  <ArrowRight className="size-4 shrink-0 text-outline opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                {p.tagline && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.tagline}</p>
                )}
                <div className="mt-3 flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.06em] text-outline">
                  <span>{p.roles.length} open role{p.roles.length === 1 ? "" : "s"}</span>
                  <span>{p._count.teamMembers} team member{p._count.teamMembers === 1 ? "" : "s"}</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
