"use client"

/**
 * CollisionFeed — The Engine proposes whitespaces to the user.
 * This is the primary surface of /discover.
 * The directory is reachable as "browse all projects" — secondary.
 */

import { useState, useEffect } from "react"
import { CLASSIFICATION_COLORS, ATOM_TYPE_HUES } from "@/lib/genome-types"

interface ConceptDossier {
  genomeHash: string
  atoms: string[]
  name: string
  tagline: string
  viability: number
  explanation: string
  matchingCapabilities: string[]
  userCapabilities: string[]
}

export default function CollisionFeed({ userId, children }: { userId: string; children: React.ReactNode }) {
  const [dossiers, setDossiers] = useState<ConceptDossier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    loadFeed()
  }, [userId])

  const loadFeed = async () => {
    setLoading(true)
    setError("")
    try {
      // 1. Get whitespaces from gaps endpoint
      const gapsRes = await fetch("/api/genome/gaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 20 }),
      })
      if (!gapsRes.ok) {
        setError("Genome Engine offline")
        setLoading(false)
        return
      }
      const gapsData = await gapsRes.json()
      const whitespaces: { atoms: string[]; viability: number; explanation: string }[] =
        gapsData.whitespaces || []

      if (whitespaces.length === 0) {
        setDossiers([])
        setLoading(false)
        return
      }

      // 2. Get user's capability profile
      const capRes = await fetch("/api/user/capabilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      const capData = capRes.ok ? await capRes.json() : { capabilities: [] }
      const userCapabilities: string[] = capData.capabilities?.map((c: any) => c.atom) || []

      // 3. Build concepts for each whitespace and match against user
      const dossiersData: ConceptDossier[] = []

      for (const ws of whitespaces.slice(0, 10)) {
        const conceptRes = await fetch("/api/genome/concept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ atoms: ws.atoms }),
        })
        if (!conceptRes.ok) continue
        const concept = await conceptRes.json()

        // Match: which required capabilities does the user have?
        const matching = concept.requiredCapabilities
          ?.filter((rc: any) => userCapabilities.includes(rc.capabilityAtom))
          .map((rc: any) => rc.capabilityAtom) || []

        dossiersData.push({
          genomeHash: concept.genomeHash,
          atoms: concept.atoms,
          name: concept.name,
          tagline: concept.tagline,
          viability: concept.viability,
          explanation: ws.explanation || "Empty coordinate — no company occupies this genome.",
          matchingCapabilities: matching,
          userCapabilities: userCapabilities,
        })
      }

      // Rank by (viability × match fit)
      dossiersData.sort((a, b) => {
        const scoreA = a.viability * (a.matchingCapabilities.length + 1)
        const scoreB = b.viability * (b.matchingCapabilities.length + 1)
        return scoreB - scoreA
      })

      setDossiers(dossiersData)
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-sm text-zinc-500 animate-pulse">The Engine is scanning the genome...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="p-3 border border-red-800/50 bg-red-950/10 rounded-sm">
          <div className="text-xs text-red-400 font-bold">Genome Engine offline</div>
          <div className="text-[10px] text-red-500/70">
            The genome service is not running.
          </div>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    )
  }

  if (dossiers.length === 0) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center py-10">
          <div className="text-lg text-zinc-500">No whitespaces found</div>
          <div className="text-xs text-zinc-600 mt-2">
            The Engine couldn't find empty coordinates. Run the genome pipeline first.
          </div>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    )
  }

  // Strongest fit dominates
  const top = dossiers[0]
  const rest = dossiers.slice(1)

  return (
    <div className="p-4 space-y-8">
      {/* Hero: strongest fit */}
      <div>
        <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">
          The genome of the economy has {dossiers.length} empty coordinates. This one fits you best.
        </div>

        {/* Strongest fit — large */}
        <div className="border border-green-500/30 bg-green-950/5 rounded-sm p-6 space-y-4">
          {/* Atom constellation */}
          <div className="flex gap-1.5 flex-wrap">
            {top.atoms.map((a, i) => (
              <span
                key={i}
                className="inline-block px-2 py-0.5 text-[10px] font-mono rounded-sm"
                style={{
                  backgroundColor: "#22c55e22",
                  color: "#22c55e",
                  border: "1px solid #22c55e44",
                }}
              >
                {a.replace(/_/g, " ")}
              </span>
            ))}
          </div>

          {/* Name */}
          <h2
            className="text-2xl font-bold tracking-tight"
            style={{ color: CLASSIFICATION_COLORS.WHITESPACE }}
          >
            {top.name}
          </h2>

          <p className="text-sm text-zinc-400">{top.tagline}</p>

          {/* Viability */}
          <div className="flex items-center gap-4">
            <div>
              <div className="text-2xl font-bold tabular-nums text-green-400">{top.viability}</div>
              <div className="text-[9px] text-zinc-500 uppercase tracking-wider">Viability</div>
            </div>
          </div>

          {/* Why it's empty */}
          <div className="text-xs text-zinc-500 italic">{top.explanation}</div>

          {/* Why you */}
          {top.matchingCapabilities.length > 0 ? (
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Why You</div>
              {top.matchingCapabilities.map((cap) => (
                <div key={cap} className="text-xs text-green-400 font-mono">
                  ✓ You proved {cap.replace(/_/g, " ")}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-zinc-500 italic">
              This whitespace doesn't match your proven capabilities yet. Add proofs to your profile.
            </div>
          )}

          <a
            href={`/graph`}
            className="inline-block px-4 py-2 text-xs font-bold rounded-sm transition-all"
            style={{
              backgroundColor: CLASSIFICATION_COLORS.WHITESPACE,
              color: "#052e16",
            }}
          >
            See the team you'd need →
          </a>
        </div>
      </div>

      {/* Rest — secondary cards */}
      {rest.length > 0 && (
        <div className="space-y-4">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">
            {rest.length} more whitespaces that fit you
          </div>
          <div className="space-y-2">
            {rest.slice(0, 5).map((d, i) => (
              <div
                key={i}
                className="border border-zinc-800 rounded-sm p-4 space-y-2 hover:border-zinc-700 transition-colors"
              >
                <div className="flex gap-1 flex-wrap">
                  {d.atoms.map((a, j) => (
                    <span
                      key={j}
                      className="inline-block px-1.5 py-0.5 text-[9px] font-mono rounded-sm"
                      style={{
                        backgroundColor: "#22c55e15",
                        color: "#22c55e",
                        border: "1px solid #22c55e33",
                      }}
                    >
                      {a.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
                <h3 className="text-sm font-bold text-zinc-200">{d.name}</h3>
                <p className="text-[10px] text-zinc-500 italic">{d.explanation}</p>
                <div className="flex items-center justify-between">
                  <div className="text-xs tabular-nums text-green-400">{d.viability}</div>
                  {d.matchingCapabilities.length > 0 && (
                    <div className="text-[9px] text-zinc-500">
                      {d.matchingCapabilities.length} matching capabilities
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Browse all projects — secondary */}
      <div className="pt-4 border-t border-zinc-800">
        <div className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2">
          Browse all projects
        </div>
        {children}
      </div>
    </div>
  )
}
