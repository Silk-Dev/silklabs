/**
 * genome/gaps.ts
 *
 * Whitespace heuristic — ported from genome_service.py /gaps endpoint.
 * Finds atom-sets with density 0 (whitespace) that are viable.
 * Exact ASP enumeration is deferred.
 */

import { prisma } from "@/lib/prisma"
import { genomeHash } from "./hash"

export interface WhitespaceEntry {
  hash: string
  atoms: string[]
  viability: number
  explanation: string
}

export async function findGaps(limit = 50): Promise<{
  total_candidates: number
  whitespaces: WhitespaceEntry[]
  note: string
}> {
  // Get feasible pairs (co-occur or near depth <= 3)
  const feasibleRows = await prisma.$queryRawUnsafe<{ atom_a: string; atom_b: string }[]>(
    "SELECT DISTINCT atom_a, atom_b FROM genome_near WHERE depth <= 3"
  )
  const feasible = new Set<string>()
  for (const r of feasibleRows) {
    feasible.add(`${r.atom_a}|${r.atom_b}`)
    feasible.add(`${r.atom_b}|${r.atom_a}`)
  }

  // Get atom viability scores (based on frequency as heuristic)
  const viabilityRows = await prisma.$queryRawUnsafe<{ atom: string; cnt: bigint }[]>(
    "SELECT atom, COUNT(*) as cnt FROM genome_company_atom GROUP BY atom ORDER BY cnt DESC"
  )
  const viability: Record<string, number> = {}
  for (const r of viabilityRows) {
    viability[r.atom] = Math.min(Number(r.cnt) / 100, 100)
  }

  // Get atom types
  const typeRows = await prisma.$queryRawUnsafe<{ atom: string; atom_type: string }[]>(
    "SELECT atom, atom_type FROM genome_atom_ontology"
  )
  const atomTypes: Record<string, string> = {}
  for (const r of typeRows) atomTypes[r.atom] = r.atom_type

  // Get occupied hashes
  const occupiedRows = await prisma.$queryRawUnsafe<{ genome_hash: string }[]>(
    "SELECT genome_hash FROM genome_density"
  )
  const occupied = new Set(occupiedRows.map((r) => r.genome_hash))

  // Top atoms by viability
  const topAtoms = Object.entries(viability)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([a]) => a)

  const industryAtoms = topAtoms.filter((a) => atomTypes[a] === "industry").slice(0, 10)
  const bmAtoms = topAtoms.filter((a) => atomTypes[a] === "business_model").slice(0, 5)
  const deliveryAtoms = topAtoms.filter((a) => atomTypes[a] === "delivery").slice(0, 5)
  const techAtoms = topAtoms.filter((a) => atomTypes[a] === "technology").slice(0, 10)

  const whitespaces: WhitespaceEntry[] = []
  const seen = new Set<string>()

  // Helper to check all pairs feasible
  const allFeasible = (atoms: string[]): boolean => {
    for (let i = 0; i < atoms.length; i++) {
      for (let j = i + 1; j < atoms.length; j++) {
        if (!feasible.has(`${atoms[i]}|${atoms[j]}`)) return false
      }
    }
    return true
  }

  // Generate 2-atom whitespaces (industry + business_model)
  for (const ind of industryAtoms) {
    for (const bm of bmAtoms) {
      const pair = [ind, bm]
      if (!allFeasible(pair)) continue
      const h = genomeHash(pair)
      if (!occupied.has(h) && !seen.has(h)) {
        seen.add(h)
        whitespaces.push({
          hash: h,
          atoms: pair,
          viability: (viability[ind] || 0) + (viability[bm] || 0),
          explanation: `Empty space: ${ind} + ${bm}. No company occupies this niche.`,
        })
      }
    }
  }

  // Generate 3-atom whitespaces
  for (const ind of industryAtoms.slice(0, 5)) {
    for (const bm of bmAtoms) {
      for (const delv of [...deliveryAtoms, ...techAtoms]) {
        const trio = [ind, bm, delv]
        if (!allFeasible(trio)) continue
        const h = genomeHash(trio)
        if (!occupied.has(h) && !seen.has(h)) {
          seen.add(h)
          whitespaces.push({
            hash: h,
            atoms: trio,
            viability: trio.reduce((s, a) => s + (viability[a] || 0), 0),
            explanation: `Empty space: ${trio.join(" + ")}. Underserved combination.`,
          })
        }
      }
    }
  }

  // Sort by viability descending, deduplicate, take top N
  whitespaces.sort((a, b) => b.viability - a.viability)
  const deduped: WhitespaceEntry[] = []
  const hashSeen = new Set<string>()
  for (const w of whitespaces) {
    if (!hashSeen.has(w.hash)) {
      hashSeen.add(w.hash)
      deduped.push(w)
      if (deduped.length >= limit) break
    }
  }

  return {
    total_candidates: deduped.length,
    whitespaces: deduped,
    note: "Heuristic enumeration over top-50 atoms. Exact ASP enumeration pending.",
  }
}
