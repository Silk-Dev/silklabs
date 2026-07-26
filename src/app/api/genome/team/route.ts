import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export const runtime = "nodejs"
export const maxDuration = 60

// ─── Clingo init ───

let clingoWasm: any = null
async function getClingo() {
  if (!clingoWasm) {
    clingoWasm = await import("clingo-wasm")
  }
  return clingoWasm.default || clingoWasm
}

let teamAssemblyLp: string | null = null
function getTeamAssemblyLp(): string {
  if (teamAssemblyLp) return teamAssemblyLp
  const lpPath = path.resolve(process.cwd(), "graph/team_assembly.lp")
  teamAssemblyLp = fs.readFileSync(lpPath, "utf-8")
  return teamAssemblyLp
}

// ─── Pre-filter: top-K humans per required capability ───

const TOP_K = 3

function prefilterCandidates(
  requiredAtoms: string[],
  availableHumans: { id: string; proven_capabilities: string[]; viability: number }[],
): { id: string; proven_capabilities: string[]; viability: number }[] {
  if (!availableHumans || availableHumans.length === 0) return []

  // For each required atom, score each human by presence + viability weight
  const selected = new Set<string>()

  for (const req of requiredAtoms) {
    const scored = availableHumans
      .filter((h) => h.proven_capabilities?.includes(req))
      .map((h) => ({ id: h.id, weight: h.viability || 0 }))
      .sort((a, b) => {
        // Stable sort: weight descending, then id ascending (deterministic)
        if (b.weight !== a.weight) return b.weight - a.weight
        return a.id.localeCompare(b.id)
      })
      .slice(0, TOP_K)

    for (const s of scored) selected.add(s.id)
  }

  // Also include humans with conflicts referenced by selected
  for (const h of availableHumans) {
    if (selected.has(h.id)) continue
    // If selected includes anyone this human conflicts with, include both
    // (conflict resolution is clingo's job)
  }

  return availableHumans.filter((h) => selected.has(h.id))
}

// ─── Deterministic greedy fallback ───

function greedyTeam(
  requiredAtoms: string[],
  availableHumans: { id: string; proven_capabilities: string[]; viability: number }[],
  maxTeamSize: number,
): { team: string[]; coverage: { human: string; capability: string }[] } {
  const uncovered = new Set(requiredAtoms)
  const team: string[] = []
  const coverage: { human: string; capability: string }[] = []
  const used = new Set<string>()

  // Pre-index humans by capability for fast lookup
  const byCap = new Map<string, { id: string; viability: number }[]>()
  for (const h of availableHumans) {
    for (const cap of h.proven_capabilities || []) {
      if (!byCap.has(cap)) byCap.set(cap, [])
      byCap.get(cap)!.push({ id: h.id, viability: h.viability || 0 })
    }
  }

  while (uncovered.size > 0 && team.length < maxTeamSize) {
    let bestHuman: string | null = null
    let bestCovered = 0
    let bestViability = -1

    for (const h of availableHumans) {
      if (used.has(h.id)) continue
      const hCovers = (h.proven_capabilities || []).filter((c) => uncovered.has(c))
      if (hCovers.length === 0) continue

      // Deterministic scoring: most uncovered covered, then highest viability, then id
      const isBetter =
        hCovers.length > bestCovered ||
        (hCovers.length === bestCovered && (h.viability || 0) > bestViability) ||
        (hCovers.length === bestCovered && (h.viability || 0) === bestViability && h.id < (bestHuman || ""))

      if (isBetter) {
        bestHuman = h.id
        bestCovered = hCovers.length
        bestViability = h.viability || 0
      }
    }

    if (!bestHuman) break // No one can cover remaining atoms

    const human = availableHumans.find((h) => h.id === bestHuman)!
    team.push(bestHuman)
    used.add(bestHuman)

    for (const cap of human.proven_capabilities || []) {
      if (uncovered.has(cap)) {
        uncovered.delete(cap)
        coverage.push({ human: bestHuman, capability: cap })
      }
    }
  }

  return { team, coverage }
}

// ─── API handler ───

export async function POST(req: NextRequest) {
  try {
    const { required_atoms, available_humans, hard_conflicts, max_team_size } = await req.json()

    if (!required_atoms || required_atoms.length === 0) {
      return NextResponse.json({ error: "required_atoms required" }, { status: 400 })
    }

    // Pre-filter candidates to bound search space
    const filteredHumans = prefilterCandidates(required_atoms, available_humans || [])

    // Build facts
    const facts: string[] = []
    for (const atom of required_atoms) facts.push(`required("${atom}").`)
    for (const h of filteredHumans) {
      facts.push(`human("${h.id}").`)
      for (const cap of h.proven_capabilities || []) facts.push(`proven("${h.id}", "${cap}").`)
      if (h.viability !== undefined) facts.push(`team_viability("${h.id}", ${Math.round(h.viability)}).`)
    }
    if (hard_conflicts && hard_conflicts.length > 0) {
      for (const [a, b] of hard_conflicts) facts.push(`hard_conflict("${a}", "${b}").`)
    }
    facts.push(`max_team(${max_team_size || 4}).`)

    const program = facts.join("\n") + "\n" + getTeamAssemblyLp()

    // Run clingo with 500ms timeout
    let clingo
    try {
      clingo = await getClingo()
    } catch (wasmErr: any) {
      console.error("clingo-wasm instantiation failed:", wasmErr)
      return NextResponse.json(
        {
          error: "Genome Engine solver unavailable",
          detail: "clingo-wasm failed to instantiate. Team assembly requires Node.js with WASM.",
          feasible: false,
          optimal_team: [],
          capability_coverage: [],
          missing_capabilities: required_atoms,
        },
        { status: 503 },
      )
    }

    let result: any
    try {
      result = await Promise.race([
        clingo.run(program, 0),
        new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error("clingo timeout")), 500),
        ),
      ])
    } catch (solveErr: any) {
      // Fall back to greedy
      console.warn("clingo solve failed or timed out; using greedy fallback:", solveErr.message)
      const greedy = greedyTeam(required_atoms, filteredHumans, max_team_size || 4)
      const covered = new Set(greedy.coverage.map((c) => c.capability))
      const missing = required_atoms.filter((a: string) => !covered.has(a))
      const totalViability = greedy.team.reduce((sum, id) => {
        const h = filteredHumans.find((f) => f.id === id)
        return sum + (h?.viability || 0)
      }, 0)

      return NextResponse.json({
        feasible: missing.length === 0,
        optimal_team: greedy.team,
        capability_coverage: greedy.coverage,
        total_viability: Math.round(totalViability * 100) / 100,
        missing_capabilities: missing,
        note: "Team assembled via greedy fallback (clingo timed out). Deterministic, no randomness.",
      })
    }

    if (result.Result === "ERROR") {
      // Fall back to greedy
      console.warn("clingo solver error; using greedy fallback:", result.Error)
      const greedy = greedyTeam(required_atoms, filteredHumans, max_team_size || 4)
      const covered = new Set(greedy.coverage.map((c) => c.capability))
      const missing = required_atoms.filter((a: string) => !covered.has(a))
      const totalViability = greedy.team.reduce((sum, id) => {
        const h = filteredHumans.find((f) => f.id === id)
        return sum + (h?.viability || 0)
      }, 0)

      return NextResponse.json({
        feasible: missing.length === 0,
        optimal_team: greedy.team,
        capability_coverage: greedy.coverage,
        total_viability: Math.round(totalViability * 100) / 100,
        missing_capabilities: missing,
        note: "Team assembled via greedy fallback (clingo error). Deterministic, no randomness.",
      })
    }

    // Parse optimal model
    const witnesses = result.Call?.[0]?.Witnesses || []
    if (witnesses.length === 0) {
      const greedy = greedyTeam(required_atoms, filteredHumans, max_team_size || 4)
      // ... same greedy fallback
      const covered = new Set(greedy.coverage.map((c) => c.capability))
      const missing = required_atoms.filter((a: string) => !covered.has(a))
      const totalViability = greedy.team.reduce((sum, id) => {
        const h = filteredHumans.find((f) => f.id === id)
        return sum + (h?.viability || 0)
      }, 0)

      return NextResponse.json({
        feasible: missing.length === 0,
        optimal_team: greedy.team,
        capability_coverage: greedy.coverage,
        total_viability: Math.round(totalViability * 100) / 100,
        missing_capabilities: missing,
        note: "Team assembled via greedy fallback (no clingo solutions). Deterministic.",
      })
    }

    // Find best witness
    let maxViability = -Infinity
    let bestWitness = witnesses[0]
    for (const w of witnesses) {
      const viaStr = w.Value.find((v: string) => v.startsWith("total_viability("))
      if (viaStr) {
        const via = parseInt(viaStr.match(/\d+/)?.[0] || "0", 10)
        if (via > maxViability) {
          maxViability = via
          bestWitness = w
        }
      }
    }

    const team: string[] = []
    const coverage: { human: string; capability: string }[] = []

    for (const atom of bestWitness.Value) {
      if (atom.startsWith("team(")) {
        const id = atom.match(/"([^"]+)"/)?.[1]
        if (id) team.push(id)
      }
      if (atom.startsWith("member_covers(")) {
        const match = atom.match(/"([^"]+)","([^"]+)"/)
        if (match) coverage.push({ human: match[1], capability: match[2] })
      }
    }

    const covered = new Set(coverage.map((c) => c.capability))
    const missing = required_atoms.filter((a: string) => !covered.has(a))

    return NextResponse.json({
      feasible: missing.length === 0,
      optimal_team: team,
      capability_coverage: coverage,
      total_viability: maxViability > 0 ? maxViability : 0,
      missing_capabilities: missing,
      note: "Team assembled via clingo-wasm (5.8.0). Optimal solution found.",
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
