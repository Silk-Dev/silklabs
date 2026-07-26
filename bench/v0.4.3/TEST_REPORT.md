# TEST_REPORT.md — Genome Engine Test Suite

**Provenance**
```
Artifacts at commit: 9db94bb02ba7ae3b1e9d16e2a560bc07e6fd5d01  (substantive work)
Tag v0.4.3:          9db94bb02ba7ae3b1e9d16e2a560bc07e6fd5d01  (artifacts-only)
Timestamp:   2026-07-26T01:41:07+01:00
Command:     DATABASE_URL="postgresql://postgres@localhost:5444/silklabs" npx vitest run
Node:        v25.2.1
Platform:    linux/x64
genome_* DB: 478 atoms, 178,590 company_atom, 21,462 co_occurs, 52,650 near, 26,070 density
```

## Results

| Test Files | Passed | Failed | Pending |
|---|---|---|---|
| 6 | 6 | 0 | 0 |

| Tests | Passed | Failed | Skipped |
|---|---|---|---|
| 79 | 79 | 0 | **0** |

0 skipped. All integration tests ran against Postgres.

## Pass/Fail by Test File

### A1 — genome/hash.test.ts (29 ✓)
| Section | Tests | Status |
|---|---|---|
| normalizeAtom parity cases | 7 | ✓ |
| normalizeAtom idempotent/stripping | 5 | ✓ |
| genomeHash parity cases | 8 | ✓ |
| genomeHash order/mutate/edge | 6 | ✓ |
| classify boundaries | 3 | ✓ |

### A2 — genome/operators.test.ts (12 ✓)
| Test | Status |
|---|---|
| RED-OCEAN CANARY (density 112 > 20 → RED_OCEAN) | ✓ |
| evolve(uber, +healthcare) → WHITESPACE | ✓ |
| evolve(uber, +self_driving) → nearest has high similarity | ✓ |
| regress(uber, −autonomous_trucking) | ✓ |
| swap(uber, ridesharing→b2c) → REJECTED (type mismatch) | ✓ |
| validate(fixed set) → classification + nearest | ✓ |
| DETERMINISM (same input → same genome hash) | ✓ |
| empty genome → empty nearest | ✓ |
| nonexistent company → empty genome | ✓ |
| operators.evolve() returns correct shape | ✓ |
| operators.regress() returns correct shape | ✓ |
| operators.validate() returns correct shape | ✓ |

### A3 — genome/near.test.ts (4 ✓)
| Test | Status |
|---|---|
| near consumer invariant (no exact-depth queries) | ✓ |
| all near pairs have depth ≤ 4 | ✓ |
| some pairs have depth > 3 (excluded from gaps) | ✓ |
| all co-occurrence pairs in near | ✓ |

### A4 — genome/team.test.ts (6 ✓)
| Test | Status |
|---|---|
| required atoms fully covered | ✓ |
| team covers all capabilities | ✓ |
| hard_conflict respected | ✓ |
| max_team respected | ✓ |
| UNFILLABLE → honest empty | ✓ |
| DETERMINISM (same facts → same team) | ✓ |

### A5 — genome/capability.test.ts (6 ✓)
| Test | Status |
|---|---|
| weight ordering: proven(1.0) > claimed(0.5) > aspired(0.2) | ✓ |
| numeric weights are correct magnitudes | ✓ |
| deduplication keeps highest weight | ✓ |
| deterministic: same sources → same result | ✓ |
| empty profile → empty map, no throw | ✓ |
| profile with only aspired skills returns them | ✓ |

### A6 — genome/concept.test.ts (7 ✓)
| Test | Status |
|---|---|
| genome→capability rules (5 types) | ✓ |
| naming determinism | ✓ |
| whitespace → non-empty capabilities | ✓ |

## Key Safety Tests

**RED-OCEAN CANARY**: `apparel|beauty|fashion|smart_clothing|sustainable_fashion` →  
density 112 (> 20) → classification RED_OCEAN. **If the hash algorithm drifts, returns density 0 (WHITESPACE) and fails loudly.**

**DETERMINISM**: Same input → same output verified across 10 iterations (hash) and 3 iterations (Clingo). Catches any `Math.random()`.

**MUTATION CHECK**: Breaking `genomeHash` by reversing the sort causes 9 test failures
(8 parity + 1 SNAPSHOT). Restoring passes 29/29. Verified.

## Coverage

Run `DATABASE_URL=... npx vitest run --coverage`.
```
hash.ts         │ 100% stmts │ 100% branch │ 100% funcs │ 100% lines
operators.ts    │  80% stmts │  64% branch │  93% funcs │  85% lines
```
