# Vandura — Technical Architecture

**Stack:** Next.js 15 · TypeScript · tRPC · SQLite (better-sqlite3) · Drizzle ORM  
**Status:** Phase A complete. Phase B in progress.  
**For context on project status and stories, see** [`van/project.md`](van/project.md)

---

## System Overview

Vandura is a full-stack TypeScript web application built on Next.js 15 App Router. The frontend is React (server + client components). The backend is a tRPC API layer backed by a SQLite database. There is no separate API server — Next.js handles both.

The core data pipeline:

```
Excel Upload → ExcelParser → TimesheetService (bulk insert) → SQLite
                                                                  ↓
Dashboard / Reports ← React Components ← tRPC ← ReportService ← AggregationEngine
```

---

## Project Structure

```
vandura/
├── README.md
├── VANDURA_ARCHITECTURE.md
├── package.json
├── tsconfig.json
├── next.config.ts
├── drizzle.config.ts
├── tailwind.config.ts
├── .env.example
│
├── data/
│   └── vandura.db                     # SQLite database file (gitignored)
│
├── src/
│   ├── app/                           # Next.js App Router (pages + API)
│   │   ├── layout.tsx                 # Root layout
│   │   ├── page.tsx                   # Dashboard (/)
│   │   ├── api/trpc/[trpc]/route.ts   # tRPC HTTP handler
│   │   ├── projects/
│   │   │   ├── page.tsx               # Project list (/projects)
│   │   │   ├── new/page.tsx           # Create project
│   │   │   ├── _components/           # Shared project UI components
│   │   │   └── [id]/
│   │   │       ├── page.tsx           # Project detail + tasks
│   │   │       ├── edit/page.tsx      # Edit project
│   │   │       └── _components/       # TasksSection modal components
│   │   ├── timesheets/
│   │   │   ├── page.tsx               # Time entries list (/timesheets)
│   │   │   └── upload/page.tsx        # Excel import UI (/timesheets/upload)
│   │   └── reports/
│   │       ├── page.tsx               # Project summaries (/reports)
│   │       └── [projectId]/page.tsx   # Actuals vs Estimates + CSV export
│   │
│   ├── components/
│   │   └── ui/                        # shadcn/ui primitives (Button, Modal, etc.)
│   │
│   ├── lib/
│   │   ├── date-utils.ts              # Duration validation, preset ranges, week helpers
│   │   └── trpc.ts                    # tRPC React client setup
│   │
│   └── server/
│       ├── db/
│       │   ├── schema.ts              # Drizzle schema — 5 tables
│       │   ├── index.ts               # Database client singleton
│       │   └── migrations/            # SQL migration files (Drizzle Kit generated)
│       ├── routers/
│       │   ├── index.ts               # Root router (appRouter)
│       │   ├── project.ts
│       │   ├── task.ts
│       │   ├── developer.ts
│       │   ├── timesheet.ts
│       │   └── report.ts
│       ├── services/
│       │   ├── ExcelParser.ts         # .xlsx ingestion, validation, weekly-grid conversion
│       │   ├── TimesheetService.ts    # Time entry CRUD + bulk insert transaction
│       │   ├── AggregationEngine.ts   # Actuals aggregation + variance calculation
│       │   └── ReportService.ts       # Report formatting + CSV generation
│       └── trpc.ts                    # tRPC server initialization + context
│
├── scripts/
│   └── seed.ts                        # Sample data seeding
│
└── tests/
    ├── date-utils.test.ts
    ├── report-projects-summary-error.test.ts
    ├── timesheet-bulkCreate.test.ts
    └── timesheet-sample-extract.test.ts
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
│ hourly_rate │      │ est_hours   │      │ est_hours    │
│ is_active   │      │ start_date  │      │ status       │
│ created_at  │      │ end_date    │      │ parent_task  │    (self-ref, unused M1)
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
│ project_id, task_id, developer_id (FKs)   │
│ period_start / period_end                 │
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

All API calls go through tRPC, served at `/api/trpc/[trpc]`. The client uses React Query under the hood (`useQuery`, `useMutation`). `superjson` is used as the transformer to preserve `Date` objects across the network boundary (plain JSON would serialize them as strings).

### Routers

**`project`**
- `list` — all projects with aggregated actuals summary
- `get` — single project with tasks
- `create` / `update` / `delete`

**`task`**
- `list` — tasks for a project
- `create` / `update` / `delete`

**`developer`**
- `list` — all developers (active filter available)
- `create` / `update`

**`timesheet`**
- `list` — paginated time entries with filters (project, developer, date range)
- `create` / `update` / `delete`
- `parseExcel` — parses an uploaded file, returns preview data (no DB write)
- `importExcel` — takes the validated parse result and calls `bulkCreateEntries`

**`report`**
- `projectsSummary` — all projects with total estimated/actual hours and variance (dashboard + reports list)
- `actualsVsEstimates` — task-level breakdown for a single project with date range filter
- `exportCsv` — formatted CSV string for the active report view

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

## Testing Strategy

**Runner:** Node.js built-in test runner (`node --import tsx --test`)  
**Philosophy:** Critical paths only — no framework overhead, no test coverage theater.

| File | What it covers |
|------|---------------|
| `date-utils.test.ts` | Duration validation, preset range calculation, week boundary helpers |
| `timesheet-bulkCreate.test.ts` | Regression for the bulk insert spread error; confirms `bulkCreateEntries` returns an array |
| `timesheet-sample-extract.test.ts` | ExcelParser weekly-grid detection; synthetic workbook validates layout conversion without needing a real client file in CI |
| `report-projects-summary-error.test.ts` | Regression for the SQL alias error that caused the project summary query to fail on load |

Integration tests for `parseExcel` / `importExcel` (end-to-end with a real file) are deferred to Phase B.

---

## What's Built vs. Planned

**Phase A — Complete**
Full demo path operational: project management, task management, Excel import with preview, Actuals vs. Estimates report, CSV export, dashboard.

**Phase B — In Progress**
Manual time entry UI (Story 3.1), developer management UI (Story 2.3), developer productivity report (Story 4.3), Excel format documentation + template (Story 3.3), error handling hardening (Story 5.1), README screenshots + architecture review (Story 5.2).

**Deferred (Post-MVP)**
Import deduplication + audit log, dev server stability scripts (Windows/OneDrive), parse preview remediation tools.

---

*Last Updated: 2026-03-15*
