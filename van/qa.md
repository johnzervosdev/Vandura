# Project Vandura — QA Strategy, Test Plans & Results

**Last Updated:** 2026-04-17 (Story 6.6 Hannibal sign-off; Story 5.2 sign-off; Phase C Murdock pointer; automated registry)  
**Owner:** Murdock

> **Navigation:** [`van/project.md`](project.md) — project dashboard | [`van/stories.md`](stories.md) — story ACs & QA checklists

---

## Test Strategy

### Critical Paths (Must Test)
1. **Excel Import Flow**
   - Valid file → parse → preview → import → verify DB entries
   - Invalid file → parse errors → import blocked
   - Edge cases: empty file, malformed dates, missing columns

2. **Aggregation Engine**
   - Time entries → aggregated actuals → variance calculation
   - Date range filtering
   - Multiple developers/tasks/projects

3. **Report Generation**
   - Actuals vs Estimates accuracy
   - CSV export correctness
   - Date range presets behavior
   - Developer productivity: totals, distinct project/task counts, avg hours per logging day vs date range

### Nice-to-Test (If Time Permits)
- Form validation (manual time entry, project creation)
- Navigation flows
- Empty states
- Error handling UX

### Testing Approach
- Manual testing during Phase A (fast iteration)
- Automated tests for critical paths in Phase B (if time)
- Murdock documents test cases + results in this file

### Phase C (planned — QA)
Per-story testing focus and an **informal Murdock time rollup (~12–18h for Stories 6.1–6.6**, excluding **7.x** import pack unless triaged) live in **`van/stories.md` → Phase C → `QA / Murdock — Phase C`**. As stories land, add evidence rows or a short sign-off block in this file.

#### Story 6.6 — Hannibal sign-off
- **Product:** Approved — “likes the page.”
- **Automated:** `tests/story-6-6-developers-productivity-link.test.ts` (link label, `href`, `next/link`, Hannibal subline copy, top-band order vs **Add Developer**).
- **Optional follow-ups (not 6.6 blockers):** (1) **Duplicate h1** — shell `layout` **h1** “Vandura” + per-page **h1** is an **existing** app pattern; a **single-h1** / landmark cleanup would be a **global** story. (2) **Visual hierarchy** — secondary report link vs primary **Add developer** CTA: **intentional**; no change.

---

## Automated Test Registry

### How to Run
- **Command:** `npm test`
- **Runner:** `scripts/run-tests.mjs` (runs every `tests/*.test.ts` via `node --import tsx --test`)
- **Note:** Node's test runner does not auto-discover `*.test.ts` by directory alone; the runner is required to avoid missing tests.
- **Support module (not a test file):** `tests/parser-db-cleanup.ts` — shared helpers used by `excel-parser.test.ts` and `excel-grid.test.ts` to delete developer/project/task rows that `ExcelParser` creates in **import** mode against `./data/vandura.db`.

### Shared database hygiene (automated tests)
- Several suites use the **app singleton** (`import { db } from '../src/server/db'` → `./data/vandura.db`). Any test that inserts rows there must **`try` / `finally` delete** those rows (FK order: time entries → tasks → projects → developers as applicable).
- **`ExcelParser`** defaults to **import** mode: `getOrCreate*` runs **before** duration validation, so “negative” row tests can still persist rows unless cleaned up. **`parseFile`** defaults the same way — weekly-grid tests that import `parseFile` without `{ mode: 'preview' }` also persist.
- **`projectRouter` / `taskRouter` first-create tests** use a temp SQLite file for most assertions but can hit the **real** DB when the router succeeds; those tests use **unique names** and **`finally` cleanup** on the shared DB.
- Isolated DB tests (`createTestDb()` + `unlink`) do not touch `vandura.db` for inserts.

### Current Test Files

| File | Coverage | Status |
|------|----------|--------|
| `tests/date-utils.test.ts` | `calculateDuration`, `isValidDuration`, `getPresetRange` | ✅ Passing |
| `tests/developer-router.test.ts` | Developer schema + isolated-DB queries (active-only, toggle `isActive`) | ✅ Passing |
| `tests/excel-grid.test.ts` | Weekly grid `parseFile` (Mon–Fri + Hours column); preview-mode JZER/Variable-style project validation; **import-mode tests clean up via `parser-db-cleanup`** | ✅ Passing |
| `tests/excel-parser.test.ts` | Row `parseRows` + `parseFile` (dates, durations, preview vs import, case-sensitive tasks); **shared DB cleanup in `finally`** | ✅ Passing |
| `tests/project-router.test.ts` | Story 2.1: project CRUD against temp DB; **create-via-router path cleans shared DB**; cascade test **deletes orphan developer + any leftover rows in `finally`** before unlink | ✅ Passing |
| `tests/project-validation.test.ts` | `createProjectSchema` (name, estimated hours, status enum) | ✅ Passing |
| `tests/report-developer-productivity.test.ts` | Story 4.3: `report.developerProductivity` + `getDeveloperProductivity` — smoke, inactive omitted, inclusive dates, metrics, null `taskId`, empty-range row, tRPC args; **`finally` cleanup** | ✅ Passing |
| `tests/report-projects-summary-error.test.ts` | `reportRouter.projectsSummary` SQL alias regression (Issue #4) | ✅ Passing |
| `tests/report-router.test.ts` | `exportCSV` filename + mocked actuals | ✅ Passing |
| `tests/report-service.test.ts` | `exportToCSV` escaping / zero estimates | ✅ Passing |
| `tests/task-router.test.ts` | Story 2.2: tasks + time-entry cascade on temp DB; **create-via-router path cleans leaked task on shared DB**; delete-task test **clears entry / project / developer in `finally`** before unlink | ✅ Passing |
| `tests/task-validation.test.ts` | `createTaskSchema` | ✅ Passing |
| `tests/time-entry-validation.test.ts` | `createTimeEntrySchema` (15-minute rule, positive duration) | ✅ Passing |
| `tests/timesheet-bulkCreate.test.ts` | `TimesheetService.bulkCreateEntries` + **`finally` cleanup** (all returned entry IDs via `inArray`) (Issue #9) | ✅ Passing |
| `tests/timesheet-router-excel.test.ts` | Story 3.2: `parseExcel` / `importExcel` with **mocked** `parseFile` + `bulkCreateEntries` | ✅ Passing |
| `tests/timesheet-sample-extract.test.ts` | Weekly-grid sample extraction (JZER-style; synthetic workbook); **preview-mode** | ✅ Passing — Known Issue #3 |
| `tests/story-3-3-excel-format-docs.test.ts` | Story 3.3: `public/timesheet-template.xlsx` shape, preview parse of template, upload page DoD strings | ✅ Passing |
| `tests/story-6-6-developers-productivity-link.test.ts` | Story 6.6: `/developers` → `/reports/productivity` (`next/link`, label, subline, **Add Developer** band order) | ✅ Passing |
| `tests/story-5-1-global-errors.test.ts` | Story 5.1: `getApiErrorMessage`, `createAppQueryClient` global query/mutation handlers + toast dedupe | ✅ Passing |
| `tests/trpc-error-sanitize.test.ts` | Story 5.1: `sanitizeTrpcShapeForClient` production heuristics (INTERNAL unsafe/safe, BAD_REQUEST+zod, SQLite cause) | ✅ Passing |
| `tests/validators.test.ts` | Schema validation (createProject, createTask, createTimeEntry) | ✅ Passing |

**Suite status:** **96/96** passing — **21** test files under `tests/*.test.ts` (last full run: Story **6.6** contract tests expanded).

**Story 5.1 production sanitize sign-off:** Hannibal — **`tests/trpc-error-sanitize.test.ts` green in CI** plus **code review** of the production error path satisfies sign-off **layer (2)**. A separate `next build` + `next start` + forced failure smoke is **optional** (nice-to-have), not a second gate. Full wording: **`van/stories.md` → Story 5.1** (AC, Murdock checklist, **QA expectations — Hannibal**).

### Documentation screenshots (Story 5.2 — asset registry)
Committed paths under **`docs/screenshots/`** (referenced from **README** / docs as Story 5.2 lands):

| File | Typical use |
|------|-------------|
| `docs/screenshots/dashboard.png` | Dashboard |
| `docs/screenshots/excel-upload.png` | Excel upload / timesheets |
| `docs/screenshots/actuals-report.png` | Actuals vs estimates report |

**Screenshot hygiene:** **`excel-upload.png`** was recaptured (full-page, no global toast) via local dev + browser tooling; rerun after UI changes. No CI step validates pixels.

### Story 5.2 — README / doc smoke (Hannibal → Murdock, evidence on record)

**README as a test (clean-clone / fresh machine):** Getting started, Scripts, and walkthrough were checked against `package.json` and repo layout.

| Check | Result |
|-------|--------|
| `npm install` / Node 20+ | Matches `engines` and README |
| `.env` from example | **README fix:** the shared `bash` block previously used Windows-only `copy`; it now documents **`cp .env.example .env`** for macOS/Linux/Git Bash and **`copy` / `Copy-Item`** for Windows so Unix clones are not misled |
| `npm run db:migrate`, `db:seed`, `dev`, `db:generate`, `generate:template` | All listed in README; scripts and paths (`scripts/migrate.ts`, `public/timesheet-template.xlsx`, etc.) exist |
| Screenshot markdown paths | `docs/screenshots/{dashboard,excel-upload,actuals-report}.png` — files **present** |
| Walkthrough URLs | Align with App Router routes in README |

**Screenshots vs live UI (no stale chrome):** Hannibal expects pixels to match current theme. **`excel-upload.png`** is already on record as recaptured without toast (see above). **`dashboard.png`** / **`actuals-report.png`** — not re-captured in this doc-smoke pass; **recapture when chrome or theme drifts** (README already notes optional polish).

### Story 5.2 — Hannibal sign-off (2026-04-17)

**Story status (`van/stories.md`):** Story 5.2 set to **Complete** (handoff label was “Ready for QA”).

**Screenshots (asset judgment):** **`excel-upload.png`** remains the **pixel-fresh** reference (full-page, no global toast — Murdock on record). **`dashboard.png`** and **`actuals-report.png`** are **accepted for M1 portfolio README** as shipped with 5.2 — not re-captured in the latest doc-smoke pass; **recapture when primary nav or theme drifts materially** (README already allows optional polish).

**GitHub README images:** README uses repo-relative `docs/screenshots/*.png` links; files **exist in-tree** (Murdock doc-smoke table). A separate “clicked through on github.com” session was **not** logged in QA; **post-push ops:** open default-branch README on GitHub once and confirm all three images render (standard Markdown behavior).

**`VANDURA_ARCHITECTURE.md` (5.2 accuracy):** Hannibal **spot-check** of B.A.’s refresh vs current repo: stack, App Router + tRPC, SQLite/Drizzle, core services (`TimesheetService`, `ExcelParser`, `ReportService`, `AggregationEngine`), and testing/CI framing vs `scripts/run-tests.mjs` / this file. **No conflicting claims** surfaced during sign-off.

**Automated suite:** **`npm test`** — **96/96** passing, last run after Story **6.6** (developers → productivity link test).

### Next Test Targets (Deferred to Phase B)
The following were explicitly deferred during Phase A — known debt, not a blocker:
- Deeper **`timesheet.parseExcel` / `timesheet.importExcel`** integration against a real workbook + real DB (current router tests rely on mocks).
- Additional ExcelParser edge cases not yet encoded (e.g. more unsupported date/time shapes, missing-column layouts) — many duration/date paths are already covered in `excel-parser.test.ts`.

---

## Phase A Test Plan

### Scope
- Demo path: Create project → Add tasks → Import Excel → View report → Export CSV
- Story coverage: 2.1, 2.2, 3.2, 4.2, 4.4, 4.1

### Critical Path Test Cases

**1. Project CRUD (Story 2.1)**
- Create project with required fields and estimatedHours = 0 → saved successfully, UI shows "0h"
- Create project with negative estimatedHours → blocked with validation error
- Edit project fields (name, dates, status) → changes persist
- Delete project → associated tasks and time entries removed (cascade)

**2. Task Management (Story 2.2)**
- Create task under project → appears in task table
- Edit task details → updates persist
- Delete task → removed from project view
- Task list filtered to current project only

**3. Excel Import Happy Path (Story 3.2)**
- Valid file with supported formats → parse preview shows first 10 rows
- Parse summary shows correct counts (entries, errors, warnings)
- Import button enabled when errors = 0
- Import succeeds in one transaction and shows success message
- Auto-create missing developer/project/task

**4. Excel Import Error Handling (Story 3.2)**
- File with 1 invalid row among valid rows → import blocked (strict failure)
- Invalid duration (not multiple of 15) → parse error with row number and duration
- Unsupported date format → parse error with row number and value
- Empty file or missing required columns → parse error and no import

**5. Reports (Story 4.2, 4.4)**
- Actuals vs estimates matches seeded/imported totals
- Variance coloring: green under, red over
- Date range presets + custom range filter results correctly
- Empty state shown when no time entries
- CSV export opens in Excel and contains summary + task breakdown
- CSV filename matches `actuals-report-{projectName}-{timestamp}.csv`

**6. Dashboard (Story 4.1)**
- Summary cards show totals (projects, estimated, actual, variance)
- Active projects table shows variance indicators
- Empty state shows when no projects exist
- Quick actions navigate to Upload, Create Project, Reports

### Excel Import Edge Cases (Required)
- Date formats: ISO, US, EU, hyphen, Excel serial
- Time formats: 24-hour, 12-hour with AM/PM, 4-digit (0900)
- Combined datetime in single cell
- Case-sensitive task matching: "Design" vs "design" create two tasks
- Duration multiple of 15 enforcement on import
- Duplicate rows allowed (import twice → duplicates exist)
- Zero-duration rows (duration 0) must error and block import

### Test Data Requirements
- Example timesheet in `/public/timesheet-template.xlsx`
- Real-data samples stored in `/public/examples/` and gitignored
- At least one project with estimated hours 0
- At least one task with null estimated hours
- Sample file with mixed valid/invalid rows for strict failure test
- Sample file with unsupported formats for negative tests

### Expected Results Summary
- No partial imports on errors (all or nothing)
- Errors list includes row numbers + reason
- Warnings do not block import
- Reports match aggregated totals and variance calculations
- UI shows clear empty states and validation messages

### Blockers / Dependencies
- Story 2.2 tasks UI must exist before task tests ✅ (done)
- Parse preview + error summary UI required for Excel tests ✅ (done)
- Reporting filters and sorting UI needed for report tests — pending Story 4.2
- Example Excel template file provided and stored in `/public` (`timesheet-template.xlsx`) — Story 3.3 ✅

---

## Existing Code QA Targets

1. **ExcelParser (`src/server/services/ExcelParser.ts`)**
   - Date parsing: ISO, US, EU, hyphen formats, ISO with time
   - Excel serial dates (number)
   - Time parsing: 24h, 12h (AM/PM), 4-digit (0900)
   - Duration rules: > 0 and multiple of 15
   - Strict failure on any row error
   - Task matching is case-sensitive

2. **TimesheetService + Validators**
   - `createTimeEntrySchema` and `bulkCreate` validation align with 15-minute rule
   - Zero-duration rows must error (import blocked)

3. **Project/Task Validators**
   - `createProjectSchema` and `createTaskSchema` allow estimatedHours = 0 or null

4. **AggregationEngine**
   - Actuals vs estimates calculations with null/0 estimates
   - Date range filtering (start/end boundaries)

5. **ReportService**
   - CSV export formatting and escaping
   - CSV filename format matches AC (`actuals-report-{projectName}-{timestamp}.csv`)

6. **tRPC Routers**
   - `timesheet.parseExcel` returns preview + errors/warnings
   - `timesheet.importExcel` blocks on any errors and imports all-or-nothing

---

## QA Results by Story

### Story 2.1 — Manage Projects ✅
- Automated tests (tRPC + validation): PASS
- Code review (create/edit/delete/status UI wiring): PASS
- Manual UI: PASS

### Story 2.2 — Manage Tasks ✅
- All QA checklist items: PASS (see van/stories.md for checklist)
- Regression after Modal + TasksSection refactor: PASS

### Story 3.2 — Excel Import ✅
- All QA checklist items: PASS
- Bulk insert regression test (`tests/timesheet-bulkCreate.test.ts`): PASS
- Weekly-grid JZER-style layout validation (`tests/timesheet-sample-extract.test.ts`): PASS
- Suite: **76/76** green (`npm test`)

### Story 4.2 — Actuals vs Estimates Report ✅
- Status: QA complete
- Test data: Seeded project `OPS` (projectId: 408)
- Expected totals baseline:
  - Time entries: 3
  - Total minutes: 45
  - Total hours: 0.75 (UI rounds to 0.8h)
- What was tested:
  - Presets: Last 7 Days, Last 30 Days, This Month, All Time
  - Custom range: 2001-11-30 → 2001-12-01
  - Variance color coding (under = green, over = red)
  - Sorting on task table columns
  - Empty state when no entries in range
- Initial failures found:
  - Reports list showed error toast on load
  - OPS custom range showed empty state / zero actuals despite known entries
  - Summary variance was inconsistent with task variance when estimates were null
- Fix verification:
  - Reports list loads without error toast
  - OPS custom range shows actuals (0.8h) and task row present
  - Summary variance aligns with task-level variance and handles null estimates

### Story 4.4 — Export CSV ✅
- Status: QA complete
- What was tested:
  - Filename format: `actuals-report-{projectName}-{timestamp}.csv`
  - CSV contains project summary + task breakdown
  - CSV opens in Excel with correct escaping
- Results (OPS, custom range 2001-11-30 → 2001-12-01):
  - Total Estimated Hours: N/A
  - Total Actual Hours: 0.75
  - Task row: "Timesheet", estimated 0, actual 0.75, variance 0.75

### Story 4.1 — Dashboard Polish
- Status: QA complete
- Summary cards present: Total projects, estimated hours, actual hours, variance ✅
- Variance color coding in summary cards: green for negative variance ✅
- Active projects table present with variance column and color indicators ✅
- Quick action cards present: Upload Timesheet, Create Project, View Reports ✅
- Empty state verified: "No active projects. Create one to get started." ✅

### Story 3.1 — Manual Time Entry ✅
- Status: QA complete
- List view: columns correct; most recent first; pagination controls disabled with < 100 rows ✅
- Filters verified:
  - Project filter reduces rows ✅
  - Developer filter reduces rows ✅
  - Presets: Last 7 Days, All Time ✅
  - Custom date range overrides preset ✅
  - Empty state text: "No time entries found." ✅
- Create modal: required validation, active-only developer dropdown, task filter/reset, duration increments (15–480), manage developers link ✅
- Edit modal: pre-filled fields and successful update ✅
- Delete modal: exact confirm copy ("Delete this time entry? This cannot be undone.") and removal ✅
- Developer dropdown fix re-verified after B.A. update; modal shows active developers only; list filter retains all developers for historical filtering ✅

### Story 2.3 — Manage Developers ✅
- Status: QA complete (empty states accepted on PM code review — logic is trivial and strings match AC)
- Default view: Active only ✅
- Toggle behavior: Active only / All updates table without reload ✅
- Columns: Name, Email, Hourly Rate, Status, Actions ✅
- Create modal validations: name required, email format, hourly rate >= 0 (0 accepted) ✅
- Edit modal prefill and save update ✅
- Deactivate confirm copy matches spec ✅
- Reactivate without confirm ✅
- No delete option present ✅
- Integration: Manage developers link from timesheets navigates to `/developers` ✅
- Empty states not verified (no zero-dev dataset) ⚠️

### Story 3.3 — Excel Format Docs ✅
- **Status:** QA complete (2026-04-12). **Automated:** `tests/story-3-3-excel-format-docs.test.ts` — template `public/timesheet-template.xlsx` (xlsx read: eight canonical headers + 15 in sample row), `parseFile` preview smoke (≥1 row and/or invalid-project path), upload `page.tsx` string assertions (exact duplicate + timezone lines, template link, section headings, date bullets). **Suite:** 79/79.
- **Manual:** layout / mobile width / consolidation — pass per Murdock checklist.

| Murdock checklist (manual) | Result |
|----------------------------|--------|
| Readable on narrow width | **Pass** |
| Template link + parse honesty | **Covered by automation + manual spot-check** |
| Duplicate + timezone visible | **Pass** (matches exact strings in tests) |
| No triple duplicate prose | **Pass** |

### Story 4.3 — Developer Productivity Report ✅
- **Status:** QA complete (2026-04-12, Murdock). Dev server: `http://localhost:3001` (port may differ locally).
- **Automated:** `tests/report-developer-productivity.test.ts` — integration tests on shared DB (`finally` cleanup) plus smoke; Excel/parser suites use `tests/parser-db-cleanup.ts` where `ExcelParser` writes to `vandura.db`. Full suite **`npm test`** → **76/76** (17 `*.test.ts` files).

| Checklist item | Result | Notes |
|----------------|--------|--------|
| `/reports` → productivity navigation | **Pass** | Link label **Developer productivity →** present; `href="/reports/productivity"` in `src/app/reports/page.tsx`. Embedded browser: single click did not navigate (tooling); **Enter** on focused link navigated correctly — recommend one manual mouse click sanity check. |
| Default load / active developers table | **Pass** | `/reports/productivity` loads; headers include Developer name (↑ default A→Z), Total hours, Project count, Task count, Avg Hours/Active Day, Entries. |
| Presets change totals | **Pass** | **Last 7 Days** updates custom start/end (e.g. 2026-04-06 … 2026-04-12 vs “today”); table repopulates. |
| Custom range / Actuals parity | **Pass** | Productivity page uses same `startDate ? startOfDay(startDate)` / `endDate ? endOfDay(endDate)` pattern as `src/app/reports/[projectId]/page.tsx`. |
| Sorting all columns + toggle | **Pass** | **Total hours** tested: first activation **↓**, second click **↑**; all six columns exposed as sort header buttons. |
| Tooltip exact copy | **Pass** | `AVG_DAY_TOOLTIP` in `src/app/reports/productivity/page.tsx` matches spec character-for-character; `title` on `<th>` (not on inner `<button>` — a11y snapshot had no `title` on button). **Manual hover** still advised to confirm OS tooltip. |
| Empty state (no entries in range) | **Pass** | Custom range **2099-01-01** … **2099-01-31** → message **No time entries in this range.** (no all-zero table). |
| Spot-check project/task counts | **Pass** | For **Last 7 Days** (`new Date()` on QA machine), developer **John Zervos**: `getDeveloperProductivity` vs raw SQL `COUNT(DISTINCT project_id|task_id|*)` on `time_entries` with unix range — **3 / 12 / 22** = **3 / 12 / 22**. |
| No active developers empty UI | **Not run** | Local DB always had active developers; strings verified in source (**No active developers.**). |

- **Findings:** None blocking. Optional: confirm in-page link navigation with a normal mouse click outside automation.

---

## Portfolio QA Checklist (Phase A)

- CI is green for `npm test` on the main branch
- Demo path works end-to-end (create project → add tasks → import Excel → view report → export CSV)
- Known limitations and Phase B scope are documented
- Real-data samples are gitignored and no PII is committed
- QA results per story are captured with pass/fail status

## Phase B QA Notes

- Pagination scale test (>100 entries) is out of scope for 3.1 and should be scheduled if needed.
- **Description length (time entry):** unconstrained in M1 (PM ruling 2026-04-12).

**End of Document**  
Last Updated: 2026-04-12 by Hannibal — Story 3.3 sign-off; suite 79/79 (Story 3.3 tests + prior registry)
