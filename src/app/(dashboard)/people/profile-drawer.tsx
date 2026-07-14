"use client"

import { useEffect, useState } from "react"
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { getPerson } from "@/services/people.service"

type Person = Awaited<ReturnType<typeof getPerson>>

export function ProfileDrawer({
  userId,
  open,
  onOpenChange,
}: {
  userId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[380px] border-l border-border-metal bg-gradient-to-b from-[rgba(25,33,34,0.96)] to-[rgba(13,21,21,0.98)] p-0 sm:max-w-[380px]"
      >
        <SheetTitle className="sr-only">Profile</SheetTitle>
        <SheetDescription className="sr-only">User profile details</SheetDescription>
        {userId ? <ProfileContent userId={userId} /> : <EmptyState />}
      </SheetContent>
    </Sheet>
  )
}

function ProfileContent({ userId }: { userId: string }) {
  const [person, setPerson] = useState<Person>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getPerson(userId).then((data) => {
      setPerson(data)
      setLoading(false)
    })
  }, [userId])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  if (!person) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-outline">
          Profile not found
        </p>
      </div>
    )
  }

  const joinedDate = new Date(person.user.createdAt)
  const monthsAgo = Math.floor(
    (Date.now() - joinedDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
  )

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-border-metal p-6 text-center">
        <Avatar className="mx-auto h-20 w-20 border-2 border-border-metal">
          <AvatarImage src={person.user.image ?? undefined} />
          <AvatarFallback className="bg-accent/10 font-heading text-2xl text-accent">
            {(person.user.name ?? "U").charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <h2 className="mt-3 font-heading text-lg font-semibold text-primary">
          {person.user.name}
        </h2>
        {person.location && (
          <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-outline">
            {formatLocation(person.location)}
          </p>
        )}
        <p className="mt-1 font-mono text-[10px] text-outline/60">
          Joined {monthsAgo > 0 ? `${monthsAgo} month${monthsAgo !== 1 ? "s" : ""} ago` : "Recently"}
        </p>
      </div>

      <div className="flex-1 space-y-4 p-6">
        {person.tldr && (
          <div>
            <h4 className="font-mono text-[9px] uppercase tracking-[0.12em] text-outline">TL;DR</h4>
            <p className="mt-1 font-mono text-[12px] leading-relaxed text-primary/80">{person.tldr}</p>
          </div>
        )}

        {person.tldr && <Separator className="bg-border-metal" />}

        {person.topSkill && (
          <div>
            <h4 className="font-mono text-[9px] uppercase tracking-[0.12em] text-outline">Top Skill</h4>
            <p className="mt-1 font-mono text-[12px] leading-relaxed text-primary/80">{person.topSkill}</p>
          </div>
        )}

        {person.topSkill && <Separator className="bg-border-metal" />}

        {person.experience && (
          <div>
            <h4 className="font-mono text-[9px] uppercase tracking-[0.12em] text-outline">About me</h4>
            <p className="mt-1 font-mono text-[12px] leading-relaxed text-primary/80">
              {person.experience === "Yes I do!"
                ? "Has prior business experience."
                : "New to the startup space."}
            </p>
          </div>
        )}

        {person.partnerships && (
          <>
            <Separator className="bg-border-metal" />
            <div>
              <h4 className="font-mono text-[9px] uppercase tracking-[0.12em] text-outline">What am I looking for?</h4>
              <p className="mt-1 font-mono text-[12px] leading-relaxed text-primary/80">{person.partnerships}</p>
            </div>
          </>
        )}

        {person.commitment && (
          <>
            <Separator className="bg-border-metal" />
            <div>
              <h4 className="font-mono text-[9px] uppercase tracking-[0.12em] text-outline">Commitment</h4>
              <p className="mt-1 font-mono text-[12px] leading-relaxed text-primary/80">{person.commitment}</p>
            </div>
          </>
        )}
      </div>

      <div className="border-t border-border-metal p-4">
        <Button className="w-full font-mono text-[11px] uppercase tracking-[0.08em]">
          Connect
        </Button>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-outline">
        Select a profile to view
      </p>
    </div>
  )
}

function formatLocation(location: string): string {
  if (location === "Yes I am!" || location === "US") return "🇺🇸 US"
  return `📍 ${location}`
}
