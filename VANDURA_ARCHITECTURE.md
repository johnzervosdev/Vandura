# Vandura — Technical Architecture

**Stack:** Next.js 15 · TypeScript · tRPC · SQLite (better-sqlite3) · Drizzle ORM  
**Status:** Phase A complete. Phase B feature set complete (manual entry, developers, productivity, Excel docs, error handling); ongoing work is polish and M2 planning.  
**For context on project status and stories, see** [`van/project.md`](van/project.md)

---

## System Overview

Vandura is a full-stack TypeScript web application built on Next.js 15 App Router. The frontend is React (server + client components). The backend is a tRPC API layer backed by a SQLite database. There is no separate API server — Next.js handles both.

The core data pipeline:

```
Excel Upload → ExcelParser → timesheet.parseExcel / importExcel → TimesheetService.bulkCreateEntries → SQLite
Manual UI   → timesheet.create|update|delete ────────────────────────────────────────────────────────┘
                                                                                    ↓
Dashboard / Reports / Timesheets ← React (App Router) ← tRPC ← Routers ← ReportService / TimesheetService / AggregationEngine
```

---

## Project structure

```
vandura/
├── README.md
├── VANDURA_ARCHITECTURE.md
├── package.json
├── next.config.js
├── drizzle.config.ts
├── tailwind.config.ts
├── .env.example
│
├── public/
│   └── timesheet-template.xlsx        # Blank import template (regenerate: npm run generate:template)
│
├── data/
│   └── vandura.db                     # SQLite (gitignored)
│
├── docs/
│   └── screenshots/                   # README screenshots (optional to refresh)
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # Shell + header nav
│   │   ├── providers.tsx              # tRPC + React Query + GlobalToastProvider
│   │   ├── not-found.tsx              # App Router 404
│   │   ├── page.tsx                   # Dashboard (/)
│   │   ├── globals.css
│   │   ├── api/trpc/[trpc]/route.ts   # tRPC HTTP adapter (POST /api/trpc)
│   │   ├── developers/page.tsx        # Developer list + modals
│   │   ├── projects/
│   │   │   ├── page.tsx               # /projects
│   │   │   ├── new/page.tsx
│   │   │   ├── _components/ProjectForm.tsx
│   │   │   └── [id]/page.tsx, edit/page.tsx, _components/TasksSection.tsx
│   │   ├── timesheets/page.tsx, upload/page.tsx
│   │   └── reports/page.tsx, [projectId]/page.tsx, productivity/page.tsx
│   │
│   ├── components/
│   │   ├── Modal.tsx
│   │   └── GlobalToastProvider.tsx    # Top-right API error toasts (Story 5.1)
│   │
│   ├── lib/
│   │   ├── trpc-client.ts             # createTRPCReact<AppRouter>
│   │   ├── create-app-query-client.ts
│   │   ├── api-error-message.ts
│   │   ├── global-toast-dispatcher.ts
│   │   ├── router-types.ts
│   │   ├── date-utils.ts, validators.ts, …
│   │
│   └── server/
│       ├── db/schema.ts, index.ts, migrations/
│       ├── routers/                   # project, task, developer, timesheet, report → appRouter
│       ├── services/                  # ExcelParser, TimesheetService, AggregationEngine, ReportService
│       ├── trpc.ts                    # initTRPC + errorFormatter → sanitizeTrpcShapeForClient (prod)
│       └── trpc-error-sanitize.ts
│
├── scripts/
│   ├── dev.mjs, migrate.ts, seed.ts
│   └── generate-timesheet-template.mjs
│
└── tests/                             # See van/qa.md for full registry (~18 files, `npm test`)
```

---

## Database Schema

Five tables. Defined in `src/server/db/schema.ts` using Drizzle ORM.

```
┌─────────────┐      ┌─────────────┐      ┌──────────────┐
│  developers │      │  projects   │      │    tasks     │
│─────────────│      │─────────────│      │──────────────│
│ id (PK)     │      │ id (PK)     │      │ id (PK)      │
│ name        │      │ name        │      │ project_id →─┼──→ projects.id
│ email       │      │ description │      │ name         │    (cascade delete)
│ hourly_rate │      │ est. hours  │      │ est. hours   │   (* `estimated_hours` in DB)
│ is_active   │      │ start_date  │      │ status       │
│ created_at  │      │ end_date    │      │ parent_task  │    (self-ref, optional)
│ updated_at  │      │ status      │      │ created_at   │
└─────────────┘      └─────────────┘      └──────────────┘
       │                    │                     │
       │                    └──────────┬──────────┘
       │                               │
       ▼                               ▼
┌──────────────────────────────────────────────────────┐
│                    time_entries                       │
│──────────────────────────────────────────────────────│
│ id (PK)                                              │
│ project_id → projects.id (cascade delete)            │
│ task_id    → tasks.id    (set null on delete)        │
│ developer_id → developers.id (cascade delete)        │
│ start_time (indexed)                                 │
│ duration_minutes  — always a multiple of 15          │
│ description                                          │
│ created_at / updated_at                              │
└──────────────────────────────────────────────────────┘

┌───────────────────────────────────────────┐
│               actuals_cache               │
│───────────────────────────────────────────│
│ id (PK)                                   │
│ project_id, task_id, developer_id (FKs) │
│ period_start / period_end (timestamps)   │
│ total_minutes, entry_count                │
│ calculated_at                             │
└───────────────────────────────────────────┘
```

**Indexes on `time_entries`:** composite `(project_id, start_time)`, composite `(developer_id, start_time)`, `task_id`, `start_time` — these are the hot paths for report queries.

**Cascade behavior:**
- Deleting a project cascades to tasks and time entries
- Deleting a task sets `task_id` to null on orphaned time entries (entries are preserved)
- Deleting a developer cascades to their time entries

---

## Service Layer

Four services in `src/server/services/`. They do not depend on tRPC — they are plain TypeScript classes callable from anywhere.

### ExcelParser.ts

Ingests `.xlsx` / `.xls` files uploaded via the web UI.

1. Reads the workbook using the `xlsx` library
2. **Layout detection:** checks for a weekly-grid format (Mon/Tue/Wed/Thu/Fri as column headers with a duration row per developer/project/task combination). If detected, converts to standard row-per-entry format before processing.
3. Maps column headers case-insensitively to expected fields
4. Validates each row: required fields, duration as multiple of 15, valid dates
5. Lookups by name for developer, project, task — creates missing entities if not found
6. Returns a parse result: `{ rows, errors, warnings }` for the preview step before committing

### TimesheetService.ts

CRUD for time entries. The key method is `bulkCreateEntries`:

```typescript
// Inserts up to N entries in batched transactions (1000 rows/batch)
// Uses better-sqlite3's synchronous API: .returning().all() within db.transaction()
// This avoids the async/iterator mismatch that would occur with the promise-based driver
bulkCreateEntries(entries: NewTimeEntry[]): TimeEntry[]
```

The synchronous transaction pattern is important — `better-sqlite3` uses a blocking synchronous API by design. Attempting to use `async/await` or spread a Drizzle `.returning()` promise inside the transaction causes a runtime error. The fix is `.returning().all()` to force synchronous execution and get back an array.

### AggregationEngine.ts

Queries `time_entries` for a given project and date range, joins with task estimates, and calculates variance.

Key design decision: `task.estimatedHours` is preserved as `null` (not coerced to `0`) when no estimate exists. This allows the UI to distinguish between "estimated 0 hours" and "no estimate set" — a real difference in meaning. Using `|| 0` was a bug that caused all unestimated tasks to show a false 0-variance.

```typescript
const estimatedHours = task.estimatedHours ?? null;
const variance = estimatedHours === null ? 0 : actualHours - estimatedHours;
const variancePercentage =
  estimatedHours !== null && estimatedHours > 0
    ? (variance / estimatedHours) * 100
    : 0;
```

### ReportService.ts

Formats aggregation output for the tRPC response and handles CSV generation. The CSV export uses string formatting (no third-party CSV library) with correct comma escaping for fields that may contain commas or quotes.

---

## API Layer (tRPC)

All API calls go through tRPC, served at **`/api/trpc`** via `src/app/api/trpc/[trpc]/route.ts` (`fetchRequestHandler`). The React client uses **`@trpc/react-query`** (`useQuery`, `useMutation`) with a shared **`QueryClient`** (`src/lib/create-app-query-client.ts`: global toast hooks on `QueryCache` / `MutationCache`). **`superjson`** preserves `Date` values across the wire.

### Routers (`src/server/routers/`)

**`project`**
- `list`, `get`, `create`, `update`, `delete`

**`task`**
- `listByProject`, `get`, `create`, `update`, `delete`

**`developer`**
- `list` (optional `activeOnly`), `get`, `create`, `update`, `delete` *(UI uses soft lifecycle via `isActive`; hard delete exists on router for admin-style use)*

**`timesheet`**
- `list` — paginated entries + filters
- `create` / `update` / `delete`
- `parseExcel` / `importExcel` — preview vs commit (`TimesheetService.bulkCreateEntries`)

**`report`**
- `projectsSummary` — dashboard + `/reports` table
- `actualsVsEstimates` — `/reports/[projectId]` task breakdown + presets
- `developerProductivity` — `/reports/productivity`
- `timeline` — chart-oriented series *(wired for future UI)*
- `exportCSV` — CSV download for current report filters

---

## Client errors & production responses (Story 5.1)

- **`GlobalToastProvider`** + **`emitGlobalToast`** — user-visible API failures default to a **top-right** dismissible card; queries/mutations pass **`meta.suppressGlobalError`** / **`meta.suppressGlobalToast`** when a page or modal already shows the failure inline (see `van/stories.md` Story 5.1 matrix).
- **`trpc-error-sanitize.ts`** — in **`NODE_ENV === 'production'`**, database-looking failures and leaky **`INTERNAL_SERVER_ERROR`** messages are replaced with a generic client-safe string; **`BAD_REQUEST` + Zod** shapes are preserved for forms.

---

## Key Engineering Decisions

**SQLite over PostgreSQL**
Zero cost, zero infrastructure, single-file backup. SQLite handles the required data scale (100K+ time entries) with sub-100ms aggregation queries. The migration path to Turso/libSQL (SQLite-compatible, cloud-hosted) is a config change — no schema changes required.

**tRPC over REST**
The frontend and backend share TypeScript types automatically. No OpenAPI spec, no Swagger, no manual type definitions for API responses. If a backend return type changes, the TypeScript compiler catches every broken frontend usage at build time.

**Drizzle over Prisma**
`better-sqlite3` uses a synchronous blocking API (intentional — SQLite is single-writer). Drizzle's query builder works naturally with this model. Prisma's async-first design creates friction with `better-sqlite3` synchronous transactions. Drizzle also has a smaller runtime footprint and SQL-like syntax that maps more directly to what the database executes.

**`superjson` as tRPC transformer**
JSON serialization loses JavaScript `Date` objects (they become ISO strings). Without a transformer, every date coming from the API would need to be re-parsed on the client. `superjson` handles this transparently — dates arrive as `Date` objects.

**Parse preview before commit**
The Excel import is a two-step operation: parse (validate + preview) → import (commit). The user sees a summary of what will be imported, any errors that would block the import, and any warnings (duplicates, timezone assumptions) before a single row is written to the database. Errors block the import entirely; warnings allow proceeding with acknowledgment.

**Weekly-grid layout detection**
Real client Excel files often use a weekly-grid format: one row per developer/project/task, with Monday through Friday as columns containing duration values. The parser detects this layout heuristically (looking for day-of-week headers) and converts each cell to a standard row-based entry before validation.

**No import deduplication in M1**
Allowing duplicate imports keeps the parser simple and avoids false-positive dedup logic. A developer uploading the same file twice is an operator error, not a system problem to solve in M1. An import history / audit log is planned for M2.

---

## Date and Duration Handling

All dates are treated as **local machine time** — no UTC conversion, no timezone offset. This matches how Excel stores dates (as floating-point numbers with no timezone) and how the target users expect the data to behave.

Duration is always stored as `duration_minutes` (integer, always a multiple of 15). The `date-utils.ts` module provides:
- `isValidDuration(minutes)` — validates the 15-minute increment rule
- `getPresetRange(preset)` — returns `{ start, end }` for named presets (Last 7 Days, This Month, etc.)
- `startOfDay` / `endOfDay` — date boundary helpers used in report filtering

---

## Testing strategy

**Runner:** `npm test` → `scripts/run-tests.mjs` → `node --import tsx --test tests/*.test.ts`  
**Registry & DB hygiene:** [`van/qa.md`](van/qa.md) lists every file, shared-`vandura.db` cleanup expectations, and FK delete order for parser/router tests.

Coverage includes Excel parser/grid suites, project/task/timesheet routers, report + export paths, **`tests/trpc-error-sanitize.test.ts`**, Story 3.3 template/upload checks, and developer productivity metrics.

---

## What is built vs. planned

**Phase A — Complete**  
Excel → preview → import, tasks, actuals report, CSV, dashboard.

**Phase B — Complete**  
Manual timesheets UI, developers + active flag, developer productivity report, Excel in-app documentation + `public/timesheet-template.xlsx`, global error handling + `not-found`, README/screenshots and this architecture pass (Story 5.2).

**Deferred (post-MVP)**  
Import dedupe + audit log, **Story 1.2** dev-server hardening (`dev:win` / `dev:clean`), parse-preview remediation (Story 3.4).

---

*Last Updated: 2026-04-12 — routers, repo tree, client error pipeline, Phase B status.*
