# SilkLabs

A **co-founder / team-matching platform** where users publish projects, find collaborators, apply to roles, and build teams. Includes an interactive **startup ecosystem graph** (36K companies, 325 tags) for market visualization, country gap analysis, idea validation, and a **genome engine** (478 typed atoms) that answers what exists / what's missing / who should build it.

Built as a [Solvearn](https://vvd.world) inspired platform with an industrial cyberpunk design system.

## Key Features

- **Project Publishing** — Multi-step wizard to create and publish projects (Vision → Tech Stack → Roles → Review)
- **Co-founder Matching** — Browse people, discover matches, apply to open roles
- **Discover** — Algorithmically-ranked project feed with filters
- **Community Workspace** — Public community **forum** with posts, per-post voting, tags, and sort modes
- **Offer Builder** — Guided **Hormozi-style chat coach** that builds a "Grand Slam Offer" through 10 structured questions. Produces a client-side offer summary (not persisted)
- **Genome Console** (`/graph`) — An interactive tag-space graph of 36,103 companies, plus a 5-mode genome inspector (Decompose / Mutate / Recombine / Gaps / Validate):
  - **Tags** — AND-intersection tag query with chip search
  - **Companies** — Filtered company list with client-side search
  - **Compare** — Tag overlap comparison between two companies
  - **Decon** — On-device semantic search against 325 tags using `@xenova/transformers`
  - **Genome modes** — evolve / regress / swap / validate genomes, enumerate whitespace gaps, and assemble teams via clingo-wasm (see Genome Engine below)
- **Notifications** — Count badge + streamed notification list
- **Admin** — Admin dashboard route

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | shadcn `base-nova` with `@base-ui/react` + Radix primitives |
| Styling | Tailwind CSS v4, `tw-animate-css` |
| Database | PostgreSQL 16 via Prisma 7 |
| Auth | Better Auth (email/password + Google, GitHub, LinkedIn OAuth) |
| Graph Rendering | Canvas 2D with WASM grid culling (`graph_engine.cpp` → Emscripten) |
| Genome Engine | TypeScript + Postgres + clingo-wasm (no Python, no FastAPI) |
| On-device ML | `@xenova/transformers` (SentenceTransformer for semantic tag search + Reality Index) |
| Graph Data Pipeline | Python (`sentence-transformers`, `umap-learn`, `scikit-learn`) |
| Fonts | Space Grotesk (headings), Inter (body), JetBrains Mono (labels) |

## Prerequisites

- **Node.js** v22+ (see `.nvmrc`)
- **Docker** (for PostgreSQL)

No Python, no FastAPI, no Soufflé required.

## Getting Started

### 1. Clone and install

```bash
git clone <repo-url>
cd silklabs
nvm use          # Switch to Node 22 (.nvmrc)
npm install      # Installs deps + runs postinstall patch for @xenova/transformers
```

### 2. Start PostgreSQL

```bash
docker compose up -d
# PostgreSQL will be available on localhost:5444
```

### 3. Set up environment

```bash
cp .env.example .env
# Edit .env with your values (at minimum verify DATABASE_URL and BETTER_AUTH_URL)
```

### 4. Run database migrations and seed

```bash
npx prisma migrate deploy   # Apply migrations
npm run db:seed             # Seed demo data (11 users, all password123)
```

### 5. (One-time) Build the genome tables

```bash
DATABASE_URL="postgresql://postgres@localhost:5444/silklabs" npx tsx scripts/build_genome.ts
```

### 6. Start the dev server

```bash
npm run dev
```

The app runs at **http://localhost:3020** by default. Set `BETTER_AUTH_URL` in `.env` to match.

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (port 3020) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npx prisma migrate deploy` | Apply database migrations |
| `npm run db:seed` | Seed database with demo data |
| `npm run db:reset` | Reset all data + re-migrate + re-seed |
| `npm run db:studio` | Open Prisma Studio |
| `npm test` | Run vitest unit suite |
| `npm run test:coverage` | Run vitest with coverage |
| `npm run test:e2e` | Playwright e2e tests |
| `npm run test:e2e:ui` | Playwright UI mode |
| `npm run bench` | Genome engine benchmarks |
| `npx tsx scripts/build_genome.ts` | Rebuild the `genome_*` tables |
| `npx tsx scripts/verify_genome_parity.ts` | Golden parity test for genome hash |

## Genome Engine (Build-Time Pipeline)

The genome engine decomposes companies into **typed atoms** (478 atoms across 7 types: industry, business_model, delivery, technology, labor_model, revenue_model, regulatory). Built once, queried at runtime via direct Postgres + clingo-wasm (no Python service).

Output of the build pipeline: `genome_*` tables in Postgres (~178K atom facts, ~21K co-occurrence pairs, ~26K density entries).

Runtime surface (see `src/lib/genome/` and `src/app/api/genome/`):
- **Evolve / Regress / Swap / Validate** — landing reports via `genome/operators.ts`
- **Gaps** — whitespace enumeration (`genome/gaps.ts`)
- **Team** — Clingo-WASM team assembly with TOP-K pre-filtering + greedy fallback
- **Concept** — venture concept engine (genome → name → requirements)
- Verified by 79 unit tests (hash/operators/near/team/capability/concept), incl. the RED-OCEAN canary and byte-for-byte hash parity vs the original Python implementation.

For the full context, see `HANDOFF.md`.

## WASM Culling Module

The graph uses a WASM module for efficient grid-based node culling at ~0.6ms per frame. To rebuild it:

```bash
# Install Emscripten, then:
cd graph
emcc -O3 graph_engine.cpp -o ../public/graph/graph_engine.wasm \
  -s WASM=1 -s EXPORTED_FUNCTIONS='["_cullNodes"]' \
  -s ENVIRONMENT=web -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]'
```

The WASM module is optional — if missing, the graph renders all nodes gracefully.

## Demo Accounts

All passwords: `password123`

| Name | Email | Role |
|---|---|---|
| Alex Chen | alex@example.com | Founder (OpenFeedback, Harbor CLI) |
| Maya Patel | maya@example.com | Frontend Engineer |
| Jordan Kim | jordan@example.com | Designer (PixelGrid) |
| Priya Sharma | priya@example.com | ML Engineer (DocLens) |
| Marcus Johnson | marcus@example.com | Backend Infra Engineer |
| Elena Vasquez | elena@example.com | Full-Stack Fintech (PixPay) |
| Tom Berg | tom@example.com | Mobile Developer |
| Yuki Tanaka | yuki@example.com | PM / Data (TasteMatch) |
| Sara Lee | sara@example.com | DevOps |
| David Okafor | david@example.com | Frontend Engineer |
| Anna Kowalski | anna@example.com | Product Designer (BrandKit) |

## Known Limitations

- **Workspace forum** is not real-time (posts fetch on request; no WebSocket/SSE streaming yet)
- **Offer Builder** produces an in-memory summary only — no persistence (neither localStorage nor server-side)
- **Graph data** requires manual Python pipeline execution to update
- **LinkedIn OAuth** needs env vars to be configured (gracefully disabled otherwise)
- **WASM culling** is optional — if missing, falls back to full-node render

## CI

`.github/workflows/ci.yml` runs on push/PR to `main`: Node 22, Prisma generate + migrate deploy, seed, genome build, `tsc --noEmit`, vitest unit suite, genome integration tests, and genome parity check — all against a spin-up Postgres 16 service.

## Theme

Dark industrial cyberpunk palette (`#0d1515` bg, `#00f0ff` accent, `#ff5c00` orange) with vvd.world-inspired micro-animations (`animate-float`, `animate-shimmer`, `animate-entrance`, `animate-vvd-fade-in`, gradient border rotation, marching ants, orbiting gradient background).