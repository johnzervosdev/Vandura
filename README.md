# Vandura

[![CI](https://github.com/johnzervosdev/Vandura/actions/workflows/ci.yml/badge.svg)](https://github.com/johnzervosdev/Vandura/actions/workflows/ci.yml)

**A time-tracking and reporting tool for project managers who live in Excel.**

Teams track time in spreadsheets. At the end of a sprint, a project manager compiles those sheets manually, calculates actuals, and compares them against estimates — a process that takes hours and is prone to mistakes. Vandura replaces that workflow with a web application that imports directly from Excel and generates accurate, up-to-date project reports instantly.

---

## What It Does

**Import timesheets from Excel**
Upload an `.xlsx` file and see a preview of what will be imported before anything is saved. Vandura parses each row, validates the data, flags issues as errors or warnings, and loads all entries into the database in a single transaction. It handles two common Excel timesheet layouts automatically, including weekly-grid formats where days of the week are columns rather than rows.

**Track projects and tasks**
Create projects with estimated hour budgets, break them into tasks with their own estimates, and set statuses. As timesheets are imported, actuals accumulate automatically — no manual rollup required.

**Actuals vs. Estimates Reports**
See exactly where each project stands: estimated hours vs. actual hours spent, broken down by task, with the variance color-coded green (under budget) or red (over budget). Filter by preset date ranges (Last 7 Days, This Month, All Time) or a custom date range. Tasks with no estimate show "N/A" rather than a misleading zero.

**Export to CSV**
One click to download the full report as a formatted spreadsheet, named and timestamped, ready to share with stakeholders.

**Dashboard**
An at-a-glance view of all active projects: total estimated hours, total hours logged, and overall variance — so problem projects surface the moment you log in.

---

## Screenshots

> *Screenshots coming in Phase B — documentation sprint.*

---

## Demo Walkthrough

The full demo path takes about five minutes. After running `npm run db:seed` you'll have sample data loaded.

1. **Dashboard** (`/`) — shows all active projects with estimated hours, actual hours logged, and variance color-coded green or red at a glance.

2. **Create a project** (`/projects/new`) — name it, set an hour budget, add start and end dates. The project appears on the dashboard immediately.

3. **Add tasks** (`/projects/[id]`) — each task gets its own hour estimate. Tasks are managed directly on the project detail page. Add a few with estimates so the report has something to compare against.

4. **Import a timesheet** (`/timesheets/upload`) — upload an `.xlsx` file. Before anything is saved, you see a row-by-row preview, any validation errors that would block the import, and warnings for duplicates or timezone assumptions. Confirm to commit.

5. **View the report** (`/reports/[projectId]`) — estimated vs. actual hours per task, variance in green or red, filterable by date range using presets or a custom range.

6. **Export to CSV** — one button on the report page. The file downloads named and timestamped, ready to open in Excel.

---

## Getting Started

**Requirement:** Node.js 20 or higher ([nodejs.org](https://nodejs.org))

```bash
# 1. Install dependencies
npm install

# 2. Create a local environment file
copy .env.example .env

# 3. Create the database
npm run db:migrate

# 4. (Optional) Load sample data to explore the app
npm run db:seed

# 5. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Windows / OneDrive users

If the dev server hangs or shows chunk-load errors, run with file-system polling:

```powershell
$env:WATCHPACK_POLLING="true"; $env:WATCHPACK_POLLING_INTERVAL="1000"; npm run dev
```

If you see a `ChunkLoadError` after switching Node versions, delete the build cache and restart:

```powershell
Remove-Item -Recurse -Force .next; npm run dev
```

---

## Excel Format

The parser is flexible with column names. The expected layout is:

| Developer | Project | Task | Date | Start Time | End Time | Duration (min) | Notes |
|-----------|---------|------|------|------------|----------|----------------|-------|

Rules:
- Provide either **Duration (min)** or both **Start Time + End Time** — Vandura calculates whichever is missing
- Duration must be a multiple of **15 minutes**
- Missing developers, projects, or tasks are created automatically on import
- Importing the same file twice will create duplicate entries.
- All times are treated as local machine time (no timezone conversion).

Full column rules, date/time detail, and downloadable template: **Timesheets → Upload** (`/timesheets/upload`).

---

## Tech Stack

| Layer | Technology | What it does |
|-------|-----------|--------------|
| Framework | Next.js 15 + React 19 | Full-stack web framework — frontend and backend in one codebase |
| Language | TypeScript | Strict typing throughout; catches bugs at compile time, not runtime |
| API | tRPC | The frontend and backend share the same TypeScript types — no manual API contracts |
| Database | SQLite (`better-sqlite3`) | Embedded database, zero infrastructure, single-file backup |
| ORM | Drizzle | Type-safe database queries with SQL-like syntax and built-in migrations |
| UI | Tailwind CSS + shadcn/ui | Utility-first styling with an accessible component library |
| Validation | Zod | Runtime input validation with full TypeScript inference |

---

## Project Status

**Phase A — Complete ✅**
The full showcase path is functional: create a project → add tasks with estimates → import an Excel timesheet → view the Actuals vs. Estimates report → export to CSV.

**Phase B — In Progress 🚧**
Manual time entry UI, developer management, developer productivity report, Excel format documentation, error handling hardening, and README screenshots.

**Quality Checks**
Automated checks run in GitHub on every push to keep the project stable.

---

## Scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start the development server on [localhost:3000](http://localhost:3000) |
| `npm test` | Run the full test suite (`scripts/run-tests.mjs`; see `van/qa.md` for the file registry and shared-DB cleanup conventions) |
| `npm run type-check` | Run the TypeScript compiler without emitting — catches type errors across the whole project |
| `npm run build` | Production build |
| `npm run db:migrate` | Apply pending database migrations |
| `npm run db:seed` | Populate the database with sample data |
| `npm run db:studio` | Open Drizzle Studio — a browser-based database viewer |

### Running a single test file

```bash
node --import tsx --test tests/date-utils.test.ts
```

Replace `date-utils.test.ts` with any file in the `tests/` folder. The test files use Node's built-in test runner — no additional test framework is needed.

---

## Project Documentation

Vandura was built using a structured process: user stories with acceptance criteria, Definition of Done checklists, QA sign-off per story, and a risk register. The planning and tracking documentation lives in the [`van/`](van/) folder for anyone interested in the project management approach behind the code.

## Technical Documentation

For the full technical breakdown — data model, service layer design, API endpoints, aggregation engine, key engineering decisions, and testing strategy — see [VANDURA_ARCHITECTURE.md](VANDURA_ARCHITECTURE.md).
