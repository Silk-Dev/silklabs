"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { searchAll } from "@/services/workspace.service"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function SearchBar() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<{
    projects: { id: string; title: string; owner: { name: string | null } | null }[]
    people: { userId: string; user: { id: string; name: string | null; image: string | null }; tldr: string | null }[]
  }>({ projects: [], people: [] })
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  useEffect(() => {
    if (query.length < 2) {
      setResults({ projects: [], people: [] })
      setOpen(false)
      return
    }
    const timer = setTimeout(async () => {
      const data = await searchAll(query)
      setResults(data)
      setOpen(true)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  return (
    <div ref={ref} className="relative">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search projects & people..."
        className="w-full rounded-md border border-border-metal bg-[#0d1515] px-3 py-1.5 font-mono text-[12px] text-primary placeholder:text-outline/40 outline-none focus:border-accent/50"
      />
      {open && (results.projects.length > 0 || results.people.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-md border border-border-metal bg-surface shadow-lg">
          {results.projects.length > 0 && (
            <div className="p-2">
              <p className="mb-1 px-2 font-mono text-[9px] uppercase tracking-[0.12em] text-outline">
                Projects
              </p>
              {results.projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    router.push(`/projects/${p.id}`)
                    setOpen(false)
                    setQuery("")
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left font-mono text-[12px] text-primary transition-colors hover:bg-accent/10"
                >
                  {p.title}
                </button>
              ))}
            </div>
          )}
          {results.people.length > 0 && (
            <div className="border-t border-border-metal p-2">
              <p className="mb-1 px-2 font-mono text-[9px] uppercase tracking-[0.12em] text-outline">
                People
              </p>
              {results.people.map((p) => (
                <button
                  key={p.userId}
                  onClick={() => {
                    setOpen(false)
                    setQuery("")
                    router.push(`/people/${p.userId}`)
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent/10"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={p.user.image ?? undefined} />
                    <AvatarFallback className="font-heading text-[9px] text-accent">
                      {(p.user.name ?? "U").charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-mono text-[12px] text-primary">{p.user.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
