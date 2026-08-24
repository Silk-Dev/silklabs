/**
 * genome/operators.ts
 *
 * Direct implementations of evolve, regress, swap, and validate
 * that query Postgres directly. No FastAPI dependency.
 *
 * These replace the :8000 proxy routes entirely.
 */

import { prisma } from "@/lib/prisma"
import { normalizeAtom, genomeHash, classify } from "./hash"
import type { LandingReport, NearestCompany } from "./hash"

// ─── Atom ontology cache ───

let _ontology: Record<string, string> | null = null

async function getOntology(): Promise<Record<string, string>> {
  if (_ontology) return _ontology
  const rows = await prisma.$queryRawUnsafe<{ atom: string; atom_type: string }[]>(
    "SELECT atom, atom_type FROM genome_atom_ontology"
  )
  _ontology = {}
  for (const r of rows) _ontology![r.atom] = r.atom_type
  return _ontology
}

// ─── Lookup helpers ───

async function lookupDensity(hash: string): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<{ count: number }[]>(
    "SELECT count FROM genome_density WHERE genome_hash = $1",
    hash
  )
  return rows.length > 0 ? rows[0].count : 0
}

async function lookupCompanyGenome(companyId: string): Promise<string[]> {
  const rows = await prisma.$queryRawUnsafe<{ atom: string }[]>(
    "SELECT atom FROM genome_company_atom WHERE company_id = $1 ORDER BY atom",
    companyId
  )
  return rows.map((r) => r.atom)
}

async function lookupNearestCompanies(
  atoms: string[],
  limit = 10
): Promise<NearestCompany[]> {
  if (atoms.length === 0) return []
  if (!Number.isInteger(limit) || limit <= 0) throw new Error(`limit must be a positive integer, got ${limit}`)

  // Build a SQL query that computes Jaccard similarity
  const placeholders = atoms.map((_, i) => `$${i + 1}`).join(",")
  const matchCount = `COUNT(*)`
  const totalCount = `(SELECT COUNT(*) FROM genome_company_atom sub WHERE sub.company_id = ca.company_id)`

  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT ca.company_id,
            ${matchCount}::int as matching_atoms,
            ${totalCount}::int as total_atoms
     FROM genome_company_atom ca
     WHERE ca.atom IN (${placeholders})
     GROUP BY ca.company_id
     ORDER BY ${matchCount}::float /
         (${totalCount} + ${atoms.length} - ${matchCount} + 0.001) DESC
     LIMIT $${atoms.length + 1}`,
    ...atoms,
    limit
  )

  return rows.map((r: any) => ({
    company_id: String(r.company_id),
    jaccard_similarity: Math.round(
      (r.matching_atoms /
        Math.max(r.total_atoms + atoms.length - r.matching_atoms, 0.001)) *
        10000
    ) / 10000,
    matching_atoms: r.matching_atoms,
  }))
}

// ─── Operators ───

export interface OperateParams {
  companyId?: string
  atom?: string
  oldAtom?: string
  newAtom?: string
  atoms?: string[]
}

export async function evolve(params: OperateParams): Promise<LandingReport> {
  const { companyId, atom } = params
  if (!companyId || !atom) throw new Error("companyId and atom required")

  const genome = await lookupCompanyGenome(companyId)
  const normalized = normalizeAtom(atom)

  if (genome.includes(normalized)) {
    throw new Error(`Atom '${normalized}' already in genome`)
  }

  const landingHash = genomeHash([...genome, normalized])
  const landingDensity = await lookupDensity(landingHash)
  const originalDensity = await lookupDensity(genomeHash(genome))
  const nearest = await lookupNearestCompanies([...genome, normalized])

  return {
    operator: "evolve",
    atom: normalized,
    original_genome: genome,
    original_density: originalDensity,
    landing_hash: landingHash,
    landing_density: landingDensity,
    classification: classify(landingDensity),
    nearest_companies: nearest.slice(0, 5),
    explanation:
      landingDensity > 0
        ? `EVOLVE ${normalized} → genome [${landingHash}] has ${landingDensity} existing companies.`
        : `EVOLVE ${normalized} → WHITESPACE. No company occupies this coordinate.`,
  }
}

export async function regress(params: OperateParams): Promise<LandingReport> {
  const { companyId, atom } = params
  if (!companyId || !atom) throw new Error("companyId and atom required")

  const genome = await lookupCompanyGenome(companyId)
  const normalized = normalizeAtom(atom)

  if (!genome.includes(normalized)) {
    throw new Error(`Atom '${normalized}' not in genome`)
  }

  const newGenome = genome.filter((a) => a !== normalized)
  const landingHash = genomeHash(newGenome)
  const landingDensity = await lookupDensity(landingHash)
  const originalDensity = await lookupDensity(genomeHash(genome))
  const nearest = await lookupNearestCompanies(newGenome)

  return {
    operator: "regress",
    atom: normalized,
    original_genome: genome,
    original_density: originalDensity,
    landing_hash: landingHash,
    landing_density: landingDensity,
    classification: classify(landingDensity),
    nearest_companies: nearest.slice(0, 5),
    explanation:
      landingDensity > 0
        ? `REGRESS ${normalized} → genome [${landingHash}] has ${landingDensity} existing companies.`
        : `REGRESS ${normalized} → WHITESPACE. No company occupies this coordinate.`,
  }
}

export async function swap(params: OperateParams): Promise<LandingReport> {
  const { companyId, oldAtom, newAtom } = params
  if (!companyId || !oldAtom || !newAtom)
    throw new Error("companyId, oldAtom, and newAtom required")

  const genome = await lookupCompanyGenome(companyId)
  const old = normalizeAtom(oldAtom)
  const newer = normalizeAtom(newAtom)

  if (!genome.includes(old)) {
    throw new Error(`Atom '${old}' not in genome`)
  }
  if (genome.includes(newer)) {
    throw new Error(`Atom '${newer}' already in genome`)
  }

  // Check same type
  const ontology = await getOntology()
  const oldType = ontology[old]
  const newType = ontology[newer]
  if (oldType !== newType) {
    throw new Error(
      `Cannot swap '${old}' (${oldType}) with '${newer}' (${newType}): different types`
    )
  }

  const newGenome = genome.filter((a) => a !== old).concat(newer)
  const landingHash = genomeHash(newGenome)
  const landingDensity = await lookupDensity(landingHash)
  const originalDensity = await lookupDensity(genomeHash(genome))
  const nearest = await lookupNearestCompanies(newGenome)

  return {
    operator: "swap",
    atom: `${old}→${newer}`,
    original_genome: genome,
    original_density: originalDensity,
    landing_hash: landingHash,
    landing_density: landingDensity,
    classification: classify(landingDensity),
    nearest_companies: nearest.slice(0, 5),
    explanation:
      landingDensity > 0
        ? `SWAP ${old}→${newer} → genome [${landingHash}] has ${landingDensity} existing companies.`
        : `SWAP ${old}→${newer} → WHITESPACE. No company occupies this coordinate.`,
  }
}

export async function validate(params: OperateParams): Promise<LandingReport> {
  const { atoms } = params
  if (!atoms || atoms.length === 0) throw new Error("atoms array required")

  const normalized = atoms.map((a) => normalizeAtom(a))
  const unique = [...new Set(normalized)].sort()

  const landingHash = genomeHash(unique)
  const landingDensity = await lookupDensity(landingHash)
  const nearest = await lookupNearestCompanies(unique)

  return {
    operator: "validate",
    original_genome: unique,
    landing_hash: landingHash,
    landing_density: landingDensity,
    classification: classify(landingDensity),
    nearest_companies: nearest.slice(0, 5),
    explanation:
      landingDensity > 0
        ? `Genome [${landingHash}] has ${landingDensity} companies.`
        : `This genome is WHITESPACE — opportunity exists!`,
  }
}
