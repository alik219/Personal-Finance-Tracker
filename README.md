# Personal Finance Tracker

Multi-user personal finance web app: accounts and transfers, CSV import, rules + AI categorization, budgets, recurring bills, savings goals. Built with Next.js, TypeScript, Tailwind, shadcn/ui and Supabase, all on free tiers.

See [docs/PLAN.md](docs/PLAN.md) for the architecture and backlog.

## Requirements

- Node.js 20+
- Docker Desktop (for local Supabase, from backlog task 2)

## Scripts

| Command            | What it does                                    |
| ------------------ | ----------------------------------------------- |
| `npm run dev`      | Start the dev server at http://localhost:3000   |
| `npm run check`    | Lint, typecheck and unit tests                  |
| `npm test`         | Unit tests (Vitest)                             |
| `npm run test:e2e` | End-to-end tests (Playwright, desktop + mobile) |
| `npm run format`   | Format all files with Prettier                  |
| `npm run build`    | Production build                                |
