# Project Vandura — QA Strategy, Test Plans & Results

**Last Updated:** 2026-03-13  
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

### Nice-to-Test (If Time Permits)
- Form validation (manual time entry, project creation)
- Navigation flows
- Empty states
- Error handling UX

### Testing Approach
- Manual testing during Phase A (fast iteration)
- Automated tests for critical paths in Phase B (if time)
- Murdock documents test cases + results in this file

---

## Automated Test Registry

### How to Run
- **Command:** `npm test`
- **Runner:** `scripts/run-tests.mjs` (runs every `tests/*.test.ts` via `node --import tsx --test`)
- **Note:** Node's test runner does not auto-discover `*.test.ts` by directory alone; the runner is required to avoid missing tests.

### Current Test Files

| File | Coverage | Status |
|------|----------|--------|
| `tests/validators.test.ts` | Schema validation (createProject, createTask, createTimeEntry) | ✅ Passing |
| `tests/report-service.test.ts` | ReportService actuals vs estimates calculations | ✅ Passing |
| `tests/report-router.test.ts` | tRPC report router (projectsSummary, actualsReport) | ✅ Passing |
| `tests/date-utils.test.ts` | calculateDuration, isValidDuration, getPresetRange | ✅ Passing |
| `tests/excel-parser.test.ts` | ExcelParser date/time/duration parsing; row-based format | ✅ Passing |
| `tests/timesheet-bulkCreate.test.ts` | TimesheetService.bulkCreateEntries transaction + return type | ✅ Passing — regression for Issue #9 |
| `tests/timesheet-sample-extract.test.ts` | Weekly-grid parser: JZER-style layout (B2/C2 developer, Project Code column, weekday hours E–K); synthetic workbook fallback for CI | ✅ Passing — addresses Known Issue #3 |
| `tests/report-projects-summary-error.test.ts` | reportRouter.projectsSummary does not throw SQL alias error | ✅ Passing — regression for Issue #4 |

**Suite status:** 60/60 passing (last run: 2026-03-13)

### Next Test Targets (Deferred to Phase B)
The following were explicitly deferred during Phase A — known debt, not a blocker:
- `timesheet.parseExcel` tRPC router: returns `{ entries, errors, warnings }` with correct row numbering
- `timesheet.importExcel` tRPC router: blocks on any parse errors (no partial imports); succeeds when `errors.length === 0`
- ExcelParser negative cases: missing required columns, invalid durations (`<= 0`, not multiple of 15), unsupported date/time formats

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
- Example Excel template file provided and stored in `/public` — pending Story 3.3 (Phase B)

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
- Suite: 60/60 green

### Story 4.2 — Actuals vs Estimates Report
- Status: Pending B.A. delivery

### Story 4.4 — Export CSV
- Status: Pending B.A. delivery (filename AC outstanding)

### Story 4.1 — Dashboard Polish
- Status: Pending B.A. delivery

---

**End of Document**  
Last Updated: 2026-03-13 by Hannibal (split from van.md into van/ folder)
