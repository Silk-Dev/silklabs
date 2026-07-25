"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { SearchBar } from "@/app/(dashboard)/search-bar"

const NAV_ITEMS = [
  { href: "/discover", label: "Discover" },
  { href: "/projects", label: "My Projects" },
  { href: "/people", label: "People" },
  { href: "/workspace", label: "Workspace" },
  { href: "/matches", label: "Matches" },
  { href: "/offer-builder", label: "Offer Builder" },
  { href: "/graph", label: "Graph" },
]

export function AppSidebar({ user }: { user: { name: string; email: string; image?: string | null } }) {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-border-metal bg-surface max-md:hidden">
      {/* Logo */}
      <div className="flex h-14 items-center gap-3 border-b border-border-metal px-4">
        <Link href="/discover" className="flex items-center gap-2">
          <Image src="/silklearn.avif" alt="SILKLABS" width={28} height={28} />
          <span className="font-heading text-base font-bold tracking-tight text-primary">SILKLABS</span>
        </Link>
      </div>

      {/* Search */}
      <div className="border-b border-border-metal px-3 py-3">
        <SearchBar />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.06em] transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-outline hover:bg-surface-variant hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User area */}
      <div className="border-t border-border-metal p-3">
        <div className="flex items-center gap-2 rounded-lg px-3 py-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted font-mono text-[10px] uppercase tracking-widest text-foreground">
            {user.name?.charAt(0) ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="truncate font-heading text-xs font-semibold text-foreground">{user.name}</div>
            <div className="truncate font-mono text-[9px] uppercase tracking-[0.06em] text-outline">{user.email}</div>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  )
}

export function MobileSidebar({ user }: { user: { name: string; email: string; image?: string | null } }) {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 border-b border-border-metal bg-surface/80 backdrop-blur-md md:hidden">
      <div className="flex h-14 items-center justify-between gap-4 px-4">
        <Link href="/discover" className="flex items-center gap-2 shrink-0">
          <Image src="/silklearn.avif" alt="SILKLABS" width={36} height={36} />
          <span className="font-heading text-lg font-bold tracking-tight text-primary">SILKLABS</span>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <details className="group relative">
            <summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-full bg-muted font-mono text-[10px] uppercase tracking-widest text-foreground">
              {user.name?.charAt(0) ?? "U"}
            </summary>
            <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-border-metal bg-surface p-2 shadow-xl">
              <div className="border-b border-border-metal px-2 py-2">
                <div className="font-heading text-sm font-semibold text-primary">{user.name}</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.06em] text-outline">{user.email}</div>
              </div>
              <nav className="mt-2 space-y-0.5">
                {NAV_ITEMS.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block rounded-md px-3 py-2 font-mono text-[11px] uppercase tracking-[0.06em] transition-colors ${
                        isActive ? "bg-primary/10 text-primary" : "text-outline hover:text-foreground"
                      }`}
                    >
                      {item.label}
                    </Link>
                  )
                })}
              </nav>
            </div>
          </details>
        </div>
      </div>
    </header>
  )
}
