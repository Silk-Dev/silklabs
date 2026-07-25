import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
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
import { AppSidebar, MobileSidebar } from "@/components/app-sidebar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  const user = session.user

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <AppSidebar user={{ name: user.name ?? "User", email: user.email ?? "", image: user.image }} />

      {/* Main content area */}
      <div className="flex flex-1 flex-col md:ml-60">
        {/* Mobile header */}
        <MobileSidebar user={{ name: user.name ?? "User", email: user.email ?? "", image: user.image }} />

        {/* Top bar with user menu on desktop */}
        <div className="hidden h-14 items-center justify-end gap-2 border-b border-border-metal bg-surface/80 px-4 md:flex">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={session.user.image ?? undefined} />
                    <AvatarFallback className="font-mono text-[10px] uppercase tracking-widest">
                      {user.name?.charAt(0) ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-48 border-border-metal bg-surface">
              <div className="border-b border-border-metal px-2 py-2">
                <div className="font-heading text-sm font-semibold text-primary">{user.name}</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.06em] text-outline">{user.email}</div>
              </div>
              <DropdownMenuItem>
                <Link href="/settings" className="block w-full font-mono text-[11px] uppercase tracking-[0.06em]">
                  Settings
                </Link>
              </DropdownMenuItem>
              {(user as { role?: string }).role === "Admin" && (
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

        <main className="relative z-1 mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
      </div>
    </div>
  )
}
