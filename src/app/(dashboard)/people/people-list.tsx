"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ProfileDrawer } from "./profile-drawer"
import type { getPeople } from "@/services/people.service"

type Person = Awaited<ReturnType<typeof getPeople>>[number]

export function PeopleList({ people }: { people: Person[] }) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  function openProfile(userId: string) {
    setSelectedUserId(userId)
    setDrawerOpen(true)
  }

  if (people.length === 0) {
    return (
      <div className="border border-border-metal bg-gradient-to-b from-[rgba(42,48,60,0.88)] to-[rgba(25,33,34,0.96)] p-12">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="font-heading text-lg font-semibold text-primary">
            No members yet
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-outline max-w-sm">
            Members will appear here once they complete their profile setup.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2">
        {people.map((person, i) => (
          <div
            key={person.id}
            className="flex items-center gap-4 border border-border-metal bg-gradient-to-b from-[rgba(42,48,60,0.88)] to-[rgba(25,33,34,0.96)] px-4 py-3 transition-[transform,border-color] duration-160 ease-out hover:border-accent/30 active:scale-[0.99]"
            style={{ animation: `entrance 0.5s ease-out ${i * 0.04}s both` }}
          >
            <Avatar className="h-10 w-10 shrink-0 border border-border-metal">
              <AvatarImage src={person.user.image ?? undefined} />
              <AvatarFallback className="bg-accent/10 font-heading text-sm text-accent">
                {(person.user.name ?? "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-sm font-semibold text-primary truncate">
                  {person.user.name}
                </h3>
                {person.location && (
                  <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.06em] text-outline">
                    {formatLocation(person.location)}
                  </span>
                )}
              </div>
              {person.tldr && (
                <p className="mt-0.5 font-mono text-[11px] leading-relaxed text-primary/70 line-clamp-1">
                  {person.tldr}
                </p>
              )}
              {!person.tldr && person.topSkill && (
                <p className="mt-0.5 font-mono text-[11px] leading-relaxed text-outline line-clamp-1">
                  {person.topSkill.split(".")[0]}
                </p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {person.partnerships && (
                <Badge
                  variant="outline"
                  className="hidden border-accent/20 text-[10px] text-accent sm:inline-flex"
                >
                  {person.partnerships}
                </Badge>
              )}
              <Button
                variant="ghost"
                onClick={() => openProfile(person.userId)}
                className="h-8 border border-border-metal px-3 font-mono text-[10px] uppercase tracking-[0.06em] text-outline hover:border-accent/50 hover:text-accent"
              >
                Open Profile
              </Button>
            </div>
          </div>
        ))}
      </div>

      <ProfileDrawer
        userId={selectedUserId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </>
  )
}

function formatLocation(location: string): string {
  if (location === "Yes I am!" || location === "US") return "🇺🇸 US"
  return location
}
