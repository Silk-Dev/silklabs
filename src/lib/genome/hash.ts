/**
 * genome/hash.ts
 *
 * Canonical genome hash — the foundation of every density lookup.
 * Must be byte-for-byte identical to the Python pipeline's:
 *   return "|".join(sorted(atoms))
 *
 * Phase 1: port the exact algorithm and verify parity.
 */

/**
 * Normalize a raw tag string to a canonical atom name.
 * Matches graph/genome_pipeline.py normalize_atom() and
 * graph/genome_service.py normalize() exactly.
 */
export function normalizeAtom(raw: string): string {
  let name = raw
    .trim()
    .toLowerCase()
    .replace(/[\s\-]+/g, "_")
    .replace(/&/g, "and")
    .replace(/\//g, "_")
  name = name.replace(/[^a-z0-9_]/g, "")
  name = name.replace(/_+/g, "_").replace(/^_|_$/g, "")
  return name
}

/**
 * Canonical genome hash: sorted atoms joined by pipe '|'.
 * Must match Python: "|".join(sorted(atoms))
 */
export function genomeHash(atoms: string[]): string {
  return [...atoms].sort().join("|")
}

/**
 * Classification based on density.
 */
export type Classification = "WHITESPACE" | "COMPETITIVE" | "RED_OCEAN"

export function classify(density: number): Classification {
  if (density === 0) return "WHITESPACE"
  if (density <= 20) return "COMPETITIVE"
  return "RED_OCEAN"
}

// ─── Landing Report Types ───

export interface NearestCompany {
  company_id: string
  jaccard_similarity: number
  matching_atoms: number
}

export interface LandingReport {
  operator: "evolve" | "regress" | "swap" | "validate"
  atom?: string
  original_genome?: string[]
  original_density?: number
  landing_hash: string
  landing_density: number
  classification: Classification
  nearest_companies: NearestCompany[]
  explanation: string
}
