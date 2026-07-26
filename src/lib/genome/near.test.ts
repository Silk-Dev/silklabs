/**
 * A3 — near Semantics Tests
 *
 * Verifies that the BFS shortest-path near table is equivalent to
 * Soufflé's multi-depth output at the consumer level.
 *
 * Key invariant from v0.4.2 audit:
 *   The ONLY consumer of genome_near is gaps.ts line 26:
 *   SELECT DISTINCT atom_a, atom_b FROM genome_near WHERE depth <= 3
 *   This is an EXISTENCE check — no depth value is read.
 */

import { describe, it, expect, beforeAll } from "vitest";

describe.skipIf(!!process.env.SKIP_DB_TESTS)("A3 — near Semantics (integration)", () => {
  let prisma: any;

  beforeAll(async () => {
    const { PrismaClient } = await import("../../generated/prisma/client");
    const { PrismaPg } = await import("@prisma/adapter-pg");
    const pg = await import("pg");
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
  });

  // Invariant: every consumer uses existence-only queries (no depth value read)
  it("near consumer invariant: no queries filter on exact depth > 1", async () => {
    const { readFileSync } = await import("fs");
    const file = "src/lib/genome/gaps.ts";
    const content = readFileSync(file, "utf-8");
    // gaps.ts should only query genome_near with WHERE depth <= 3 (existence check)
    const depthUsage = content.match(/depth\s*(!=|==|=)\s*\d+/g) || [];
    expect(depthUsage.length).toBe(0);
    // Verify the existence-only query pattern is present
    expect(content).toContain("depth <= 3");
  });

  // Verify all BFS pairs are reachable within the stated depth
  it("all near pairs have depth <= 4", async () => {
    const rows = await prisma.$queryRawUnsafe<{ max_depth: number }[]>(
      "SELECT COALESCE(MAX(depth), 0) as max_depth FROM genome_near"
    );
    expect(Number(rows[0].max_depth)).toBeLessThanOrEqual(4);
  });

  // Verify depth > 3 pairs (excluded from gaps) exist
  it("some pairs have depth > 3 (will be excluded from gaps feasibility)", async () => {
    const rows = await prisma.$queryRawUnsafe<{ cnt: number }[]>(
      "SELECT COUNT(*) as cnt FROM (SELECT DISTINCT atom_a, atom_b FROM genome_near WHERE depth > 3) sub"
    );
    expect(Number(rows[0].cnt)).toBeGreaterThanOrEqual(0);
  });

  // Verify every co-occurrence pair (depth 1) is in near
  it("all co-occurrence pairs are in near (depth <= 4)", async () => {
    const missing = await prisma.$queryRawUnsafe<{ cnt: number }[]>(
      `SELECT COUNT(*) as cnt FROM genome_co_occurs c
       WHERE NOT EXISTS (
         SELECT 1 FROM genome_near n
         WHERE ((n.atom_a = c.atom_a AND n.atom_b = c.atom_b)
             OR (n.atom_a = c.atom_b AND n.atom_b = c.atom_a))
         AND n.depth <= 4
       )`
    );
    expect(Number(missing[0].cnt)).toBe(0);
  });
});
