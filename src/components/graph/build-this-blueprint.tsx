"use client"

/**
 * BuildThisBlueprint
 *
 * The surface that unfolds over the graph canvas when a user hits
 * "Build This" on a WHITESPACE landing. Renders the venture concept,
 * required capability sockets, and Clingo-assembled team.
 *
 * This is a surface over the live canvas, not a separate page.
 * The graph stays active behind the dimmed overlay.
 */

import { useState, useEffect, useCallback } from "react"
import { ATOM_TYPE_HUES, CLASSIFICATION_COLORS } from "@/lib/genome-types"
import type { TeamResponse } from "@/lib/genome-types"

// ─── Types ───

export interface BlueprintProps {
  genomeHash: string
  atoms: string[]
  conceptName: string
  tagline: string
  requiredCapabilities: { capabilityAtom: string; sourceAtom: string; sourceType: string; label: string }[]
  viability: number
  onClose: () => void
  onNotify: (team: string[]) => void
}

interface TeamMember {
  id: string
  covers: { capability: string; label: string }[]
  viability: number
  revealed: boolean
}

// ─── Component ───

export default function BuildThisBlueprint({
  genomeHash,
  atoms,
  conceptName,
  tagline,
  requiredCapabilities,
  viability,
  onClose,
  onNotify,
}: BlueprintProps) {
  const [phase, setPhase] = useState<"concept" | "requirements" | "assembling" | "complete" | "error">("concept")
  const [teamResponse, setTeamResponse] = useState<TeamResponse | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [revealedCount, setRevealedCount] = useState(0)
  const [notifying, setNotifying] = useState(false)

  // ── Auto-advance through phases ──

  useEffect(() => {
    if (phase === "concept") {
      const t = setTimeout(() => setPhase("requirements"), 800)
      return () => clearTimeout(t)
    }
    if (phase === "requirements") {
      const t = setTimeout(() => assembleTeam(), 600)
      return () => clearTimeout(t)
    }
  }, [phase])

  // ── Team assembly ──

  const assembleTeam = useCallback(async () => {
    setPhase("assembling")
    try {
      // Get candidate humans from the capability profile (via API)
      // For now, query /team with the required capabilities
      const res = await fetch("/api/genome/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          required_atoms: requiredCapabilities.map((c) => c.capabilityAtom),
          available_humans: [], // Service layer will query TwinVector
          hard_conflicts: [],
          max_team_size: Math.min(requiredCapabilities.length + 1, 5),
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        console.error("Team assembly failed:", text)
        setPhase("error")
        return
      }

      const data: TeamResponse = await res.json()
      setTeamResponse(data)

      if (data.feasible && data.optimal_team.length > 0) {
        // Build team members with their coverage
        const members: TeamMember[] = data.optimal_team.map((id) => ({
          id,
          covers: data.capability_coverage
            .filter((c) => c.human === id)
            .map((c) => ({
              capability: c.capability,
              label: c.capability.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
            })),
          viability: data.total_viability / data.optimal_team.length,
          revealed: false,
        }))
        setTeamMembers(members)

        // Stagger reveal each member
        let i = 0
        const interval = setInterval(() => {
          i++
          setRevealedCount(i)
          if (i >= members.length) {
            clearInterval(interval)
            setPhase("complete")
          }
        }, 600)
        return () => clearInterval(interval)
      } else {
        // No team feasible — show the gap
        setPhase("complete")
      }
    } catch (e) {
      console.error("Team assembly error:", e)
      setPhase("error")
    }
  }, [requiredCapabilities])

  // ── Notify ──

  const handleNotify = async () => {
    setNotifying(true)
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "team_draft",
          conceptName,
          genomeHash,
          teamMemberIds: teamMembers.map((m) => m.id),
        }),
      })
      if (res.ok) {
        onNotify(teamMembers.map((m) => m.id))
      }
    } catch {
      // silent
    }
    setNotifying(false)
  }

  // ── Compute coverage ──

  const coveredCapabilities = new Set(teamMembers.flatMap((m) => m.covers.map((c) => c.capability)))
  const uncovered = requiredCapabilities.filter((rc) => !coveredCapabilities.has(rc.capabilityAtom))

  // ── Render ──

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm">
      <div className="w-[560px] max-h-[90vh] overflow-y-auto space-y-6 p-8">
        {/* ── Phase 1: Concept ── */}
        {phase === "concept" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-4 text-center">
            {/* Atom constellation */}
            <div className="flex justify-center gap-2 flex-wrap">
              {atoms.map((a, i) => {
                const type = "industry" // simplified; real lookup would need atomTypes prop
                return (
                  <span
                    key={i}
                    className="inline-block px-3 py-1 text-xs font-mono rounded-sm"
                    style={{
                      backgroundColor: (ATOM_TYPE_HUES[type] || "#888") + "22",
                      color: ATOM_TYPE_HUES[type] || "#888",
                      border: `1px solid ${(ATOM_TYPE_HUES[type] || "#888") + "44"}`,
                    }}
                  >
                    {a.replace(/_/g, " ")}
                  </span>
                )
              })}
            </div>

            {/* Name */}
            <h1
              className="text-4xl font-bold tracking-tight"
              style={{ color: CLASSIFICATION_COLORS.WHITESPACE }}
            >
              {conceptName}
            </h1>

            {/* Tagline */}
            <p className="text-lg text-zinc-400">{tagline}</p>

            {/* Viability */}
            <div className="flex justify-center gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold tabular-nums text-green-400">{viability}</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Viability</div>
              </div>
            </div>

            <div className="text-[10px] text-zinc-600 animate-pulse">Assembling blueprint...</div>
          </div>
        )}

        {/* ── Phase 2: Requirements ── */}
        {phase === "requirements" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              Required Capabilities
            </h2>
            <div className="space-y-2">
              {requiredCapabilities.map((rc, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 border border-zinc-700/50 rounded-sm"
                  style={{
                    borderColor: (ATOM_TYPE_HUES[rc.sourceType] || "#888") + "33",
                  }}
                >
                  {/* Socket - empty */}
                  <div
                    className="w-8 h-8 rounded-full border-2 border-dashed flex items-center justify-center shrink-0"
                    style={{ borderColor: ATOM_TYPE_HUES[rc.sourceType] || "#888" }}
                  >
                    <span className="text-[10px] opacity-40">○</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono text-zinc-300">{rc.label}</div>
                    <div className="text-[10px] text-zinc-500">
                      from {rc.sourceAtom.replace(/_/g, " ")} ({rc.sourceType})
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-[10px] text-zinc-600 animate-pulse">Finding the right builders...</div>
          </div>
        )}

        {/* ── Phase 3: Assembling + 4: Complete ── */}
        {(phase === "assembling" || phase === "complete" || phase === "error") && (
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              {phase === "assembling" ? "Assembling Team..." : phase === "complete" ? "Team Assembled" : "Team Gap"}
            </h2>

            {/* Required capabilities with team fill */}
            <div className="space-y-2">
              {requiredCapabilities.map((rc, i) => {
                const coverer = teamMembers.find((m) =>
                  m.covers.some((c) => c.capability === rc.capabilityAtom)
                )
                const isCovered = !!coverer
                const memberIdx = coverer ? teamMembers.indexOf(coverer) : -1
                const isRevealed = memberIdx >= 0 && memberIdx < revealedCount

                return (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-3 border rounded-sm transition-all duration-500 ${
                      isCovered && isRevealed
                        ? "border-green-500/40 bg-green-950/10"
                        : isCovered && !isRevealed
                          ? "border-zinc-700/30 opacity-40"
                          : "border-red-500/30 bg-red-950/10"
                    }`}
                    style={{
                      borderColor: isCovered && isRevealed
                        ? (ATOM_TYPE_HUES[rc.sourceType] || "#888") + "66"
                        : undefined,
                    }}
                  >
                    {/* Socket - filled or empty */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${
                        isCovered && isRevealed
                          ? ""
                          : "border-2 border-dashed"
                      }`}
                      style={{
                        backgroundColor: isCovered && isRevealed
                          ? (ATOM_TYPE_HUES[rc.sourceType] || "#888") + "33"
                          : "transparent",
                        borderColor: isCovered && isRevealed
                          ? ATOM_TYPE_HUES[rc.sourceType] || "#888"
                          : "#555",
                      }}
                    >
                      {isCovered && isRevealed ? (
                        <span className="text-xs" style={{ color: ATOM_TYPE_HUES[rc.sourceType] }}>
                          ✓
                        </span>
                      ) : (
                        <span className="text-[10px] opacity-30">○</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-mono text-zinc-300">{rc.label}</div>
                      <div className="text-[10px] text-zinc-500">
                        {isCovered && isRevealed
                          ? `Covered by ${coverer.id.slice(0, 8)}...`
                          : isCovered && !isRevealed
                            ? "Assigned — joining..."
                            : "No proven capability found"}
                      </div>
                    </div>

                    {/* Member arrival animation */}
                    {isCovered && isRevealed && (
                      <div className="animate-in fade-in slide-in-from-right-4 duration-500 text-right">
                        <div className="text-[10px] font-mono text-green-400">
                          {coverer.id.slice(0, 8)}
                        </div>
                        <div className="text-[9px] text-zinc-500">
                          RI: {(coverer.viability * 100).toFixed(0)}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Uncovered capabilities */}
            {uncovered.length > 0 && phase === "complete" && (
              <div className="p-3 border border-yellow-500/30 bg-yellow-950/10 rounded-sm">
                <div className="text-xs text-yellow-400 font-bold mb-1">
                  {uncovered.length} capability gap{uncovered.length > 1 ? "s" : ""}
                </div>
                <div className="text-[10px] text-yellow-500/70">
                  No proven {uncovered.map((u) => u.capabilityAtom.replace(/_/g, " ")).join(", ")} capability found.
                  The genome has a gap. This is honest — no fabricated team members.
                </div>
              </div>
            )}

            {/* Error state */}
            {phase === "error" && (
              <div className="p-3 border border-red-800/50 bg-red-950/10 rounded-sm">
                <div className="text-xs text-red-400">Team assembly unavailable</div>
                <div className="text-[10px] text-red-500/70">
                  The Genome Engine could not assemble a team. Ensure the service is running on port 8000.
                </div>
              </div>
            )}

            {/* Action */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs border border-zinc-700 text-zinc-400 hover:text-white rounded-sm transition-colors"
              >
                ← Back to Graph
              </button>

              {phase === "complete" && teamResponse?.feasible && (
                <button
                  onClick={handleNotify}
                  disabled={notifying}
                  className="px-4 py-2 text-xs font-bold rounded-sm transition-all"
                  style={{
                    backgroundColor: CLASSIFICATION_COLORS.WHITESPACE,
                    color: "#052e16",
                    opacity: notifying ? 0.5 : 1,
                  }}
                >
                  {notifying ? "Notifying..." : "⚡ Notify Proposed Team"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
