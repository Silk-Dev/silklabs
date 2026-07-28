"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  Compass,
  FolderKanban,
  Users,
  MessageSquare,
  HeartHandshake,
  Gift,
  Network,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { SearchBar } from "@/app/(dashboard)/search-bar"
import { useSidebar } from "@/components/sidebar-context"

const NAV_ITEMS = [
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/projects", label: "My Projects", icon: FolderKanban },
  { href: "/people", label: "People", icon: Users },
  { href: "/workspace", label: "Workspace", icon: MessageSquare },
  { href: "/matches", label: "Matches", icon: HeartHandshake },
  { href: "/offer-builder", label: "Offer Builder", icon: Gift },
  { href: "/graph", label: "Graph", icon: Network },
]

export function AppSidebar({ user }: { user: { name: string; email: string; image?: string | null } }) {
  const pathname = usePathname()
  const { collapsed, toggleCollapsed } = useSidebar()

  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 flex flex-col border-r border-border-metal bg-surface max-md:hidden transition-all duration-300"
      style={{ width: "var(--sidebar-width, 15rem)" }}
    >
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-border-metal px-4">
        <Link href="/discover" className="flex items-center gap-2">
          <Image src="/silklearn.avif" alt="SILKLABS" width={28} height={28} className="shrink-0" />
          {!collapsed && (
            <span className="font-heading text-base font-bold tracking-tight text-primary">SILKLABS</span>
          )}
        </Link>
      </div>

      {/* Search — hidden when collapsed */}
      {!collapsed && (
        <div className="border-b border-border-metal px-3 py-3">
          <SearchBar />
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.06em] transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-outline hover:bg-surface-variant hover:text-foreground"
              } ${collapsed ? "justify-center px-2" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="size-4 shrink-0" />
              {!collapsed && item.label}
            </Link>
          )
        })}
      </nav>

      {/* User area */}
      <div className="border-t border-border-metal p-3">
        <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${collapsed ? "justify-center px-2" : ""}`}>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-[10px] uppercase tracking-widest text-foreground">
            {user.name?.charAt(0) ?? "U"}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <div className="truncate font-heading text-xs font-semibold text-foreground">{user.name}</div>
                <div className="truncate font-mono text-[9px] uppercase tracking-[0.06em] text-outline">{user.email}</div>
              </div>
              <ThemeToggle />
            </>
          )}
        </div>

        {/* Collapse toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleCollapsed}
          className="mt-2 w-full justify-center text-outline hover:text-foreground"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
        </Button>
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
