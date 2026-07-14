import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ThemeToggle } from "@/components/theme-toggle"
import { signOutAction } from "@/services/auth.service"
import { SearchBar } from "./search-bar"
import { NotificationBell } from "./notification-bell"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  const unreadCount = await prisma.notification.count({
    where: { userId: session.user.id, read: false },
  })

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-border-metal bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-4">
            <Link href="/discover" className="flex items-center gap-2 shrink-0">
              <Image
                src="/silklearn.avif"
                alt="SILKLABS"
                width={36}
                height={36}
                className="shrink-0"
              />
              <span className="hidden font-heading text-lg font-bold tracking-tight text-primary sm:inline">
                SILKLABS
              </span>
            </Link>

            <nav className="hidden items-center gap-1 md:flex">
              <NavLink href="/discover">Discover</NavLink>
              <NavLink href="/projects">My Projects</NavLink>
              <NavLink href="/people">People</NavLink>
              <NavLink href="/workspace">Workspace</NavLink>
              <NavLink href="/graph">Graph</NavLink>
            </nav>
          </div>

          <div className="hidden flex-1 max-w-md md:block">
            <SearchBar />
          </div>

          <div className="flex items-center gap-2">
          <NotificationBell initialCount={unreadCount} />
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={session.user.image ?? undefined} />
                    <AvatarFallback className="font-mono text-[10px] uppercase tracking-widest">
                      {session.user.name?.charAt(0) ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 border-border-metal bg-surface">
                <div className="border-b border-border-metal px-2 py-2">
                  <div className="font-heading text-sm font-semibold text-primary">
                    {session.user.name}
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.06em] text-outline">
                    {session.user.email}
                  </div>
                </div>
                <DropdownMenuItem>
                  <Link href="/settings" className="block w-full font-mono text-[11px] uppercase tracking-[0.06em]">
                    Settings
                  </Link>
                </DropdownMenuItem>
                {(session.user as { role?: string }).role === "Admin" && (
                  <DropdownMenuItem>
                    <Link href="/admin" className="block w-full font-mono text-[11px] uppercase tracking-[0.06em]">
                      Admin
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem>
                  <form action={signOutAction}>
                    <button type="submit" className="w-full text-left font-mono text-[11px] uppercase tracking-[0.06em]">
                      Sign Out
                    </button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="relative z-1 mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
    </div>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-outline transition-colors hover:text-primary"
    >
      {children}
    </Link>
  )
}
