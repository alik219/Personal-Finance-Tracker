# Personal Finance Tracker — Component Map & Implementation Backlog

## Context

A greenfield, **multi-user, zero-cost** web app for tracking personal finances, built in `D:\Projects\Personal Finance Tracker`. Requirements come from a 8-round interview. This document is Phase 2 (modular component map) and Phase 3 (ordered backlog).

## Locked decisions (from interview)

| Area           | Decision                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------- |
| Platform       | Web app, responsive (sidebar on desktop, bottom tabs on mobile), light/dark, quick-add everywhere |
| Users          | Multi-user product, free/personal (not monetized)                                                 |
| Stack          | Next.js (App Router) + TypeScript, shadcn/ui + Tailwind, Recharts                                 |
| Backend        | Supabase Free (Postgres + Auth + RLS). Hosting: Vercel Hobby                                      |
| Cost           | **$0**: every service on a free tier                                                              |
| Auth           | Email+password, Google OAuth, TOTP MFA                                                            |
| Input          | Manual entry + CSV import. Receipt OCR **deferred to v2**                                         |
| Accounts       | Multiple accounts + transfers. Deleting an account **cascades** (with confirmation)               |
| Currency       | Multi-currency per account, **no conversion**. All totals grouped by currency                     |
| Categories     | Default set + custom, **flat**. One category per transaction (splits in v2)                       |
| Categorization | **Rules → Gemini (free tier) → manual override** (manual edit offers "create rule")               |
| CSV            | Column mapper + saved preset per account. Duplicates: detect and review before commit             |
| Recurring      | Shown as "upcoming"; user confirms to post                                                        |
| Budgets        | Per category per month, no rollover, in-app alerts at 80%/100%                                    |
| Goals          | Manual contributions, separate from account balances                                              |
| v1 extras      | CSV data export, self-service account deletion                                                    |
| Testing        | Vitest (pure logic) + Playwright (E2E) + pgTAP RLS tests on local Supabase                        |

## Cross-cutting design rules

- **Money:** `bigint amount_minor` + `char(3) currency` (ISO 4217). Never floats. Sign convention: negative = outflow.
- **Money at the API boundary:** Supabase returns Postgres `bigint` as a JSON number, so repos convert with `BigInt(n)` on read and send `Number(x)` (or a string) on write. Exact up to 2^53 minor units, far beyond any realistic balance. In the app, money is always `bigint`; use `src/domain/money` to parse and format.
- **Dates:** transactions use `date` (no time). Month boundaries use `profiles.timezone`.
- **Isolation:** every user-owned table has `user_id uuid default auth.uid()` + RLS `(select auth.uid()) = user_id`. Supabase grants anon/authenticated ALL on new tables by default, so each migration must `revoke all ... from anon, authenticated` and grant back only the needed operations (column-level for updates). Helper functions go in the unexposed `private` schema. See `supabase/migrations/*_profiles.sql` for the template.
- **Transfers:** two transaction rows sharing `transfer_group_id`, `kind='transfer'`, excluded from income/expense, budgets, and AI. Cross-currency transfers store both amounts as entered.
- **Category provenance:** `category_source enum('none','rule','ai','manual')`. Automation never overwrites `manual`.
- **Gemini privacy:** send only `description` + sign/amount bucket + the user's category names. No user ids, account names, or balances. Disclose in a privacy note at signup (free-tier prompts may be used by Google).
- **Free-tier resilience:** AI calls are batched (~50 rows per call), retry with backoff on 429, and on failure leave rows `none` instead of blocking.
- **No cron needed:** recurring "upcoming" items are computed on read, so there's no paid scheduler.
- **Supabase pause:** free projects pause after 7 days idle. An optional free GitHub Actions weekly ping keeps it awake.

---

## Phase 2 — Modular Component Map

### Database (`supabase/`)

| File                              | Responsibility                                                                                                                                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `migrations/001_profiles.sql`     | `profiles` (display_name, timezone, default_currency) + trigger on `auth.users` insert                                                                                                                       |
| `migrations/002_accounts.sql`     | `accounts` (name, type, currency, opening_balance_minor), `account_balances` view                                                                                                                            |
| `migrations/003_categories.sql`   | `categories` (name, kind income/expense, color, icon, hidden) + seed-defaults function called by the profile trigger                                                                                         |
| `migrations/004_transactions.sql` | `transactions` (account_id FK **on delete cascade**, date, amount_minor, description, normalized_description, category_id, category_source, kind, transfer_group_id, import_batch_id, fingerprint) + indexes |
| `migrations/005_transfers.sql`    | `create_transfer()` RPC + trigger: when one leg is deleted (incl. account cascade), convert the surviving leg to a normal income/expense                                                                     |
| `migrations/006_rules.sql`        | `categorization_rules` (field, operator contains/equals/starts_with/regex, pattern, optional account_id, amount range, category_id, priority)                                                                |
| `migrations/007_imports.sql`      | `csv_mapping_presets` (per account), `import_batches` (status, row counts) + `commit_import()` RPC (atomic insert)                                                                                           |
| `migrations/008_budgets.sql`      | `budgets` (category_id, currency, amount_minor, effective month); unique (user, category, currency, month)                                                                                                   |
| `migrations/009_recurring.sql`    | `recurring_rules` (account, amount, description, category, frequency, interval, anchor_date, next_due, end_date, active)                                                                                     |
| `migrations/010_goals.sql`        | `savings_goals` (name, currency, target_minor, deadline), `goal_contributions`                                                                                                                               |
| `migrations/011_reports.sql`      | SQL functions: `monthly_totals(month)`, `spend_by_category(range)`, `trend(range)`, all grouped by currency                                                                                                  |
| `migrations/0xx_rls.sql`          | RLS policies for every table                                                                                                                                                                                 |
| `tests/*.test.sql`                | pgTAP: user A can't read/write user B's rows; transfer trigger; cascade                                                                                                                                      |

### Infrastructure (`src/lib/`)

| Module                 | Responsibility                                                             |
| ---------------------- | -------------------------------------------------------------------------- |
| `supabase/browser.ts`  | Browser client                                                             |
| `supabase/server.ts`   | Server client (cookies) for RSC and route handlers                         |
| `supabase/admin.ts`    | Service-role client, **server-only**, used only by account deletion        |
| `supabase/types.ts`    | Generated DB types (`supabase gen types`)                                  |
| `env.ts`               | Zod-validated env vars (fails fast)                                        |
| `middleware.ts` (root) | Session refresh, protect `(app)` routes, enforce AAL2 when MFA is enrolled |

### Pure domain logic (`src/domain/`): no I/O, 100% unit-tested

| Module                   | Responsibility                                                                                                                         |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `money/money.ts`         | Parse user input → minor units per currency's decimals; format with `Intl.NumberFormat`; sum per currency                              |
| `money/group.ts`         | Group/sum arrays by currency (`Record<Currency, bigint>`)                                                                              |
| `dates/month.ts`         | Month ranges in a timezone; next/prev month                                                                                            |
| `csv/parse.ts`           | Papa Parse wrapper → header + raw rows; detect delimiter and encoding                                                                  |
| `csv/mapping.ts`         | Mapping type (date col, description col, amount mode: signed / debit+credit / inverted; date format) + validate a mapping              |
| `csv/normalize.ts`       | Raw row + mapping → `DraftTransaction` or row error (bad date, bad amount)                                                             |
| `text/normalize.ts`      | Normalize descriptions (case, whitespace, strip card numbers/dates) for rules, dedup, and AI                                           |
| `dedup/fingerprint.ts`   | `account + date + amount + normalized_description` → hash                                                                              |
| `dedup/detect.ts`        | Flag drafts as `duplicate-in-db`, `duplicate-in-file`, or `matches-upcoming-recurring` (±3 days, same amount)                          |
| `rules/match.ts`         | Does one rule match a draft?                                                                                                           |
| `rules/apply.ts`         | Apply ordered rules to drafts → category + `source='rule'`                                                                             |
| `categorize/pipeline.ts` | Orchestrate: skip manual → rules → collect leftovers → AI provider → merge results; validate AI output against the user's category ids |
| `ai/provider.ts`         | `CategorizationProvider` interface (`categorize(items, categories) → {id, categoryId \| null, confidence}`)                            |
| `recurring/schedule.ts`  | Occurrences between dates for frequency/interval (month-end clamping, leap years)                                                      |
| `recurring/upcoming.ts`  | Upcoming/overdue items from rules + `next_due`; advance after confirm/skip                                                             |
| `budgets/progress.ts`    | Spent vs. budget per category/currency/month (excludes transfers)                                                                      |
| `budgets/alerts.ts`      | Thresholds → `ok \| warning(80%) \| over(100%)`                                                                                        |
| `goals/progress.ts`      | Percent, remaining, required monthly pace to hit deadline                                                                              |
| `export/toCsv.ts`        | Serialize tables to CSV strings                                                                                                        |

### Server adapters & API (`src/server/`, `src/app/api/`)

| Module                            | Responsibility                                                                                                                         |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `server/ai/gemini.ts`             | `CategorizationProvider` using Gemini Flash free tier, JSON-schema structured output, batching, 429 backoff, privacy-minimized payload |
| `server/repos/*.ts`               | One repo per table (accounts, categories, transactions, rules, imports, budgets, recurring, goals): typed Supabase queries only        |
| `server/actions/*.ts`             | Server Actions per feature (create/update/delete), Zod-validated, call repos, `revalidatePath`                                         |
| `app/api/categorize/route.ts`     | POST drafts → pipeline (rules + Gemini) → categorized drafts. Per-user rate limit                                                      |
| `app/api/export/route.ts`         | Streams a ZIP (JSZip) of the user's CSVs                                                                                               |
| `app/api/account/delete/route.ts` | Requires re-auth/AAL2 → admin client deletes the auth user → DB cascades                                                               |
| `app/auth/callback/route.ts`      | OAuth/email confirmation code exchange                                                                                                 |
| `lib/validation/*.ts`             | Zod schemas shared by forms and actions                                                                                                |

### Client state (`src/state/`)

| Module                   | Responsibility                                                                          |
| ------------------------ | --------------------------------------------------------------------------------------- |
| `query-client.tsx`       | TanStack Query provider + key factory (server state cache)                              |
| `import-wizard/store.ts` | Zustand store for the CSV wizard (file → mapping → preview/dedup → categorize → commit) |
| `ui/quick-add.ts`        | Global quick-add sheet open/close state                                                 |

### UI (`src/app/` routes + `src/components/`)

| Route / Component                                                                                                                                       | Responsibility                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `(auth)/login`, `signup`, `forgot-password`, `reset-password`                                                                                           | Auth pages                                                                                                           |
| `(auth)/mfa/verify`                                                                                                                                     | TOTP challenge                                                                                                       |
| `(app)/layout.tsx` + `components/shell/AppShell, Sidebar, BottomNav, ThemeToggle, QuickAddFab`                                                          | Responsive shell                                                                                                     |
| `(app)/dashboard` + `components/dashboard/CurrencyTabs, KpiCards, SpendByCategoryChart, TrendChart, BudgetSummary, UpcomingBills, GoalsSummary`         | Overview                                                                                                             |
| `(app)/transactions` + `components/transactions/TransactionTable, Filters, TransactionForm, TransferForm, CategoryBadge(source icon), CreateRulePrompt` | List/add/edit, filters, pagination                                                                                   |
| `(app)/accounts` + `components/accounts/AccountList, AccountForm, DeleteAccountDialog(type-to-confirm)`                                                 | Accounts CRUD + balances                                                                                             |
| `(app)/import` + `components/import/FileDrop, MappingStep, PreviewStep(dup flags), CategorizeStep, CommitStep, ImportHistory(undo)`                     | CSV wizard                                                                                                           |
| `(app)/budgets` + `components/budgets/BudgetGrid, BudgetProgressBar, MonthPicker, AlertBanner`                                                          | Budgets                                                                                                              |
| `(app)/recurring` + `components/recurring/RecurringList, RecurringForm, UpcomingList(confirm/skip)`                                                     | Recurring                                                                                                            |
| `(app)/goals` + `components/goals/GoalCard, GoalForm, ContributionForm`                                                                                 | Goals                                                                                                                |
| `(app)/settings/{profile,categories,rules,security,data}`                                                                                               | Profile/timezone, category manager, rules manager (test a rule live), MFA enroll + password, export + delete account |
| `components/ui/*`                                                                                                                                       | shadcn primitives                                                                                                    |
| `components/common/MoneyText, MoneyInput, CurrencySelect, EmptyState, ConfirmDialog`                                                                    | Shared                                                                                                               |

### Tests & tooling

`vitest.config.ts`, `src/domain/**/*.test.ts`, `tests/e2e/*.spec.ts` (Playwright against local Supabase), `supabase/tests/*.sql` (pgTAP), `.github/workflows/ci.yml` (lint, typecheck, unit, pgTAP, e2e: free for public/private within GH minutes), optional `keepalive.yml`.

---

## Phase 3 — Step-by-Step Implementation Backlog

Each task is small, independently testable, and merges on its own. **Done when** = acceptance test.

### M0: Foundation

1. **Scaffold** Next.js + TS + Tailwind + shadcn + ESLint/Prettier + Vitest + Playwright. _Done when:_ `npm run lint/typecheck/test` all pass on an empty app.
2. **Local Supabase** (CLI + Docker), `env.ts`, browser/server clients, type generation script. _Done when:_ a health page reads `now()` from the DB.
3. **`domain/money` + `domain/dates`.** _Done when:_ unit tests cover JPY(0)/USD(2)/KWD(3) decimals, parsing "1,234.5", negative values, month ranges across timezones.
4. **CI workflow** running lint, typecheck, unit tests. _Done when:_ a green run on push.

### M1: Auth

5. **`profiles` migration + trigger + RLS + pgTAP.** _Done when:_ signup creates a profile, and cross-user reads fail.
6. **Email/password** signup, login, logout, forgot/reset, callback route, middleware protection. _Done when:_ E2E signs up → confirms (Inbucket) → reaches `/dashboard`; logged-out users get redirected.
7. **Google OAuth.** _Done when:_ manual test on local + preview works (configured in Supabase dashboard).
8. **TOTP MFA** enroll/unenroll in settings/security, challenge page, AAL2 enforcement in middleware. _Done when:_ E2E with an enrolled user can't reach the app without a code.

### M2: Shell

9. **AppShell**: sidebar/bottom nav, theme toggle, empty route stubs, QuickAddFab placeholder. _Done when:_ Playwright at mobile + desktop viewport shows the correct nav.

### M3: Accounts

10. **`accounts` migration + balances view + RLS tests.** _Done when:_ pgTAP passes and the balance = opening + sum(transactions).
11. **Accounts UI** (list with balance per currency, create/edit, cascade delete with type-to-confirm). _Done when:_ E2E creates, edits, and deletes an account.

### M4: Categories

12. **`categories` migration + default seeding on signup.** _Done when:_ a new user has ~15 defaults.
13. **Category manager** (add/rename/recolor/hide/delete; on delete, transactions → uncategorized, budgets removed). _Done when:_ E2E passes.

### M5: Transactions

14. **`transactions` migration + indexes + RLS + `text/normalize`.** _Done when:_ pgTAP + unit tests pass.
15. **Transaction list**: server-paginated, filters (account, category, date range, text, uncategorized). _Done when:_ seeded 1k rows paginate and filter correctly.
16. **Transaction form + quick-add sheet** (create/edit/delete, MoneyInput by account currency, manual category → `source='manual'`). _Done when:_ E2E quick-adds from any page.
17. **Transfers**: `create_transfer` RPC, TransferForm, delete-leg trigger, exclusion from income/expense. _Done when:_ pgTAP shows deleting an account converts the counterpart leg, and the UI shows a transfer pair.

### M6: Rules

18. **`categorization_rules` migration + RLS.**
19. **`rules/match` + `rules/apply`** (priority order, all operators, safe regex with a length limit). _Done when:_ unit tests for every operator and for priority ties.
20. **Rules manager UI** with a live "test against recent transactions" view, plus **CreateRulePrompt** after a manual recategorize. _Done when:_ E2E: a manual edit → accept prompt → the rule exists and applies on the next add.

### M7: AI categorization

21. **`ai/provider` interface + `categorize/pipeline`** with a fake provider. _Done when:_ unit tests show manual rows untouched, rules first, AI only for leftovers, invalid AI category ids dropped.
22. **Gemini adapter** (structured output, batching, backoff, minimized payload). _Done when:_ contract test with mocked HTTP; a manual smoke test with a real free key.
23. **`/api/categorize` route** + per-user rate limit + "Auto-categorize uncategorized" button on transactions. _Done when:_ E2E (fake provider via env flag) categorizes rows and shows the AI badge.

### M8: CSV import

24. **`csv/parse` + `csv/mapping` + `csv/normalize`.** _Done when:_ fixture CSVs (signed amount, debit/credit, inverted, DD/MM vs MM/DD, BOM, semicolon delimiter) parse correctly and bad rows report errors.
25. **`dedup/fingerprint` + `dedup/detect`** (DB, in-file, matches upcoming recurring). _Done when:_ unit tests, including "two real identical purchases" stay reviewable rather than auto-dropped.
26. **`csv_mapping_presets`, `import_batches` migrations + `commit_import` RPC** (atomic, stores fingerprints, batch id). _Done when:_ pgTAP shows all-or-nothing insert.
27. **Import wizard UI** (FileDrop → Mapping with saved preset → Preview with dup toggles and row errors → Categorize → Commit). _Done when:_ E2E imports a fixture, re-import flags duplicates, and the second import auto-loads the preset.
28. **Import history + undo** (delete by batch id). _Done when:_ E2E undo removes exactly that batch.

### M9: Budgets

29. **`budgets` migration + RLS.**
30. **`budgets/progress` + `budgets/alerts`.** _Done when:_ unit tests for transfers excluded, multi-currency kept separate, thresholds.
31. **Budgets UI** (month picker, grid, progress bars, copy last month) + **AlertBanner** in the shell. _Done when:_ E2E: spend over 80% shows a warning.

### M10: Recurring

32. **`recurring_rules` migration + RLS.**
33. **`recurring/schedule` + `recurring/upcoming`.** _Done when:_ unit tests for Jan 31 monthly → Feb 28/29, weekly, yearly, end dates.
34. **Recurring UI + UpcomingList** (confirm → posts transaction and advances `next_due`; skip; edit). _Done when:_ E2E confirms a bill, the transaction appears, and the next due date advances.
35. **Wire recurring into import dedup** (an imported row that matches an upcoming item can mark it done instead of duplicating). _Done when:_ E2E passes.

### M11: Savings goals

36. **`savings_goals` + `goal_contributions` migrations + RLS.**
37. **`goals/progress` + Goals UI** (cards, contribute, edit, complete). _Done when:_ unit + E2E pass.

### M12: Dashboard

38. **Report SQL functions** (monthly totals, spend by category, trend), all grouped by currency. _Done when:_ pgTAP with fixture data matches expected sums.
39. **Dashboard components** (CurrencyTabs, KPIs, category donut, trend line, budget summary, upcoming bills, goals). _Done when:_ E2E with seeded data renders correct numbers; empty states for a new user.

### M13: Data rights

40. **Export** (`/api/export` ZIP of CSVs via `export/toCsv`). _Done when:_ E2E downloads the ZIP and its row counts match.
41. **Account deletion** (re-auth/AAL2, admin delete, cascade). _Done when:_ E2E deletes a user and pgTAP/queries show zero rows remain.

### M14: Ship

42. **Hardening**: a11y pass (axe in Playwright), loading/error boundaries, security headers, Gemini privacy note at signup.
43. **Deploy**: Supabase cloud free project, run migrations, Vercel Hobby, Google OAuth prod redirect URLs, optional keep-alive workflow. Mirror `supabase/config.toml` auth settings in the cloud dashboard: Site URL + redirect URLs, email confirmations on, min password 8 with letters+digits, and the `supabase/templates/*.html` email templates (local rate-limit overrides do NOT carry over). _Done when:_ full E2E smoke run against production.

### Scope cut (decided 2026-10-03)

This is a learning project, so the remaining work is trimmed to a **short version plus the AI feature**. The task descriptions above stay as reference, but only the batches below will be built, in this order.

| #   | Batch                                           | Notes                                                                                                                                           |
| --- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| D   | Tasks 12–13: Categories                         | Also remove the dropped sections (Recurring, Goals, Import) from the nav and delete their stub pages. Settings keeps only Profile + Categories. |
| E   | Tasks 14–15: Transactions table + list          | `kind` is income/expense only (no transfers, no `transfer_group_id`, no import batch). Redefine `account_balances` to include transactions.     |
| F   | Task 16: Transaction form + quick-add           | Manual category sets `category_source='manual'`. No "create rule" prompt (rules are cut).                                                       |
| I   | Task 21: AI provider + pipeline (fake provider) | Pipeline without rules: skip manual rows, send uncategorized rows to the provider, validate returned category ids.                              |
| J   | Tasks 22–23: Gemini adapter + categorize route  | Needs a free Gemini API key from the user (never enable billing). "Auto-categorize uncategorized" button on Transactions.                       |
| M   | Tasks 29–31: Budgets                            | No transfer exclusion needed (no transfers).                                                                                                    |
| P   | Tasks 38–39: Dashboard                          | Only KPIs, spend by category, trend, budget summary. No upcoming bills or goals widgets.                                                        |

Each task inside a batch is still verified before the next; one summary and one commit per batch.

**Dropped (not planned):** A Google sign-in (7), B MFA (8), G transfers (17), H rules (18–20), K/L CSV import (24–28), N recurring (32–35), O goals (36–37), Q export + account deletion (40–41), R hardening (42), S deploy (43). They can be picked up later from the task list above if wanted.

### v2 backlog (not in scope)

Receipt OCR (behind a provider adapter like AI), split transactions, budget rollover, FX conversion, email alerts, bank sync.

## Verification (overall)

- Every task: `npm run lint && npm run typecheck && npm test` + relevant pgTAP (`supabase test db`) + Playwright spec.
- Milestone gate: full E2E suite against local Supabase (`supabase start`) passes in CI.
- Final: manual walkthrough on phone + desktop: sign up → MFA → create 2 accounts (different currencies) → import CSV → auto-categorize → set budget → confirm a recurring bill → add goal contribution → dashboard → export → delete account.

---

## Progress

- [x] Task 1: Scaffold (Next.js 16 + TS + Tailwind 4 + shadcn/ui + ESLint/Prettier + Vitest + Playwright)
- [x] Task 2: Local Supabase (CLI in devDeps; realtime/storage/edge/analytics disabled), `env.ts`, browser/server clients, `health_check()` RPC + `/health` page, `db:*` scripts
- [x] Task 3: `domain/money` (parse/format/decimals per currency, exact via BigInt; 38 tests), `domain/money/group` (sum per currency), `domain/dates/month` (today/current month per timezone, month ranges, addMonths; 23 tests). TS target raised to ES2022 for BigInt.
- [x] Task 4: GitHub Actions CI (`.github/workflows/ci.yml`): format check, lint, typecheck, unit tests, build on push to main and PRs. `.nvmrc` pins Node 24; `.gitattributes` enforces LF.
- [x] Task 5: `profiles` table + sign-up trigger (validated metadata with defaults) + column-level grants + RLS; `private` schema for helpers; 19 pgTAP tests (`npm run db:test`); verified via real Auth sign-up + REST.
- [x] Task 6: Email/password auth. `src/proxy.ts` (Next 16 proxy) refreshes sessions + redirects; `requireUser()` re-checks in layouts/pages. Server actions (sign up/in/out, forgot/reset) with zod validation and no account enumeration. `/auth/confirm` (token-hash email links via custom templates) and `/auth/callback` (OAuth code). Placeholder `/dashboard`. 16 E2E tests (desktop + mobile) incl. Mailpit email flows; E2E now runs a production build on port 3100.
- [x] Task 9: App shell. Sidebar (desktop) / bottom tabs + "More" sheet (phone), next-themes dark mode, quick-add FAB placeholder (task 16 fills it), stub pages for every section, shared `PageHeader`/`EmptyState`. Shared form state moved to `lib/validation/form.ts`.
- [x] Task 10: `accounts` table (enum type, per-user unique name ignoring case, currency fixed after creation via column grants) + `account_balances` view (security_invoker; opening balance only until task 14 adds transactions). 20 pgTAP tests.
- [x] Task 11: Accounts page: totals per currency, add/edit dialog (amounts parsed per currency), delete with type-to-confirm (cascade). Repo converts bigint at the boundary. 5 E2E flows incl. cross-user privacy.
- [x] Batch D (tasks 12–13): `categories` table (income/expense kind fixed after creation, per-user unique name per kind ignoring case, palette/icon keys owned by `src/domain/categories`, `hidden` flag) + RLS/column grants; `private.seed_default_categories()` (17 defaults, idempotent) called by the sign-up trigger and backfilled for existing users; 21 pgTAP tests. `/settings/categories` manager: add, rename, recolor, change icon, hide/show, delete with confirm (later tables use set null / cascade). `/settings` is now an index (Profile marked coming soon). Removed Recurring, Goals and Import pages and nav items. 7 E2E flows.
- [x] Batch E (tasks 14–15): `transactions` table. No `kind` or `currency` columns: the sign is the kind (negative = expense) and currency comes from the account. Composite FKs `(account_id, user_id)` / `(category_id, user_id)` stop rows pointing at another user's account or category; category delete → `set null (category_id)` and a trigger resets `category_source` to `none` (enum `none | ai | manual`). `account_balances` now = opening + sum(transactions). `domain/text/normalize` (stored as `normalized_description`, for AI grouping later). 24 pgTAP tests. `/transactions`: server-paginated (50/page) newest-first list with URL filters (account, category or uncategorized, date range, literal text search) via a `next/form` GET form; empty states. E2E seeds 1,000 rows (`tests/e2e/helpers/seed.ts`) and checks paging, each filter, combined filters across pages/reload, balances. E2E workers capped at 4 locally (`E2E_WORKERS` overrides) after timeouts under load. Also restored the damaged top of this file.
- [x] Batch F (task 16): shared `TransactionForm` (expense/income toggle sets the sign, positive amount in the account's currency via `MoneyInput`, description, date defaulting to today in the profile time zone, account, category filtered by type with hidden ones excluded). Quick add sheet on every page (options loaded once per request by `server/transaction-form-options.ts`); clicking a list row opens edit with a two-step delete. `nextCategorySource`: a picked category → `manual`, unchanged keeps its source (an AI pick stays `ai`), none → `none`. `normalized_description` written on save. Fixed a bug in all three forms (accounts, categories, transactions): React 19's automatic form reset after a validation error left controlled selects/radios showing the default while state kept the user's choice; forms now submit via `lib/forms/submit-without-reset`. 6 new E2E flows + regression assertions.
- [x] Batch I (task 21): `domain/ai/provider` (`CategorizationProvider`; items carry only a normalized description, direction and an `amountRange` like "10–100 USD"; categories by name + kind; short per-request keys `t1`/`c1` instead of ids). `domain/categorize/pipeline`: only `source = 'none'` rows (manual and AI untouched), skips number-only descriptions, sends each (direction, description) once and applies the answer to every matching row, batches of 50, a throwing batch leaves its rows uncategorized and the rest continue; answers are dropped when the key is unknown, the category is hidden or of the wrong kind, confidence < 0.5 or not a number, or the item was already answered. `domain/ai/fake-provider` (keyword matcher) for tests and batch J's E2E. 14 unit tests.
- [x] Batch J (tasks 22–23): `server/ai/gemini.ts` calls `models/{model}:generateContent` with `responseSchema` JSON output, `temperature: 0`, key in the `x-goog-api-key` header; retries 429/5xx/network errors up to 3 times (Retry-After, else 1s/2s/4s), 30s timeout, errors carry only the HTTP status. Default model `gemini-3.5-flash-lite` (free tier), `GEMINI_MODEL` overrides. `server/ai/config.ts`: `AI_PROVIDER=fake` → fake, else `GEMINI_API_KEY` → Gemini, else the feature is hidden. **Deviation:** a server action (`server/actions/categorize.ts`) instead of `/api/categorize`, matching the rest of the app. Up to 500 newest uncategorized rows per run; picks saved with `category_source='ai'`, only where the row is still `none`. Rate limit: `public.claim_ai_run()` (security definer, advisory lock, 10 runs/hour/user) over `private.ai_runs`, claimed only when there's work; 7 pgTAP tests. Auto-categorize panel on Transactions (count, privacy note, result message); page `maxDuration = 60`. E2E server runs with `AI_PROVIDER=fake`. `npm run ai:smoke` checks a real key. Manual smoke test with a real free key passed (gemini-3.5-flash-lite, ~1s).
- [x] Batch M (tasks 29–31): `budgets` table (category + currency + positive amount + month stored as its first day; unique per user/category/currency/month; composite FK to the user's category with cascade; a trigger rejects income categories; only `amount_minor` is updatable); 16 pgTAP tests. `domain/budgets/progress` (net spending per category + currency + month, refunds subtract, never below 0, currencies never mixed) and `alerts` (ok < 80% ≤ warning ≤ 100% < over, exact bigint math; banner sentence); 15 unit tests. `/budgets`: month picker in the URL, totals per currency, progress bars with status text, add (category list hides ones already budgeted in the chosen currency), edit amount, delete, "Copy from <last month>" (skips budgets already set). `BudgetAlertBanner` in the app layout for the current month (profile time zone), sharing a per-request cached loader with the page. Shared `positiveAmount` validator. 4 E2E flows.
