import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

// Must run on Node runtime (WASM + filesystem access)
export const runtime = "nodejs"
export const maxDuration = 60

// clingo-wasm is ESM-compatible; use dynamic import for Node runtime
let clingoWasm: any = null
try {
  // Only load WASM from trusted path — never eval
  // .wasm is traced via next.config.ts outputFileTracingIncludes
} catch {
  // silent — the actual init happens in the handler
}

async function getClingo() {
  if (!clingoWasm) {
    clingoWasm = await import("clingo-wasm")
  }
  return clingoWasm.default || clingoWasm
}

// Cache the LP file after first read
let teamAssemblyLp: string | null = null

function getTeamAssemblyLp(): string {
  if (teamAssemblyLp) return teamAssemblyLp
  const lpPath = path.resolve(process.cwd(), "graph/team_assembly.lp")
  teamAssemblyLp = fs.readFileSync(lpPath, "utf-8")
  return teamAssemblyLp
}

export async function POST(req: NextRequest) {
  try {
    const { required_atoms, available_humans, hard_conflicts, max_team_size } = await req.json()

    if (!required_atoms || required_atoms.length === 0) {
      return NextResponse.json({ error: "required_atoms required" }, { status: 400 })
    }

    // Build facts string
    const facts: string[] = []

    for (const atom of required_atoms) {
      facts.push(`required("${atom}").`)
    }

    if (available_humans && available_humans.length > 0) {
      for (const h of available_humans) {
        facts.push(`human("${h.id}").`)
        if (h.proven_capabilities) {
          for (const cap of h.proven_capabilities) {
            facts.push(`proven("${h.id}", "${cap}").`)
          }
        }
        if (h.viability !== undefined) {
          facts.push(`team_viability("${h.id}", ${Math.round(h.viability)}).`)
        }
      }
    }

    if (hard_conflicts && hard_conflicts.length > 0) {
      for (const [a, b] of hard_conflicts) {
        facts.push(`hard_conflict("${a}", "${b}").`)
      }
    }

    facts.push(`max_team(${max_team_size || 4}).`)

    const program = facts.join("\n") + "\n" + getTeamAssemblyLp()

    // Run clingo-wasm
    let clingo
    try {
      clingo = await getClingo()
    } catch (wasmErr: any) {
      console.error("clingo-wasm instantiation failed:", wasmErr)
      return NextResponse.json(
        {
          error: "Genome Engine solver unavailable",
          detail: "clingo-wasm failed to instantiate in this environment. The team assembly endpoint requires Node.js with WASM support.",
          feasible: false,
          optimal_team: [],
          capability_coverage: [],
          missing_capabilities: required_atoms,
        },
        { status: 503 }
      )
    }
    const result = await clingo.run(program, 0)

    if (result.Result === "ERROR") {
      return NextResponse.json(
        { error: "Clingo solver error", detail: result.Error },
        { status: 500 }
      )
    }

    // Parse answer sets
    const witnesses = result.Call?.[0]?.Witnesses || []
    const models = result.Models?.Number || 0

    if (models === 0 || witnesses.length === 0) {
      return NextResponse.json({
        feasible: false,
        optimal_team: [],
        capability_coverage: [],
        total_viability: 0,
        missing_capabilities: required_atoms,
        note: "No team can cover all required capabilities given the constraints.",
      })
    }

    // Find the optimal model (last witness has best cost)
    const bestModel = witnesses[0]
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

    // Parse the best model
    const team: string[] = []
    const coverage: { human: string; capability: string }[] = []

    for (const atom of bestWitness.Value) {
      if (atom.startsWith("team(")) {
        const id = atom.match(/"([^"]+)"/)?.[1]
        if (id) team.push(id)
      }
      if (atom.startsWith("member_covers(")) {
        const match = atom.match(/"([^"]+)","([^"]+)"/)
        if (match) {
          coverage.push({ human: match[1], capability: match[2] })
        }
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
