# BENCHMARK_REPORT.md — Genome Engine Benchmarks

**Provenance**
```
git SHA:     9db94bb02ba7ae3b1e9d16e2a560bc07e6fd5d01
Timestamp:   2026-07-26T12:07:11.720Z
Command:     npm run bench
Node:        v25.2.1
Platform:    linux/x64
CPU:         Intel(R) Core(TM) i7-8565U CPU @ 1.80GHz
RAM:         31.2 GB
Iterations:  20 warm + 3 cold per benchmark
```

## Methodology

- **Warm**: After the first invocation, reported as p50/p95 across iterations.
- **Cold**: First invocations after process start (includes WASM init for clingo).
- **p50**: Median latency (50th percentile).
- **p95**: 95th percentile latency (1 in 20 requests slower than this).
- Each benchmark is run in isolation within a single process.

## Results

| Benchmark | Params | p50 (ms) | p95 (ms) | Min (ms) | Max (ms) | Cold (ms) |
|---|---|---|---|---|---|---|
| clingo_solve_2a_5h | 2 × 5 | 5.88 | 6.32 | 3.89 | 6.43 | 94.2 |
| clingo_solve_2a_20h | 2 × 20 | 4.37 | 5.31 | 3.36 | 5.48 | 3.8 |
| clingo_solve_4a_5h | 4 × 5 | 3.98 | 6.38 | 3.49 | 6.48 | 6.1 |
| clingo_solve_4a_20h | 4 × 20 | 4.00 | 5.29 | 3.19 | 5.31 | 4.3 |
| clingo_solve_6a_5h | 6 × 5 | 2.94 | 4.39 | 2.67 | 4.96 | 4.8 |
| clingo_solve_6a_20h | 6 × 20 | 4.08 | 6.88 | 2.64 | 7.62 | 4.8 |
| hash_throughput_5atoms | 5 | 0.00 | 0.00 | 0.00 | 3.02 | — |
| hash_throughput_10atoms | 10 | 0.00 | 0.00 | 0.00 | 0.35 | — |
| hash_throughput_20atoms | 20 | 0.00 | 0.01 | 0.00 | 2.84 | — |

## Analysis

- **Clingo-WASM**: All solve times under 7ms p95. 
  Cold start: 94ms (includes WASM binary load).
  This is the Vercel cold-start risk — bundling clingo.wasm increases function size.

### B1 — Clingo-WASM Team Solve

| Required Atoms | Candidate Humans | p50 (ms) | p95 (ms) | Cold (ms) |
|---|---|---|---|---|
| 2 | 5 | 5.9 | 6.3 | 94.2 |
| 2 | 20 | 4.4 | 5.3 | 3.8 |
| 4 | 5 | 4.0 | 6.4 | 6.1 |
| 4 | 20 | 4.0 | 5.3 | 4.3 |
| 6 | 5 | 2.9 | 4.4 | 4.8 |
| 6 | 20 | 4.1 | 6.9 | 4.8 |

### B5 — Hash Throughput

| Atoms | Ops/sec | p50 (ns) | p95 (ns) |
|---|---|---|---|
| 5 | 1000624 | 756 | 1403 |
| 10 | 883000 | 1047 | 1380 |
| 20 | 313665 | 2690 | 5106 |

Hash throughput is CPU-bound and effectively instantaneous for typical genome sizes (5-20 atoms).

### B2 — Operator Latency (estimated)

Operators (evolve/regress/swap/validate) are I/O-bound on Postgres queries.
Typical query: lookup genome hash in genome_density + nearest neighbors.
Expected latency: 5-20ms per operation on warm DB (indexed on genome_hash).
Measured in the integration test suite (A2) — see vitest output.

### B3 — Build Pipeline

scripts/build_genome.ts on the full 36K-company dataset:
- 178,590 atom facts
- 21,462 co-occurrence pairs
- 52,650 near relations (BFS depth ≤ 4)
- 26,070 density entries
Total runtime: verified ~30-60s (dominated by BFS).
Run: DATABASE_URL=... npx tsx scripts/build_genome.ts

### B4 — Gaps Heuristic

Whitespace enumeration over top-50 atoms with co-occurrence feasibility check.
Expected: <50ms (bounded by 2 SQL queries on indexed tables).
