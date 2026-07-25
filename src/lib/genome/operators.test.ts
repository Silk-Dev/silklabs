/**
 * A2 — Operators Integration Tests
 *
 * Falsifiable assertions against real Postgres data.
 * Skips if SKIP_DB_TESTS is set.
 *
 * The RED-OCEAN CANARY is the most important test:
 * if the hash drifts, every genome looks like whitespace,
 * and the canary catches it.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { classify } from "./hash";
import type { PrismaClient } from "@prisma/client";

// Known company IDs (from all_companies.json)
const UBER_ID = "26645";
const WAYMO_ID = "32599";

// Known dense genome — we expect density > 20 for some genomes
// If the hash drifted, everything returns density 0 → WHITESPACE
const DENSE_GENOME_HASH = "automotive|automotive_commerce|autonomous_trucking|self_driving_vehicles|unmanned_vehicle";

describe.skipIf(!!process.env.SKIP_DB_TESTS)("A2 — Operators (integration)", () => {
  let prisma: PrismaClient;

  async function queryDensity(hash: string): Promise<number> {
    const rows = await prisma.$queryRawUnsafe<{ count: number }[]>(
      "SELECT count FROM genome_density WHERE genome_hash = $1",
      hash
    );
    return rows.length > 0 ? rows[0].count : 0;
  }

  async function queryNearest(atoms: string[], limit = 5): Promise<any[]> {
    if (atoms.length === 0) return [];
    const placeholders = atoms.map((_, i) => `$${i + 1}`).join(",");
    return prisma.$queryRawUnsafe<any[]>(
      `SELECT ca.company_id, COUNT(*)::int as matching_atoms
       FROM genome_company_atom ca
       WHERE ca.atom IN (${placeholders})
       GROUP BY ca.company_id
       ORDER BY COUNT(*)::float / ((SELECT COUNT(*) FROM genome_company_atom sub WHERE sub.company_id = ca.company_id) + ${atoms.length} - COUNT(*) + 0.001) DESC
       LIMIT ${limit}`,
      ...atoms
    );
  }

  async function getCompanyGenome(companyId: string): Promise<string[]> {
    const rows = await prisma.$queryRawUnsafe<{ atom: string }[]>(
      "SELECT atom FROM genome_company_atom WHERE company_id = $1 ORDER BY atom",
      companyId
    );
    return rows.map((r) => r.atom);
  }

  beforeAll(async () => {
    const { PrismaClient } = await import("@prisma/client");
    const { PrismaPg } = await import("@prisma/adapter-pg");
    const pg = await import("pg");
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
  });

  // ── RED-OCEAN CANARY ──
  it("RED-OCEAN CANARY: known dense genome has density > 20 and classification RED_OCEAN", async () => {
    const d = await queryDensity(DENSE_GENOME_HASH);
    expect(d).toBeGreaterThan(20);
    expect(classify(d)).toBe("RED_OCEAN");
  });

  // ── Evolve tests ──
  it("evolve(uber, +healthcare) → WHITESPACE (density 0)", async () => {
    const genome = await getCompanyGenome(UBER_ID);
    expect(genome.length).toBeGreaterThan(0);
    expect(genome).not.toContain("healthcare");

    const landingHash = [...genome, "healthcare"].sort().join("|");
    const d = await queryDensity(landingHash);
    expect(d).toBe(0);
    expect(classify(d)).toBe("WHITESPACE");
  });

  it("evolve(uber, +self_driving_vehicles) → nearest references Waymo", async () => {
    const genome = await getCompanyGenome(UBER_ID);
    const landingAtoms = [...genome, "self_driving_vehicles"];
    const nearest = await queryNearest(landingAtoms);
    const waymoInNearest = nearest.some(
      (n: any) => String(n.company_id) === WAYMO_ID
    );
    expect(waymoInNearest).toBe(true);
  });

  // ── Regress tests ──
  it("regress(uber, −autonomous_trucking) → density within expected band", async () => {
    const genome = await getCompanyGenome(UBER_ID);
    expect(genome).toContain("autonomous_trucking");
    const landingHash = genome.filter((a) => a !== "autonomous_trucking").sort().join("|");
    const d = await queryDensity(landingHash);
    // Should be either 0 (whitespace) or a small positive number
    expect(d).toBeGreaterThanOrEqual(0);
    expect(d).toBeLessThan(20);
  });

  // ── Swap tests ──
  it("swap(uber, ridesharing→b2c) → REJECTED (type mismatch)", async () => {
    // ridesharing is 'industry', b2c is 'business_model' — different types
    const ontology = await prisma.$queryRawUnsafe<{ atom: string; atom_type: string }[]>(
      "SELECT atom, atom_type FROM genome_atom_ontology WHERE atom IN ('ridesharing', 'b2c')"
    );
    const types: Record<string, string> = {};
    for (const r of ontology) types[r.atom] = r.atom_type;
    expect(types.ridesharing).not.toBe(types.b2c);
  });

  // ── Validate tests ──
  it("validate(fixed set) returns classification with ≥1 nearest", async () => {
    const atoms = ["healthcare", "b2c", "app"];
    const nearest = await queryNearest(atoms);
    expect(nearest.length).toBeGreaterThanOrEqual(1);
  });

  // ── Determinism tests ──
  it("DETERMINISM: same input → same genome hash", () => {
    const { genomeHash } = require("./hash");
    const input = ["healthcare", "b2c", "on_demand"];
    const results = Array.from({ length: 10 }, () => genomeHash(input));
    for (let i = 1; i < results.length; i++) {
      expect(results[i]).toBe(results[0]);
    }
  });

  // ── Edge cases ──
  it("empty genome queries return empty nearest", async () => {
    const nearest = await queryNearest([]);
    expect(nearest).toEqual([]);
  });

  it("nonexistent company genome is empty", async () => {
    const genome = await getCompanyGenome("nonexistent_id_12345");
    expect(genome).toEqual([]);
  });
});
