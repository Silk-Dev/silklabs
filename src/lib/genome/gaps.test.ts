/**
 * Genome Gaps Unit Tests (DB-free)
 *
 * Covers findGaps' pure decision logic without live Postgres:
 *   - feasibility filtering (co-occurrence / near-depth pairs)
 *   - viability scoring with the min(cnt/100, 100) cap
 *   - occupied-hash exclusion
 *   - sort-by-viability-descending and limit truncation
 *   - dedup invariant (no duplicate hashes ever returned)
 *
 * The prisma client is mocked at module level; the stub dispatches on the SQL
 * text and THROWS on unrecognized queries (fail-closed) so schema drift in
 * gaps.ts surfaces as a test failure instead of silent empty results.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRawUnsafe: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import { findGaps } from "./gaps";
import { genomeHash } from "./hash";

const queryRawUnsafe = prisma.$queryRawUnsafe as unknown as Mock;

interface StubDb {
  near?: { atom_a: string; atom_b: string }[];
  counts?: { atom: string; cnt: number }[];
  types?: { atom: string; atom_type: string }[];
  occupied?: { genome_hash: string }[];
}

function stubDb({ near = [], counts = [], types = [], occupied = [] }: StubDb) {
  queryRawUnsafe.mockImplementation(async (sql: string) => {
    if (sql.includes("FROM genome_near")) return near;
    if (sql.includes("FROM genome_company_atom")) return counts;
    if (sql.includes("FROM genome_atom_ontology")) return types;
    if (sql.includes("FROM genome_density")) return occupied;
    throw new Error(`Unexpected SQL in test stub: ${sql}`);
  });
}

// Canonical fixture atoms
const IND_A = "healthcare";
const IND_B = "fintech";
const BM = "b2c";
const DELV = "on_demand";
const TECH = "ai";

function baseTypes(): NonNullable<StubDb["types"]> {
  return [
    { atom: IND_A, atom_type: "industry" },
    { atom: IND_B, atom_type: "industry" },
    { atom: BM, atom_type: "business_model" },
    { atom: DELV, atom_type: "delivery" },
    { atom: TECH, atom_type: "technology" },
  ];
}

beforeEach(() => {
  queryRawUnsafe.mockReset();
});

describe("findGaps (heuristic enumeration)", () => {
  it("keeps feasible pairs and drops atoms with no co-occurrence/near edges", async () => {
    stubDb({
      // Only healthcare↔b2c is feasible; fintech is intentionally unconnected
      near: [{ atom_a: IND_A, atom_b: BM }],
      counts: [
        { atom: IND_A, cnt: 20000 }, // viability capped at 100
        { atom: IND_B, cnt: 3000 }, // viability 30 — but infeasible
        { atom: BM, cnt: 50 }, // viability 0.5
      ],
      types: baseTypes(),
      occupied: [],
    });

    const res = await findGaps();

    const atomsList = res.whitespaces.map((w) => w.atoms);
    expect(atomsList).toContainEqual([IND_A, BM]);
    for (const w of res.whitespaces) {
      expect(w.atoms).not.toContain(IND_B);
    }
    expect(res.total_candidates).toBe(res.whitespaces.length);
  });

  it("applies the min(cnt/100, 100) viability cap and sums atom scores", async () => {
    stubDb({
      near: [{ atom_a: IND_A, atom_b: BM }],
      counts: [
        { atom: IND_A, cnt: 20000 }, // min(200, 100) → capped at 100
        { atom: BM, cnt: 50 }, // 0.5
      ],
      types: baseTypes(),
      occupied: [],
    });

    const res = await findGaps();

    expect(res.whitespaces).toHaveLength(1);
    expect(res.whitespaces[0].atoms).toEqual([IND_A, BM]);
    expect(res.whitespaces[0].viability).toBeCloseTo(100.5, 10);
  });

  it("excludes genomes whose hash already exists in genome_density", async () => {
    stubDb({
      near: [{ atom_a: IND_A, atom_b: BM }],
      counts: [
        { atom: IND_A, cnt: 100 },
        { atom: BM, cnt: 100 },
      ],
      types: baseTypes(),
      // The only feasible pair's landing coordinate is already occupied
      occupied: [{ genome_hash: genomeHash([IND_A, BM]) }],
    });

    const res = await findGaps();

    expect(res.whitespaces).toHaveLength(0);
  });

  it("sorts by viability descending and truncates at the requested limit", async () => {
    const inds = ["alpha", "beta", "gamma", "delta"];
    const counts = [
      { atom: "alpha", cnt: 400 }, // viability 4
      { atom: "beta", cnt: 300 }, // 3
      { atom: "gamma", cnt: 200 }, // 2
      { atom: "delta", cnt: 100 }, // 1
      { atom: BM, cnt: 50 }, // 0.5
    ];
    stubDb({
      near: inds.map((a) => ({ atom_a: a, atom_b: BM })),
      counts,
      types: [...inds.map((a) => ({ atom: a, atom_type: "industry" })), { atom: BM, atom_type: "business_model" }],
      occupied: [],
    });

    const res = await findGaps(2);

    expect(res.whitespaces).toHaveLength(2);
    // Top two by combined viability: alpha+BM (4.5), beta+BM (3.5)
    expect(res.whitespaces[0].atoms).toEqual(["alpha", BM]);
    expect(res.whitespaces[0].viability).toBeCloseTo(4.5, 10);
    expect(res.whitespaces[1].atoms).toEqual(["beta", BM]);
    expect(res.whitespaces[1].viability).toBeCloseTo(3.5, 10);
  });

  it("never returns duplicate hashes (dedup invariant)", async () => {
    stubDb({
      near: [
        { atom_a: IND_A, atom_b: BM },
        // Reverse direction row: feasibility must be symmetric
        { atom_a: DELV, atom_b: BM },
      ],
      counts: [
        { atom: IND_A, cnt: 15000 },
        { atom: BM, cnt: 900 },
        { atom: DELV, cnt: 700 },
        { atom: TECH, cnt: 25000 },
      ],
      // Ontology lists an atom twice with conflicting types: last write wins,
      // so TECH must land in exactly one bucket (no phantom duplicates).
      types: [...baseTypes(), { atom: TECH, atom_type: "delivery" }],
      occupied: [],
    });

    const res = await findGaps();

    const hashes = res.whitespaces.map((w) => w.hash);
    expect(new Set(hashes).size).toBe(hashes.length);
    // Every reported hash must be derivable from its own atom set
    for (const w of res.whitespaces) {
      expect(w.hash).toBe(genomeHash(w.atoms));
    }
  });

  it("treats feasibility as symmetric regardless of stored direction", async () => {
    stubDb({
      // Stored only as business_model|industry (reverse of generation order)
      near: [{ atom_a: BM, atom_b: IND_A }],
      counts: [
        { atom: IND_A, cnt: 500 },
        { atom: BM, cnt: 500 },
      ],
      types: baseTypes(),
      occupied: [],
    });

    const res = await findGaps();

    expect(res.whitespaces.map((w) => w.atoms)).toContainEqual([IND_A, BM]);
  });
});
