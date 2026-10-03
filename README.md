# Personal Finance Tracker

[![CI](https://github.com/alik219/Personal-Finance-Tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/alik219/Personal-Finance-Tracker/actions/workflows/ci.yml)

Multi-user personal finance web app: accounts and transfers, CSV import, rules + AI categorization, budgets, recurring bills, savings goals. Built with Next.js, TypeScript, Tailwind, shadcn/ui and Supabase, all on free tiers.

See [docs/PLAN.md](docs/PLAN.md) for the architecture and backlog.

## Requirements

- Node.js 20+
- Docker Desktop with WSL 2, running (for the local Supabase database)

## First-time setup

1. `npm install`
2. `npm run db:start` (first run downloads the Supabase images)
3. Copy `.env.example` to `.env.local` and paste the **Publishable** key from `npm run db:status`
4. `npm run dev`, then open http://localhost:3000/health: it should say "Database connected"

## Scripts

| Command             | What it does                                                 |
| ------------------- | ------------------------------------------------------------ |
| `npm run dev`       | Start the dev server at http://localhost:3000                |
| `npm run check`     | Lint, typecheck and unit tests                               |
| `npm test`          | Unit tests (Vitest)                                          |
| `npm run test:e2e`  | End-to-end tests (Playwright, desktop + mobile)              |
| `npm run format`    | Format all files with Prettier                               |
| `npm run build`     | Production build                                             |
| `npm run db:start`  | Start local Supabase in Docker                               |
| `npm run db:stop`   | Stop local Supabase                                          |
| `npm run db:status` | Show local URLs and keys (Studio at http://127.0.0.1:54323)  |
| `npm run db:reset`  | Recreate the local database and re-run all migrations        |
| `npm run db:types`  | Regenerate `src/lib/supabase/types.ts` from the local schema |
