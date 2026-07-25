# SilkLabs

A **co-founder / team-matching platform** where users publish projects, find collaborators, apply to roles, and build teams. Includes an interactive **startup ecosystem graph** (16K+ companies, 325 tags) for market visualization, country gap analysis, and idea validation.

Built as a [Solvearn](https://vvd.world) inspired platform with an industrial cyberpunk design system.

## Key Features

- **Project Publishing** — Multi-step wizard to create and publish projects (Vision → Tech Stack → Roles → Review)
- **Co-founder Matching** — Browse people, discover collaborators, apply to open roles
- **Startup Ecosystem Graph** — Interactive WebGL graph of 16,698 startups tagged across 325 tags. 4 tabs:
  - **Tags** — AND-intersection tag query with chip search, country filter
  - **Gap** — Compare tag distribution between two countries
  - **Companies** — Filtered company list with client-side search
  - **Compare** — Tag overlap comparison between two companies
  - **Idea / Decon** — On-device semantic search against 325 tags using `@xenova/transformers`
- **Community Workspace** — Poll-based public chat room
- **Offer Builder** — 13-step wizard for creating "Grand Slam Offers" (persisted to localStorage)

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | shadcn `base-nova` with `@base-ui/react` primitives |
| Styling | Tailwind CSS v4, `tw-animate-css` |
| Database | PostgreSQL 16 via Prisma 7 |
| Auth | Better Auth (email/password + Google, GitHub, LinkedIn OAuth) |
| Graph Rendering | Canvas 2D with WASM grid culling (`graph_engine.cpp` → Emscripten) |
| Genome Engine | TypeScript + Postgres + clingo-wasm (no Python, no FastAPI) |
| On-device ML | `@xenova/transformers` (SentenceTransformer for semantic tag search) |
| Graph Data Pipeline | Python (`sentence-transformers`, `umap-learn`, `scikit-learn`) |
| Fonts | Space Grotesk (headings), Inter (body), JetBrains Mono (labels) |

## Prerequisites

- **Node.js** v20+ (v22+ recommended)
- **Docker** (for PostgreSQL)

No Python, no FastAPI, no Soufflé required.

## Getting Started

### 1. Clone and install

```bash
git clone <repo-url>
cd silklabs
npm install
```

### 2. Start PostgreSQL

```bash
docker compose up -d
# PostgreSQL will be available on localhost:5444
```

### 3. Set up environment

```bash
cp .env.example .env
# Edit .env with your values (at minimum verify DATABASE_URL)
```

### 4. Run database migrations and seed

```bash
npm run db:migrate
npm run db:seed
```

> All demo accounts use password: `password123`

### 5. Start the dev server

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
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed database with demo data |
| `npm run db:reset` | Reset all data + re-migrate + re-seed |
| `npm run db:studio` | Open Prisma Studio |
| `npm run test:e2e` | Playwright e2e tests |
| `npm run test:e2e:ui` | Playwright UI mode |

## Genome Engine (Build-Time Pipeline)

The genome engine decomposes 36K companies into typed atoms (478 atoms across 7 types). Tables must exist before using the genome features:

```bash
# Build the genome tables (one-time, re-run when company data changes)
DATABASE_URL="postgresql://postgres@localhost:5444/silklabs" npx tsx scripts/build_genome.ts
```

Output: `genome_*` tables in Postgres (~178K atom facts, ~21K co-occurrence pairs, ~26K density entries).

Verification:
```bash
npx tsx scripts/verify_genome_parity.ts
```

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

- **Workspace Chat** is poll-based (every 5s), not WebSocket
- **Graph data** requires manual Python pipeline execution to update
- **LinkedIn OAuth** needs env vars to be configured (gracefully disabled otherwise)
- **Offer Builder** persists to localStorage only (no server-side save yet)
- **WASM culling** is optional — if missing, falls back to full-node render

## Theme

Dark industrial cyberpunk palette (`#0d1515` bg, `#00f0ff` accent, `#ff5c00` orange) with vvd.world-inspired micro-animations (`animate-float`, `animate-shimmer`, `animate-entrance`, `animate-vvd-fade-in`, gradient border rotation, marching ants, orbiting gradient background).
