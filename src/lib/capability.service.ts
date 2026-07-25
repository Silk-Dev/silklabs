/**
 * capability.service.ts
 *
 * Builds a weighted capability profile for a user by fusing three sources
 * (in descending order of trust):
 *   1. ProofOfWork.tags — weighted by confidenceScore (PROVEN)
 *   2. twinProfile.skills — claimed, medium weight
 *   3. preferences.desiredSkills — aspiration, low weight
 *
 * Each token is mapped to the genome_atom_ontology vocabulary so that
 * capability atoms are domain-agnostic and can be consumed by the Clingo
 * team assembler (/team).
 *
 * Trust weights (why these values):
 *   PROVEN  = 1.0  — backed by an ingested proof (URL/text)
 *   CLAIMED = 0.5  — self-reported in onboarding
 *   ASPIRED  = 0.2 — desired skill for future growth
 */

import { prisma } from "@/lib/prisma"

export interface CapabilityEntry {
  atom: string
  atomType: string
  weight: number
  source: "proven" | "claimed" | "aspired"
  evidence?: string  // snippet from the proof that earned this capability
}

export interface CapabilityProfile {
  userId: string
  capabilities: CapabilityEntry[]
  /** Aggregate map: atom → total weight */
  weights: Record<string, number>
}

// ─── Atom vocabulary (cached after first load) ───

let _atomOntology: Record<string, string> | null = null

async function getAtomOntology(): Promise<Record<string, string>> {
  if (_atomOntology) return _atomOntology
  const rows = await prisma.$queryRawUnsafe<{ atom: string; atom_type: string }[]>(
    "SELECT atom, atom_type FROM genome_atom_ontology"
  )
  const map: Record<string, string> = {}
  for (const r of rows) map[r.atom] = r.atom_type
  _atomOntology = map
  return map
}

// ─── Lookup helpers ───

/**
 * Try to match a raw token to a known atom in the ontology.
 * Normalizes: lowercase, replace spaces/special chars with underscores.
 */
function matchAtom(token: string, ontology: Record<string, string>): string | null {
  const key = token
    .trim()
    .toLowerCase()
    .replace(/[\s\-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
  if (ontology[key]) return key
  // Fuzzy fallback: check if any atom name contains this token
  for (const atom of Object.keys(ontology)) {
    if (atom.includes(key) || key.includes(atom)) return atom
  }
  return null
}

// ─── Source extractors ───

async function extractProvenCapabilities(
  userId: string,
  ontology: Record<string, string>
): Promise<CapabilityEntry[]> {
  const proofs = await prisma.proofOfWork.findMany({
    where: { ownerType: "USER", ownerId: userId },
    select: { tags: true, confidenceScore: true, title: true, extractedText: true },
  })

  const entries: CapabilityEntry[] = []
  const seen = new Set<string>()

  for (const p of proofs) {
    const tags: string[] = (p.tags as any) || []
    for (const tag of tags) {
      const atom = matchAtom(tag, ontology)
      if (atom && !seen.has(atom)) {
        seen.add(atom)
        entries.push({
          atom,
          atomType: ontology[atom],
          weight: p.confidenceScore, // 0.0–1.0 from ingestion
          source: "proven",
          evidence: p.title || p.extractedText?.slice(0, 120) || undefined,
        })
      }
    }
  }
  return entries
}

async function extractClaimedCapabilities(
  userId: string,
  ontology: Record<string, string>
): Promise<CapabilityEntry[]> {
  // twinProfile.skills is a JSON array of strings
  const twin = await prisma.twinVector.findUnique({
    where: { ownerType_ownerId: { ownerType: "USER", ownerId: userId } },
    select: { twinProfile: true },
  })
  if (!twin) return []

  const profile = twin.twinProfile as any
  const skills: string[] = profile?.skills || []
  const entries: CapabilityEntry[] = []

  for (const skill of skills) {
    const atom = matchAtom(skill, ontology)
    if (atom) {
      entries.push({
        atom,
        atomType: ontology[atom],
        weight: 0.5,
        source: "claimed",
      })
    }
  }
  return entries
}

async function extractAspiredCapabilities(
  userId: string,
  ontology: Record<string, string>
): Promise<CapabilityEntry[]> {
  const twin = await prisma.twinVector.findUnique({
    where: { ownerType_ownerId: { ownerType: "USER", ownerId: userId } },
    select: { preferences: true },
  })
  if (!twin) return []

  const prefs = twin.preferences as any
  const desired: string[] = prefs?.desiredSkills || []
  const entries: CapabilityEntry[] = []

  for (const d of desired) {
    const atom = matchAtom(d, ontology)
    if (atom) {
      entries.push({
        atom,
        atomType: ontology[atom],
        weight: 0.2,
        source: "aspired",
      })
    }
  }
  return entries
}

// ─── Public API ───

/**
 * Build a capability profile for a user by fusing three data sources.
 * Returns deduplicated capabilities with the highest weight per atom.
 */
export async function getCapabilityProfile(userId: string): Promise<CapabilityProfile> {
  const ontology = await getAtomOntology()

  const [proven, claimed, aspired] = await Promise.all([
    extractProvenCapabilities(userId, ontology),
    extractClaimedCapabilities(userId, ontology),
    extractAspiredCapabilities(userId, ontology),
  ])

  const all = [...proven, ...claimed, ...aspired]

  // Deduplicate by atom: keep the highest weight
  const best = new Map<string, CapabilityEntry>()
  for (const entry of all) {
    const existing = best.get(entry.atom)
    if (!existing || entry.weight > existing.weight) {
      best.set(entry.atom, entry)
    }
  }

  const capabilities = Array.from(best.values())
  const weights: Record<string, number> = {}
  for (const c of capabilities) weights[c.atom] = c.weight

  return { userId, capabilities, weights }
}

/**
 * Get the capability profile formatted for Clingo team_assembly.lp input.
 * Returns the proven(H, A) facts as a JSON-serializable structure.
 */
export async function getClingoTeamInput(
  userIds: string[]
): Promise<{ human: string; proven_capabilities: string[]; viability: number }[]> {
  const results: { human: string; proven_capabilities: string[]; viability: number }[] = []

  for (const uid of userIds) {
    const profile = await getCapabilityProfile(uid)
    // Only include atoms with weight >= 0.5 (proven or strongly claimed)
    const proven = profile.capabilities
      .filter((c) => c.weight >= 0.5)
      .map((c) => c.atom)

    // Average weight as viability proxy
    const avgWeight =
      profile.capabilities.length > 0
        ? profile.capabilities.reduce((s, c) => s + c.weight, 0) /
          profile.capabilities.length
        : 0

    results.push({
      human: uid,
      proven_capabilities: proven,
      viability: Math.round(avgWeight * 100),
    })
  }

  return results
}
