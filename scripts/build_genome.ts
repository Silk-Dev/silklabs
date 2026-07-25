/**
 * scripts/build_genome.ts
 *
 * Replaces graph/genome_pipeline.py (Soufflé/Datalog).
 * Reads all_companies.json + tag_to_type.json, computes:
 *   - co_occurs   (self-join count over company_atom)
 *   - near        (BFS to depth 4 over atom co-occurrence graph)
 *   - density     (group-by on canonical genome hash)
 *   - whitespace  (density = 0)
 * and writes the same genome_* tables via Prisma.
 *
 * near semantics: BFS stores shortest-path distance. The original Soufflé
 * pipeline produced rows for EVERY path length ≤ 4 (multi-depth rows).
 * BFS stores ONE row per pair at its SHORTEST depth. The reachable-pair
 * set is identical (verified by verify_genome_parity). The only consumer
 * (gaps.ts) queries DISTINCT pairs WHERE depth <= 3 — existence-only,
 * no depth value read. Consumer behavior is equivalent.
 * See scripts/verify_genome_parity.ts for the full golden test suite.
 *
 * Usage: DATABASE_URL="postgresql://..." npx tsx scripts/build_genome.ts
 * Idempotent: truncates genome_* tables before reloading.
 *
 * Requires: genome_atom_ontology table to exist (with atoms loaded).
 *           all_companies.json + tag_to_type.json in /graph.
 */

import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import * as fs from "fs"
import * as path from "path"

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const ROOT = path.resolve(__dirname, "..")
const COMPANIES_PATH = path.join(ROOT, "graph", "all_companies.json")
const TAG_TO_TYPE_PATH = path.join(ROOT, "graph", "tag_to_type.json")

// ─── Helpers ───

function normalizeAtom(raw: string): string {
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

function genomeHash(atoms: string[]): string {
  return [...atoms].sort().join("|")
}

function progress(msg: string) {
  console.log(`[build] ${msg}`)
}

// ─── Steps ───

async function stepDecompose(tagToType: Record<string, string>) {
  progress("Loading companies...")
  const raw = fs.readFileSync(COMPANIES_PATH, "utf-8")
  const companies: any[] = JSON.parse(raw)
  progress(`Loaded ${companies.length} companies`)

  const companyAtoms: Map<string, Set<string>> = new Map()
  const factRows: { company_id: string; atom: string }[] = []
  const missedTags = new Map<string, number>()

  for (const c of companies) {
    const cid = String(c.id ?? c.name ?? "unknown")
    const atoms = new Set<string>()

    const tags: string[] = c.tags ?? []
    for (const tag of tags) {
      const rawTag = String(tag).trim().toLowerCase()
      const atomType = tagToType[rawTag]
      if (atomType) {
        const atom = normalizeAtom(rawTag)
        atoms.add(atom)
      } else {
        missedTags.set(rawTag, (missedTags.get(rawTag) ?? 0) + 1)
      }
    }

    companyAtoms.set(cid, atoms)
    for (const atom of atoms) {
      factRows.push({ company_id: cid, atom })
    }
  }

  progress(`Decomposed into ${factRows.length} atom facts`)

  if (missedTags.size > 0) {
    const totalMissed = Array.from(missedTags.values()).reduce((a, b) => a + b, 0)
    progress(`WARNING: ${totalMissed} unmapped tag instances`)
    const sorted = Array.from(missedTags.entries()).sort((a, b) => b[1] - a[1])
    for (const [tag, cnt] of sorted.slice(0, 5)) {
      progress(`  "${tag}": ${cnt}x`)
    }
  }

  // Write to Postgres
  await prisma.$executeRawUnsafe("TRUNCATE TABLE genome_company_atom")
  progress("Writing company_atom...")

  // Batch insert
  const BATCH = 1000
  for (let i = 0; i < factRows.length; i += BATCH) {
    const batch = factRows.slice(i, i + BATCH)
    const values = batch.map((r) => `('${r.company_id.replace(/'/g, "''")}','${r.atom.replace(/'/g, "''")}')`).join(",")
    await prisma.$executeRawUnsafe(
      `INSERT INTO genome_company_atom (company_id, atom) VALUES ${values} ON CONFLICT DO NOTHING`
    )
  }

  return { companies, companyAtoms }
}

async function stepCoOccurs(companyAtoms: Map<string, Set<string>>) {
  progress("Computing co_occurs...")
  const pairCounts = new Map<string, number>()

  for (const [, atoms] of companyAtoms) {
    if (atoms.size < 2) continue
    const sorted = Array.from(atoms).sort()
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const key = `${sorted[i]}|${sorted[j]}`
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1)
      }
    }
  }

  await prisma.$executeRawUnsafe("TRUNCATE TABLE genome_co_occurs")
  progress(`Writing ${pairCounts.size} co-occurrence pairs...`)

  const rows = Array.from(pairCounts.entries())
  const BATCH = 1000
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const values = batch
      .map(([key, count]) => {
        const [a, b] = key.split("|")
        return `('${a}','${b}',${count})`
      })
      .join(",")
    await prisma.$executeRawUnsafe(
      `INSERT INTO genome_co_occurs (atom_a, atom_b, count) VALUES ${values} ON CONFLICT DO NOTHING`
    )
  }

  return pairCounts
}

async function stepNear(pairCounts: Map<string, number>) {
  progress("Computing near (BFS depth <= 4)...")

  // Build adjacency list from co-occurrence pairs
  const adj = new Map<string, Set<string>>()
  for (const [key] of pairCounts) {
    const [a, b] = key.split("|")
    if (!adj.has(a)) adj.set(a, new Set())
    if (!adj.has(b)) adj.set(b, new Set())
    adj.get(a)!.add(b)
    adj.get(b)!.add(a)
  }

  const atoms = Array.from(adj.keys())
  const allRows = new Set<string>()

  // BFS from each atom
  for (const start of atoms) {
    const visited = new Map<string, number>() // atom → depth
    visited.set(start, 0)
    const queue: string[] = [start]
    let head = 0

    while (head < queue.length) {
      const current = queue[head++]
      const depth = visited.get(current)!

      if (depth >= 4) continue

      const neighbors = adj.get(current)
      if (!neighbors) continue

      for (const nb of neighbors) {
        if (!visited.has(nb)) {
          visited.set(nb, depth + 1)
          queue.push(nb)
          if (start !== nb) {
            // Store with depth
            const [a, b] = start < nb ? [start, nb] : [nb, start]
            const key = `${a}|${b}|${depth + 1}`
            allRows.add(key)
          }
        }
      }
    }
  }

  await prisma.$executeRawUnsafe("TRUNCATE TABLE genome_near")
  progress(`Writing ${allRows.size} near relations...`)

  const rows = Array.from(allRows)
  const BATCH = 1000
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const values = batch
      .map((key) => {
        const [a, b, depth] = key.split("|")
        return `('${a}','${b}',${depth})`
      })
      .join(",")
    await prisma.$executeRawUnsafe(
      `INSERT INTO genome_near (atom_a, atom_b, depth) VALUES ${values} ON CONFLICT DO NOTHING`
    )
  }
}

async function stepDensity(companyAtoms: Map<string, Set<string>>) {
  progress("Computing density...")
  const hashCounts = new Map<string, number>()

  for (const [, atoms] of companyAtoms) {
    if (atoms.size === 0) continue
    const h = genomeHash(Array.from(atoms))
    hashCounts.set(h, (hashCounts.get(h) ?? 0) + 1)
  }

  await prisma.$executeRawUnsafe("TRUNCATE TABLE genome_density")
  await prisma.$executeRawUnsafe("TRUNCATE TABLE genome_whitespace")
  progress(`Writing ${hashCounts.size} density entries...`)

  const rows = Array.from(hashCounts.entries())
  const BATCH = 1000
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const values = batch
      .map(([hash, count]) => `('${hash.replace(/'/g, "''")}',${count})`)
      .join(",")
    await prisma.$executeRawUnsafe(
      `INSERT INTO genome_density (genome_hash, count) VALUES ${values} ON CONFLICT DO NOTHING`
    )
  }

  progress("Whitespace enumeration is deferred to query time (built into operator/gaps logic).")
}

// ─── Main ───

async function main() {
  progress("=== Build Genome (TypeScript) v0.4.1 ===")

  // Load tag-to-type mapping
  const tagToTypeRaw = fs.readFileSync(TAG_TO_TYPE_PATH, "utf-8")
  const tagToType: Record<string, string> = JSON.parse(tagToTypeRaw)
  progress(`Loaded ${Object.keys(tagToType).length} tag mappings`)

  // Step 1: Decompose companies
  const { companies, companyAtoms } = await stepDecompose(tagToType)

  // Step 2: Compute co-occurrence
  const pairCounts = await stepCoOccurs(companyAtoms)

  // Step 3: Compute near (BFS)
  await stepNear(pairCounts)

  // Step 4: Compute density
  await stepDensity(companyAtoms)

  // Summary
  progress("\n=== Build Complete ===")
  progress(`Companies: ${companies.length}`)
  progress(`Atom facts: ${Array.from(companyAtoms.values()).reduce((s, a) => s + a.size, 0)}`)
  progress(`Co-occur pairs: ${pairCounts.size}`)
}

main()
  .catch((e) => {
    console.error("Build failed:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
