# SilkLabs — Complete Handoff for v0.3.0–v0.4.3

## Current State (post-v0.4.3)

- **Genome Console UI is live** at `/graph` (`src/components/graph/graph-console.tsx`) — the 5-mode console (Decompose / Mutate / Recombine / Gaps / Validate) that v0.4.0's rc-phase called for is built and wired to the tag-space canvas. "Build This" blueprint overlay (`build-this-blueprint.tsx`) flows from a whitespace landing to a venture concept.
- **App surface**: dashboard with Discover, Projects (wizard: Vision → Stack → Roles → Review), People, Matches, Workspace (now a **community forum** — posts/votes/tags — not a poll-based chat), Offer Builder (10-step Hormozi-style chat coach, in-memory summary only), Notifications, Settings, Admin.
- **CI**: `.github/workflows/ci.yml` (Node 22 + Postgres 16 service): Prisma generate/migrate, seed, genome build, `tsc --noEmit`, vitest, genome integration tests, parity check.
- **Vercel**: `.vercel/project.json` + `vercel/.env.production.local` present — deployment is configured.
- **Tagging status**: `v0.4.3` tagged on `feature/v0.4.3-evidence`. `v0.3.0` still untagged (see Next Milestones).

## What the Platform Is

SilkLabs is a **universal enterprise synthesis engine** — it reads the genome of the global economy (36K companies decomposed into 478 typed atoms), answers what exists / what's missing / who should build it, and powers matching on **proof over claims** via the Reality Index.

The platform runs on **Next.js + Postgres + clingo-wasm** — zero Python, zero FastAPI, zero Soufflé. Single Vercel deployment.

---

## Project Structure

```
scripts/
  build_genome.ts          — TypeScript build pipeline (replaces Python/Soufflé)
  verify_genome_parity.ts   — Golden test suite for genome engine
  patch-onnx-tensor.js      — postinstall: fixes Tensor getter bug (see below)
graph/
  tag_hierarchy.json        — 325 tags in 12 categories
  atom_ontology.json         — 478 typed atoms across 7 types
  tag_to_type.json           — 480 tag→type mappings
  all_companies.json         — 36K companies with tags
  genome_engine.lp           — Clingo ASP: evolve/regress/swap operators (reference; TS in genome/operators.ts)
  gap_finder.lp              — Clingo ASP: whitespace enumeration (reference; TS heuristic in genome/gaps.ts)
  team_assembly.lp           — Clingo ASP: team solver (loaded at runtime by /api/genome/team)
src/lib/
  genome/hash.ts             — Canonical genome hash (normalizeAtom + genomeHash)
  genome/operators.ts        — evolve/regress/swap/validate via direct Postgres
  genome/gaps.ts             — Whitespace heuristic enumeration
  genome-types.ts            — Shared TypeScript types
  ingestion.service.ts       — IMAGE/PDF/TEXT/URL → caption/extract → embed → Reality Index
  alignment.service.ts       — Matching on reality_vector (fallback to embedding_vector)
  capability.service.ts      — Capability profiles (ProofOfWork→claimed→aspired fusion)
  concept.service.ts         — Venture concept engine (genome→name→requirements)
  prisma.ts                  — Prisma client singleton
src/app/api/genome/
  evolve/route.ts            — POST: add atom → landing report
  regress/route.ts           — POST: remove atom → landing report
  swap/route.ts              — POST: replace atom (same-type enforced)
  validate/route.ts          — POST: classify arbitrary atom-set
  gaps/route.ts              — POST: whitespace enumeration (heuristic)
  team/route.ts              — POST: Clingo-WASM team assembly (with pre-filter + greedy fallback)
  concept/route.ts           — POST: whitespace genome → venture concept
src/app/api/user/
  capabilities/route.ts      — POST: user capability profile
tests/
  src/lib/genome/
    hash.test.ts             — 29 tests: normalize, hash parity, classify, snapshot
    operators.test.ts        — 27 tests: RED-OCEAN CANARY, evolve/regress/swap/validate,
                               determinism, pre-filter, greedy fallback
    near.test.ts             — 4 tests: consumer invariant, depth bounds, superset
    team.test.ts             — 6 tests: Clingo coverage, conflicts, max_team, unfillable
    capability.test.ts       — 6 tests: weight ordering, dedup, determinism, empty
    concept.test.ts          — 7 tests: genome→capability rules, determinism
bench/
  run-benchmarks.ts          — Benchmark runner (B1 clingo, B5 hash)
  cold_cell.ts               — Fresh-process cold-start measurement
  results.json               — Machine-readable results
  BENCHMARK_REPORT.md        — Methodology + p50/p95 tables
  TEST_REPORT.md             — Full pass/fail with provenance
  v0.4.3/                    — Tagged artifact copy

KNOWN ISSUE — MUST APPLY AFTER npm install:
  scripts/patch-onnx-tensor.js patches @xenova/transformers/src/utils/tensor.js
  to preserve 'location' and 'data' getters lost by Object.assign.
  Auto-runs via "postinstall" in package.json.
```

---

## v0.4.3 — Genome Engine (Complete, Tagged)

### What It Does
- **478 typed atoms** across 7 types (industry, business_model, delivery, technology, labor_model, revenue_model, regulatory) mapped from 325 flat tags
- **36K companies** decomposed into 178K typed-atom facts
- **21K+ co-occurrence pairs**, 52K near relations (BFS depth ≤ 4)
- **26K+ distinct genome hashes** with exact company counts
- **Evolve/Regress/Swap/Validate** operators via direct Postgres queries (no API dependency)
- **Gaps heuristic**: whitespace enumeration via co-occurrence feasibility over top-50 atoms
- **Team assembly**: clingo-wasm in-process with TOP-K=3 pre-filtering + deterministic greedy fallback

### Key Files
| File | Purpose |
|---|---|
| `src/lib/genome/hash.ts` | normalizeAtom + genomeHash (byte-for-byte verified vs Python) |
| `src/lib/genome/operators.ts` | evolve/regress/swap/validate — direct Postgres implementations |
| `src/lib/genome/gaps.ts` | Whitespace heuristic from top-50 atoms |
| `src/app/api/genome/team/route.ts` | Clingo-WASM with pre-filtering + fallback |
| `scripts/build_genome.ts` | Pure-TS pipeline replacing Python/Soufflé |
| `scripts/verify_genome_parity.ts` | Golden test suite (12 genomes, all operators) |

### Verification (79 tests, 0 skipped, 0 failed)
- **RED-OCEAN CANARY**: `apparel|beauty|fashion|smart_clothing|sustainable_fashion` → density 112 > 20, classification RED_OCEAN. Fails loudly if hash algorithm drifts.
- **MUTATION CHECK**: Breaking `genomeHash` causes 9 test failures; restoring passes 29/29.
- **DETERMINISM**: Same input → same output across 10 iterations (hash) and 3 iterations (Clingo).
- **UNFILLABLE GAP**: Required atom with zero candidates → honest empty, never fabricated member.
- **PATHOLOGICAL 2a×20h**: 2382ms → 2.6ms via TOP-K=3 pre-filtering. All cells <5ms p95.
- **Cold start**: 57-79ms per cell (fresh process, WASM init dominated).
- **B2 operators**: all <2ms p95 against Postgres.
- **B4 gaps**: ~86ms total.

### Coverage
```
hash.ts         │ 100% stmts │ 100% branch │ 100% funcs │ 100% lines
operators.ts    │ 98.75% stmts│ 90.47% branch│ 100% funcs │ 100% lines
```

### Tag
`v0.4.3` on branch `feature/v0.4.3-evidence`. Artifacts at `bench/v0.4.3/`.

---

## v0.3.0 — Proof Drives Matching (Code Complete, Not Tagged)

### What It Does
- **IMAGE ingestion**: caption via `vit-gpt2-image-captioning` (greedy decoding, deterministic) → embed caption with MiniLM → 384-dim → Reality Index. Falls back to filename caption if model not cached.
- **PDF ingestion**: extract text via `pdf-parse` (pure JS, Vercel-safe) → embed with MiniLM → 384-dim. 10K char cap. Empty/scanned PDFs → warning, no crash.
- **reality_vector matching**: `alignment.service.ts` now queries `reality_vector` with fallback to `embedding_vector`. The IVFFlat index already exists.
- **Thesis Test**: Maya Patel's software claim is overridden by culinary proofs → reality_vector shifts → matching reflects restaurant domain.

### Key Files
| File | Purpose |
|---|---|
| `src/lib/ingestion.service.ts` | IMAGE/PDF/TEXT/URL ingestion + Reality Index |
| `src/lib/alignment.service.ts` | findNearestNeighbors + getCosineDistance on reality_vector |
| `test_thesis.ts` | End-to-end thesis test: culinary proofs override software claim |
| `scripts/patch-onnx-tensor.js` | **REQUIRED PATCH**: fixes `Tensor.location must be a string` bug |
| `.nvmrc` | Pins Node 22 for onnxruntime compatibility |

### Known Issue — Must Patch Transformers
`@xenova/transformers` v2.17.2 `Tensor` constructor uses `Object.assign(this, new ONNXTensor(...))` which loses prototype getters (`location`, `data`). onnxruntime-node's native binding throws `Tensor.location must be a string`. Fix: `npm install` auto-runs `scripts/patch-onnx-tensor.js` via postinstall hook.

### Thesis Test Status (Node 22)
```
=== v0.3.0 Thesis Test ===
User: Maya Patel
IMAGE: filename fallback (vit-gpt2 not cached — expected in dev)
TEXT (restaurant): confidence=0.2
TEXT (software): confidence=0.6
Reality Index: 7 assets, score=0.31
Base→Reality cosine distance: 0.0278  ✓ shifted
Nearest neighbors query works via reality_vector
```

The IMAGE captioning model (~600MB) must download on first production use. The thesis test relies on the TEXT proof (restaurant management), which demonstrates the reality shift correctly.

### What Would Complete v0.3.0
1. Run `npm run bench` to generate benchmark data for B1-B5 (requires vit-gpt2 download or a cached model)
2. Tag `v0.3.0` with artifacts at `bench/v0.3.0/` following the same convention as v0.4.3

---

## How to Run

```bash
# Prerequisites
nvm use                   # Switch to Node 22 (.nvmrc)
npm install               # Installs deps + runs postinstall patch
docker compose up -d      # Start PostgreSQL
npx prisma migrate deploy  # Run migrations
npx tsx prisma/seed.ts    # Seed demo data

# Build the genome tables (one-time)
DATABASE_URL="postgresql://postgres@localhost:5444/silklabs" npx tsx scripts/build_genome.ts

# Start dev server
PORT=3020 npx next dev -p 3020

# Run thesis test
DATABASE_URL="postgresql://postgres@localhost:5444/silklabs" npx tsx test_thesis.ts

# Run full test suite
DATABASE_URL="postgresql://postgres@localhost:5444/silklabs" npx vitest run

# Run benchmarks
npm run bench
```

## Architecture Diagram

```
Browser ──► Next.js (port 3020)
              │
              ├── /api/genome/* — operators, gaps, team (clingo-wasm in-process)
              ├── /api/user/capabilities — capability profiles
              ├── /api/genome/concept — venture concept engine
              │
              ├── Postgres
              │   ├── genome_* tables (atoms, co-occurrence, density, near)
              │   ├── twin_vectors (embedding_vector + reality_vector)
              │   ├── proofs_of_work (IMAGE/PDF/TEXT/URL → 384-dim embeddings)
              │   └── alignments (matching scores)
              │
              └── No external services — no Python, no FastAPI, no Soufflé
```

## Next Milestones Suggested
1. **Tag v0.3.0**: Run benchmarks once vit-gpt2 is cached, produce `bench/v0.3.0/` artifacts.
2. **Synthetic Vetting (v0.5.0)**: Extend the proof layer to auto-generate challenge problems for claimed-but-unproven capabilities.
3. **Offer Builder persistence**: Currently in-memory only — decide on localStorage vs server-side save (see README Known Limitations).
4. **Workspace real-time**: Forum fetches on request; consider SSE/WebSocket streaming.
