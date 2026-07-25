# SilkLabs — Planning Agent Handoff (v0.4.0)

## What This Platform Is

SilkLabs is a **universal enterprise synthesis engine** — it reads the genome of the global economy (36,103 companies decomposed into 478 typed atoms), and answers three questions:
1. **What exists?** (density, co-occurrence, proximity)
2. **What's missing?** (whitespace enumeration via gap finder)
3. **Who should build it?** (team assembly via ASP constraint solving)

## Current State

### ✅ v0.4.0-alpha Complete — The Soufflé Layer (Build Time)
- **Typed Atom Ontology**: 478 atoms across 7 types (industry, business_model, delivery, technology, labor_model, revenue_model, regulatory). All 325 hierarchy tags mapped.
- **Genome Decomposition**: 36,103 companies → 178,590 typed-atom facts.
- **Co-occurrence**: 21,462 atom pairs with exact counts.
- **Transitive Proximity**: 171,398 near-relations (depth ≤ 4, via Soufflé Datalog).
- **Density**: 26,070 distinct genome hashes with exact company counts.
- **Whitespace**: Conceptually valid (evolve Uber+healthcare → density 0).
- **Postgres Tables**: `genome_atom_ontology`, `genome_company_atom`, `genome_co_occurs`, `genome_near`, `genome_density`.

### ✅ v0.4.0-beta Complete — The Clingo Layer (Runtime)
- **3 ASP Programs**: `genome_engine.lp` (operators), `gap_finder.lp` (whitespace), `team_assembly.lp` (team building).
- **FastAPI Service**: `genome_service.py` with 6 endpoints:
  - `POST /api/genome/evolve` — add atom → landing report (density + nearest + classification)
  - `POST /api/genome/regress` — remove atom → landing report
  - `POST /api/genome/swap` — replace atom (same type) → landing report
  - `POST /api/genome/validate` — arbitrary atom-set → classification
  - `POST /api/genome/gaps` — whitespace enumeration (heuristic)
  - `POST /api/genome/team` — Clingo team assembly from required capabilities

### ❌ v0.4.0-rc & -final Not Built
Navigation Console (5 tabs replacing old graph UI) and the "Build This" flow not implemented.

## Key Files

| Path | Purpose |
|---|---|
| `graph/genome_pipeline.py` | Build-time pipeline: reads companies, computes everything, loads Postgres |
| `graph/genome.dl` | Soufflé Datalog: transitive proximity (near) |
| `graph/genome_engine.lp` | Clingo: evolve/regress/swap operators |
| `graph/gap_finder.lp` | Clingo: gap/whitespace enumeration |
| `graph/team_assembly.lp` | Clingo: optimal team solver |
| `graph/genome_service.py` | FastAPI microservice (port 8000) |
| `graph/atom_ontology.py` | Ontology builder (tag → type mapping) |
| `graph/tag_to_type.json` | 480 tag→type entries (used by pipeline) |
| `graph/atom_ontology.json` | 478 atom→type entries |
| `graph/genome_schema.sql` | Postgres DDL for genome_* tables |

## Runtime Architecture

```
Browser ──► Next.js (port 3020) ──► Genome Service (port 8000)
                                          │
                                          ├── Postgres (genome_* tables)
                                          │
                                          ├── Clingo (team_assembly.lp)
                                          │
                                          └── Soufflé output (near.csv)
```

The genome service reads from the pre-computed Postgres tables for instant lookups. Clingo is invoked only for combinatorial search (gap finder, team assembly).

## Litmus Test Results

| Test | Result |
|---|---|
| Evolve Uber + healthcare → WHITESPACE | ✅ Density 0, nearest = Uber (0.83 similarity) |
| Regress Uber − autonomous_trucking → WHITESPACE | ✅ Density 0 |
| Swap ridesharing → b2c (different types) | ✅ Correctly rejected (industry ≠ business_model) |
| Validate healthcare + b2c + app → WHITESPACE | ✅ Density 0, 10 nearest neighbors found |
| Gap Finder returns ≥ 50 whitespaces | ✅ (heuristic enumeration, configurable limit) |

## What's Not Done / Known Issues

1. **rc-phase (Navigation Console)**: The 5 new graph tabs (Decompose, Mutate, Recombine, Gaps, Validate) replacing the old graph UI.
2. **final-phase (Build This)**: Whitespace landing → "Build This" → Clingo team assembly → notify flow.
3. **Genome service crashes** when running under uvicorn for multiple requests (psycopg2 threading issue). Use `--workers 1` and single-threaded mode, or add connection pooling.
4. **Gap Finder** uses a heuristic (top-50 atoms, 2-3 atom combinations). The full Clingo ASP is written but needs performance tuning for 478 atoms.
5. **Team Assembly** needs Reality Index integration (v0.3.0).
6. **Non-tech ventures** (restaurant, film studio, farm) — the typing system supports them but no test genomes exist.
7. **Soufflé dependency** — currently only needed for transitive proximity. Could be replaced with a BFS in Python for simplicity.

## Quick Start for Planning Agent

```bash
# Run the pipeline (idempotent)
cd /home/jesser/Desktop/Stuff/silklabs
.venv_genome/bin/python3 graph/genome_pipeline.py

# Start the genome service
.venv_genome/bin/uvicorn graph.genome_service:app --host 0.0.0.0 --port 8000

# Test the engine
curl -X POST http://localhost:8000/api/genome/evolve \
  -H "Content-Type: application/json" \
  -d '{"company_id": "26645", "atom": "healthcare"}'
```
