"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"

interface TeamGridProps {
  members: Array<{
    id: string
    role: string | null
    user: { id: string; name: string | null; image: string | null }
  }>
}

export function TeamGrid({ members }: TeamGridProps) {
  if (members.length === 0) {
    return (
      <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-outline">
        No team members yet.
      </p>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {members.map((member) => (
        <HoverCard key={member.id}>
          <HoverCardTrigger delay={200}>
            <div className="group relative flex cursor-default items-center gap-3 border border-border-metal bg-gradient-to-b from-[rgba(42,48,60,0.88)] to-[rgba(25,33,34,0.96)] p-3 transition-colors hover:border-primary-container/20">
              <div className="absolute inset-y-0 left-0 w-[3px] bg-border-metal" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-120%] transition-transform duration-700 group-hover:translate-x-[120%]" />
              <Avatar className="h-10 w-10">
                <AvatarImage src={member.user.image ?? undefined} />
                <AvatarFallback className="font-mono text-[10px] uppercase">
                  {member.user.name?.charAt(0) ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-heading text-sm font-semibold text-primary">
                  {member.user.name ?? "Anonymous"}
                </p>
                <p className="truncate font-mono text-[10px] uppercase tracking-[0.04em] text-outline">
                  {member.role ?? "Team Member"}
                </p>
              </div>
            </div>
          </HoverCardTrigger>
          <HoverCardContent
            side="right"
            align="start"
            className="w-56 border-border-metal bg-gradient-to-b from-[rgba(42,48,60,0.88)] to-[rgba(25,33,34,0.96)]"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={member.user.image ?? undefined} />
                <AvatarFallback className="font-mono text-sm uppercase">
                  {member.user.name?.charAt(0) ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-heading font-semibold text-primary">
                  {member.user.name ?? "Anonymous"}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-[0.04em] text-outline">
                  {member.role ?? "Team Member"}
                </p>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
      ))}
    </div>
  )
}
