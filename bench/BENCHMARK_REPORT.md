# BENCHMARK_REPORT.md — Genome Engine Benchmarks

**Provenance**
```
Artifacts at commit: 5c82170b9c72210214e8cd7cc93d6fb8cdb18a90  (substantive work)
Tag v0.4.3:          7dc85c3e93d328150da42c504a6f081cd9a2f51a  (artifacts-only: git diff 5c82170 7dc85c3 --stat → bench/v0.4.3/* only)
Timestamp:   2026-07-26T11:00:36.015Z
Command:     npm run bench
Node:        v25.2.1
Platform:    linux/x64
CPU:         Intel(R) Core(TM) i7-8565U CPU @ 1.80GHz
RAM:         31.2 GB
Warm iterations:  20 per benchmark
Cold iterations:  1 per grid cell (fresh process via bench/cold_cell.ts)
```

## Methodology

- **Warm**: After first solve in a single process, reported as p50/p95 across 20 iterations.
- **Cold**: First solve in a FRESH PROCESS per grid cell (`npx tsx bench/cold_cell.ts <atoms> <humans>`).
  Each invocation loads clingo-wasm from scratch — WASM init is paid exactly once per cell.
- **p50**: Median latency (50th percentile).
- **p95**: 95th percentile latency.
- **Pre-filtering**: All clingo benchmarks apply TOP-K=3 pre-filtering (same as team/route.ts).
  For each required atom, only the top 3 humans by capability weight are kept. This bounds
  the solver's search space and fixed the pathological 2a×20h case (2382ms → 2.6ms).
- **Greedy fallback**: If clingo times out (>500ms), a deterministic greedy set-cover runs.
  Not triggered in these benchmarks (all cells solved within 5ms).
- **B2/B4**: Measured via direct Postgres queries (psycopg2), 50 iterations per query.
  This is what the operator functions do internally (density lookup, nearest neighbors, etc.).

## Results

### B1 — Clingo-WASM Team Solve

All cells under 5ms p95 warm. Cold dominated by WASM init (~60ms overhead).

| Required Atoms | Candidate Humans | Filtered | p50 (ms) | p95 (ms) | Min (ms) | Max (ms) | Cold (ms) |
|---|---|---|---|---|---|---|---|
| 2 | 5 | 3 | 3.74 | 4.71 | 2.45 | 4.77 | 62.3 |
| 2 | 20 | 3 | 2.64 | 3.93 | 2.00 | 4.03 | 68.2 |
| 4 | 5 | 3 | 2.17 | 3.07 | 1.91 | 4.27 | 65.8 |
| 4 | 20 | 3 | 2.32 | 3.31 | 1.82 | 3.48 | 79.0 |
| 6 | 5 | 3 | 1.67 | 2.76 | 1.55 | 2.97 | 57.9 |
| 6 | 20 | 3 | 1.90 | 2.25 | 1.55 | 2.66 | 68.4 |

Cold cells measured via `npx tsx bench/cold_cell.ts` — fresh process per cell:
```
$ npx tsx bench/cold_cell.ts 2 5   → {"atoms":2,"humans":5,"filtered":3,"cold_ms":62.3}
$ npx tsx bench/cold_cell.ts 2 20  → {"atoms":2,"humans":20,"filtered":3,"cold_ms":68.2}
$ npx tsx bench/cold_cell.ts 4 5   → {"atoms":4,"humans":5,"filtered":3,"cold_ms":65.8}
$ npx tsx bench/cold_cell.ts 4 20  → {"atoms":4,"humans":20,"filtered":3,"cold_ms":79.0}
$ npx tsx bench/cold_cell.ts 6 5   → {"atoms":6,"humans":5,"filtered":3,"cold_ms":57.9}
$ npx tsx bench/cold_cell.ts 6 20  → {"atoms":6,"humans":20,"filtered":3,"cold_ms":68.4}
```
All ≥ warm p50 + ~60ms WASM init overhead. Consistent across cells.

### B2 — Operator Latency (against Postgres, 50 iterations)

| Operation | Query | p50 (ms) | p95 (ms) |
|---|---|---|---|
| evolve | density lookup (genome_density) | 0.09 | 0.21 |
| regress | company genome (genome_company_atom) | 0.12 | 0.19 |
| swap | ontology types (genome_atom_ontology) | 0.21 | 0.27 |
| validate | nearest neighbors (genome_company_atom, 6 atoms) | 1.12 | 1.54 |

All operators complete within **<2ms p95** against local Postgres on indexed tables.

### B3 — Build Pipeline

`scripts/build_genome.ts` on the full 36K-company dataset:
- 178,590 atom facts
- 21,462 co-occurrence pairs
- 52,650 near relations (BFS depth ≤ 4)
- 26,070 density entries
Total runtime: ~30-60s (dominated by BFS). Verifiable by running:
`DATABASE_URL=... npx tsx scripts/build_genome.ts`

### B4 — Gaps Heuristic (against Postgres, 10 iterations)

| Query | p50 (ms) | p95 (ms) |
|---|---|---|
| feasible pairs (near depth ≤ 3) | 56.1 | 78.0 |
| atom frequency (GROUP BY) | 20.5 | 26.0 |
| occupied hashes (genome_density) | 10.1 | 10.7 |

Total gaps computation: ~86ms p50 (sum of 3 queries), well under 200ms target.

### B5 — Hash Throughput

| Atoms | Ops/sec | p50 (ns) | p95 (ns) |
|---|---|---|---|
| 5 | 1,694,496 | 445 | 918 |
| 10 | 1,321,772 | 655 | 1,028 |
| 20 | 532,217 | 1,741 | 2,516 |

Hash throughput is CPU-bound and effectively instantaneous for typical genome sizes (5-20 atoms).

## Pathological Case Fix

The 2a×20h case was measured at 2382ms p50 (min 2012ms) under the original harness.
**Cause**: Under-constrained requests (2 required atoms, 20 candidates) exploded the
grounded answer-set search space in clingo.

**Fix applied to team/route.ts:**
1. Pre-filter candidates: for each required atom, keep only TOP-K=3 humans by capability weight
2. This bounds the solver to ≤ (atoms × K) unique humans, eliminating the search explosion
3. Safety net: 500ms solver timeout → deterministic greedy set-cover fallback

**Result**: 2a×20h went from 2382ms → 2.6ms p50 (99.9% reduction). All cells <5ms p95.
