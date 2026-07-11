# Silklabs

A platform for users and companies to publish products and find team members for projects. Built as a [Solvearn](https://vvd.world) clone with an industrial cyberpunk design system.

## Tech Stack

- **Framework:** Next.js 16 (Turbopack)
- **UI:** shadcn `base-nova` with `@base-ui/react` primitives
- **Styling:** Tailwind CSS v4, `tw-animate-css`
- **Database:** Prisma 7
- **Auth:** Better Auth
- **Fonts:** Space Grotesk (headings), Inter (body), JetBrains Mono (labels)

## Getting Started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the result.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run db:seed` | Seed the database |
| `npm run db:reset` | Reset migrations + seed |
| `npm run db:studio` | Prisma Studio |
| `npm run test:e2e` | Playwright e2e tests |
| `npm run test:e2e:ui` | Playwright UI mode |

## Theme

Dark industrial cyberpunk palette (`#0d1515` bg, `#00f0ff` accent, `#ff5c00` orange) with vvd.world-inspired micro-animations (`animate-float`, `animate-shimmer`, `animate-entrance`, `animate-vvd-fade-in`, gradient border rotation, marching ants, orbiting gradient background).
