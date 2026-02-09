# Project Vandura - Team Status Document

**Last Updated:** 2026-02-05  
**Milestone:** M1 - MVP Showcase  
**Status:** Phase A In Progress

---

## Team Roles

| Role | Agent | Responsibility |
|------|-------|----------------|
| **Project Manager** | Hannibal | Strategy, roadmap, requirements, scope decisions, escalation resolution |
| **Lead Developer** | B.A. Baracus | Implementation, technical decisions, code quality, timeline execution |
| **QA Engineer** | Murdock | Testing strategy, edge cases, failure scenarios, quality gates |

---

## Project Vision

**Replace manual Excel-based time tracking with an automated web system that generates actuals vs. estimates reports.**

**Target Audience:** Public GitHub showcase demonstrating modern full-stack architecture

**Success Criteria:**
- Excel import works reliably
- Actuals vs. Estimates reports are accurate
- UI is clean and professional
- Zero deployment cost
- Suitable for portfolio/showcase

---

## Current Status

### What's DONE ✅

**Infrastructure:**
- ✅ Next.js 15 + TypeScript + tRPC project structure
- ✅ SQLite database with Drizzle ORM
- ✅ Database schema (5 tables: developers, projects, tasks, time_entries, actuals_cache)
- ✅ Database migrations + seeding scripts
- ✅ Local dev environment functional (`npm run dev`) on **Node 20 LTS**
- ✅ Windows/OneDrive mitigation documented (WATCHPACK polling + `.next` reset)

**Backend Services (Implemented):**
- ✅ `AggregationEngine.ts` - Time entry aggregation (**developer lookup bug fixed**)
- ✅ `TimesheetService.ts` - CRUD operations (**bulkCreate uses a transaction**)
- ✅ `ExcelParser.ts` - Excel file parsing (**header mapping hardened**; duplicates allowed; local timezone)
- ✅ `ReportService.ts` - Report generation + CSV formatting

**tRPC API Routers (Code Exists):**
- ✅ Project, Developer, Task, Timesheet, Report routers

**Frontend (MVP Slice Implemented, Still Incomplete vs Full AC):**
- ✅ Dashboard (`/`) project variance summary + quick actions
- ✅ Projects: list + create (`/projects`), detail (`/projects/[id]`)
- ✅ Timesheets: list (`/timesheets`)
- ✅ Excel import UI (`/timesheets/upload`) with duplicate + local-time warnings
- ✅ Reports: project summaries (`/reports`), actuals report (`/reports/[projectId]`), CSV export

**Still Missing (per MVP AC):**
- ⚠️ Tasks CRUD UI inside `/projects/[id]`
- ⚠️ Developers CRUD UI (`/developers`)
- ⚠️ Manual time entry UI (create/edit/delete + filters)
- ⚠️ Excel import parse preview step (parse → preview/errors → import)
- ⚠️ Report date range presets + custom range + sorting UX improvements

### What's IN PROGRESS 🚧

**Phase A - Showcase Slice:**
- Story 1.1: Dev environment validation (Windows/OneDrive + Node 20 confirmed)
- Story 2.1: Project CRUD UI (partially implemented; edit/delete/status pending)

### What's PLANNED 📋

See "Roadmap" section below for full Phase A & B breakdown.

---

## Tech Stack (Locked)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | Next.js 15 (App Router) + React 19 | Modern full-stack framework |
| **Language** | TypeScript | End-to-end type safety |
| **API** | tRPC | Type-safe RPC, no REST boilerplate |
| **Database** | SQLite (better-sqlite3) | Zero cost, local file |
| **ORM** | Drizzle | Type-safe SQL queries |
| **UI** | Tailwind CSS + minimal shadcn/ui | Clean, simple, fast |
| **Validation** | Zod | Runtime type checking |
| **Deployment** | Local for M1, Vercel + Turso in M2 | Free tier |

---

## Key Technical Decisions

### Time Tracking Rules
- **Granularity:** 15-minute increments (validated: duration % 15 === 0)
- **Timezone:** All dates treated as local machine time (no conversion)
- **Week boundaries:** Calendar days, no UTC offset

### Excel Import Behavior
- **Dedupe:** Allow duplicates (no deduplication in M1)
- **Task matching:** Auto-create missing tasks by `(project_id, task_name)`
- **Column detection:** Flexible, case-insensitive matching
- **Batch size:** 1000 rows per transaction

### Data Relationships
- **Task scope:** Tasks are unique per project (name is unique within project)
- **Cascade deletes:** Deleting project deletes tasks and time entries
- **Auto-creation:** Excel import auto-creates developers/projects/tasks if missing

### UI Patterns
- **Time entry form:** Dropdowns only (no inline entity creation)
- **Task management:** Only under `/projects/[id]` (no standalone /tasks page)
- **Date ranges:** Quick presets ("Last 7 Days", "This Month", etc.) + custom dates
- **Parse preview:** First 10 rows + error/warning summary

### Quality Standards
- **Tests:** Critical paths only (Excel parse, aggregation, report generation)
- **Documentation:** README usage + screenshots + sample Excel file
- **Error handling:** Inline form validation + toast alerts + graceful API errors

---

## Constraints (Non-Negotiable)

1. **$0 Budget** - Free tier only, no paid services
2. **TypeScript** - All code must be typed
3. **SQLite for M1** - No database change until M2
4. **Next.js App Router** - No Pages Router migration
5. **Node 20 LTS** - Lock version for better-sqlite3 compatibility

---

## MVP Scope (Milestone 1)

### IN Scope ✅
- Import time entries from Excel
- Manual time entry via web UI
- View actuals vs. estimates reports
- Project/task/developer management
- Dashboard with variance tracking
- Export reports to CSV

### OUT of Scope ❌
- User authentication
- Multi-team/permissions
- Real-time collaboration
- Mobile app
- Integrations (Jira, Slack, etc.)
- Custom report builder
- Time entry approval workflow
- Deduplication of imports

---

## User Stories & Acceptance Criteria

### Phase A: Showcase Slice (P0 - Core Value)

#### Story 1.1: Local Dev Environment (P0) - 1-2h
**Status:** Done ✅  
**Owner:** B.A.

**Acceptance Criteria:**
- [x] `npm install` completes without errors (Node 20 LTS)
- [x] `npm run db:migrate` creates SQLite database
- [x] `npm run db:seed` populates sample data
- [x] `npm run dev` starts server on localhost:3000
- [x] README has clear setup instructions for Windows + OneDrive users

---

#### Story 2.1: Manage Projects (P0) - 3-4h
**Status:** ✅ Complete  
**Owner:** B.A.

**Acceptance Criteria:**
- [x] Create project with name, description, estimated hours, start/end dates
- [x] View list of all projects
- [x] Edit project details
- [x] Delete project (cascade deletes tasks/entries)
- [x] Mark project status (active/completed/on-hold/cancelled)
- [x] Form validation (name required, estimated hours >= 0)

**UI Location:** `/projects`, `/projects/new`, `/projects/[id]/edit`

---

#### Story 2.2: Manage Tasks (P0) - 4-5h
**Status:** ✅ Complete  
**Owner:** B.A.

**Decisions (clarified):**
- **Create**: modal
- **Edit**: modal
- **Delete**: confirmation modal
- **Status**: both (in form + quick-edit dropdown in table)
- **Parent/subtasks (`parentTaskId`)**: **OUT of scope** for Story 2.2 (keep tasks flat; always `null`)
- **Actual hours column**: **OUT of scope** for Story 2.2 (avoid new aggregation work; focus on CRUD + status)

**Acceptance Criteria (tightened):**
- [x] View tasks in a table on `/projects/[id]` (filtered to current project only)
- [x] Empty state: “No tasks yet. Add one to get started.”
- [x] “Add Task” button opens a **create modal**
- [x] Create task form fields:
  - [x] Name (required)
  - [x] Estimated hours (optional, \( \ge 0 \))
  - [x] Description (optional)
  - [x] Status (pending/in-progress/completed/blocked; default pending)
- [x] After create, task appears in the table without navigation
- [x] Edit task via **Edit** button → **edit modal** (same fields)
- [x] Delete task via **Delete** button → **confirm modal**
  - [x] Copy: “Delete this task? Time entries linked to this task will become unassigned.”
- [x] Quick-edit status dropdown in table updates status immediately
- [x] Validation: name required; estimated hours \( \ge 0 \) if provided

**Definition of Done (Story 2.2):**
- [ ] Navigate to a project detail page
- [ ] Click “Add Task” → modal opens
- [ ] Create task with name, estimated hours, description, status
- [ ] See task appear in table
- [ ] Click status dropdown in table → change status inline
- [ ] Click “Edit” → modal opens with existing values
- [ ] Update task → changes persist
- [ ] Click “Delete” → confirmation modal → task removed
- [ ] See empty state if no tasks exist

**UI Location:** `/projects/[id]` (embedded tasks section)

**QA Checklist (Murdock)**
- [x] Create modal: empty name → inline error “Name is required”
- [x] Create modal: negative estimated hours → inline error “Estimated hours must be 0 or greater”
- [x] Create task: success → modal closes, task appears in table
- [x] Status dropdown: change → disabled during save → updates on success
- [x] Status dropdown: server error → reverts to original value, shows error toast
- [x] Edit modal: pre-populates existing values
- [x] Edit modal: update → persists changes
- [x] Delete modal: shows exact copy: “Delete this task? Time entries linked to this task will become unassigned.”
- [x] Delete task: removes from list; time entries become unassigned (`taskId = null`)
- [x] Empty state shows when no tasks exist

**Refactors completed (post-QA polish)**
- ✅ Extracted shared `Modal` component: `src/app/projects/_components/Modal.tsx`
- ✅ Extracted `TasksSection` to keep `/projects/[id]/page.tsx` focused: `src/app/projects/[id]/_components/TasksSection.tsx`
- ✅ QA validated no regressions after refactor

---

#### Story 3.2: Excel Import (P0) - 4-5h
**Status:** In Progress  
**Owner:** B.A.

**Acceptance Criteria:**
- [x] Upload .xlsx file via `/timesheets/upload` page
- [ ] Show parse preview: first 10 rows in table (parse-only step)
- [ ] Show parse summary: "247 entries parsed, 3 errors, 5 warnings"
- [ ] Expandable error/warning list with row numbers
- [ ] "Import" button disabled if errors > 0
- [x] Batch insert uses proper transaction
- [x] Success message: "Imported 247 time entries"
- [x] Auto-create missing developers/projects/tasks
- [x] Apply timezone rule: treat as local time
- [x] Apply dedupe rule: allow duplicates

**UI Location:** `/timesheets/upload`

---

#### Story 4.2: Actuals vs Estimates Report (P0) - 4-6h
**Status:** In Progress  
**Owner:** B.A.

**Acceptance Criteria:**
- [ ] Select project from dropdown
- [ ] Date range presets: "Last 7 Days", "Last 30 Days", "This Month", "All Time"
- [ ] Custom date inputs (start/end date pickers)
- [ ] Project-level summary: total estimated, total actual, variance, variance %
- [ ] Task-level breakdown table: task name, estimated, actual, variance, variance %
- [ ] Color-coded variance (green if under, red if over)
- [ ] Sortable table columns
- [ ] Empty state if no time entries

**UI Location:** `/reports`, `/reports/[projectId]`

---

#### Story 4.4: Export CSV (P0) - 1-2h
**Status:** In Progress  
**Owner:** B.A.

**Acceptance Criteria:**
- [x] "Export CSV" button on actuals report page
- [ ] Filename format: `actuals-report-{projectName}-{timestamp}.csv`
- [x] CSV includes project summary + task breakdown
- [x] Opens correctly in Excel (proper escaping)

**UI Location:** `/reports/[projectId]` (export button)

---

#### Story 4.1: Dashboard Polish (P0) - 1-2h
**Status:** In Progress  
**Owner:** B.A.

**Acceptance Criteria:**
- [ ] Summary cards: Total projects, estimated hours, actual hours, variance
- [ ] Active projects table with variance indicators
- [ ] Empty state: "No projects yet. Create one to get started."
- [ ] Quick action cards: Upload, Create Project, View Reports
- [ ] Color-coded variance throughout

**UI Location:** `/` (homepage)

---

### Phase B: Production Ready (P1 - Polish)

#### Story 3.1: Manual Time Entry (P1) - 5-7h
**Status:** Not Started

**Acceptance Criteria:**
- [ ] Form: project dropdown, task dropdown (filtered), developer dropdown, start time, duration, notes
- [ ] Validation: duration multiple of 15 minutes
- [ ] View time entries list with filters (project, developer, date range)
- [ ] Edit existing time entry
- [ ] Delete time entry
- [ ] Pagination (100 entries per page)

**UI Location:** `/timesheets` (list + create/edit/delete UI)

---

#### Story 2.3: Manage Developers (P1) - 3-4h
**Status:** Not Started

**Acceptance Criteria:**
- [ ] Create developer (name, email, hourly rate)
- [ ] View list of developers
- [ ] Edit developer details
- [ ] Mark developer as inactive (soft delete, no cascade)
- [ ] Filter: show active only vs all

**UI Location:** `/developers` (list + create/edit UI)

---

#### Story 4.3: Developer Productivity Report (P1) - 4-6h
**Status:** Not Started

**Acceptance Criteria:**
- [ ] View all developers with total hours logged
- [ ] Date range filter (presets + custom)
- [ ] Columns: developer name, total hours, project count, task count, avg hours/active day
- [ ] Column label: "Avg Hours/Active Day" with tooltip
- [ ] Sortable table
- [ ] Empty state if no time entries

**UI Location:** `/reports/productivity` (new page)

---

#### Story 3.3: Excel Format Docs (P1) - 3-4h
**Status:** Not Started

**Acceptance Criteria:**
- [ ] Upload page shows example Excel format table
- [ ] Downloadable template file link (`public/timesheet-template.xlsx`)
- [ ] Documentation of supported date/time formats
- [ ] Timezone handling explanation: "All times treated as local machine time"
- [ ] Duplicate warning: "Importing the same file twice will create duplicates"

**UI Location:** `/timesheets/upload` (documentation section)

---

#### Story 5.1: Error Handling (P1) - 4-6h
**Status:** Not Started

**Acceptance Criteria:**
- [ ] Form validation errors displayed inline (red text below field)
- [ ] API errors shown in toast/alert (top-right corner)
- [ ] Excel parse errors shown in expandable list before import
- [ ] 404 page for missing routes
- [ ] Database errors: graceful message, no stack traces in production

---

#### Story 5.2: Documentation (P1) - 3-5h
**Status:** Not Started

**Acceptance Criteria:**
- [ ] README: Setup instructions (Windows notes), usage guide, screenshots
- [ ] Sample Excel file in `/public` or `/examples`
- [ ] Architecture doc accuracy review (VANDURA_ARCHITECTURE.md)
- [ ] Screenshots: Dashboard, Excel upload, Actuals report

---

#### Story 1.2: Dev Server Stability (Windows/OneDrive) (P2 - Deferred) - 1-2h
**Status:** Deferred (post-MVP)  
**Owner:** B.A.

**Problem:**
- On Windows (especially under OneDrive), `next dev` can occasionally **bind port 3000 but stop responding** until processes are killed and `.next` is cleared.

**Acceptance Criteria:**
- [ ] Add an optional dev script `dev:win` that runs `next dev` with Watchpack polling enabled (Windows-friendly)
- [ ] Add an optional dev script `dev:clean` that clears `.next` before starting dev server
- [ ] Document recovery steps in README (kill stuck `node.exe`, delete `.next`, restart with polling)
- [ ] Update `van.md` risk mitigation notes to reference these scripts

**Notes:**
- This is **operational hardening**, not core MVP functionality; do only when Hannibal prioritizes.

---

## Roadmap & Timeline

### Phase A: Showcase Slice (24-31 hours / 3-4 dev days)
**Sequence:** 1.1 → 2.1 → 2.2 → 3.2 → 4.2 → 4.4 → 4.1

**Deliverable:** Fully functional demo path: Create project → Add tasks → Import Excel → View report → Export CSV

**Go-Live Target:** End of Week 1

---

### Phase B: Production Ready (21-27 hours / 3-4 dev days)
**Sequence:** 3.1 → 2.3 → 4.3 → 3.3 → 5.1 → 5.2

**Deliverable:** Production-grade system ready for public GitHub showcase

**Go-Live Target:** End of Week 2

---

### Optional (Deferred): Dev Environment Hardening (1-2 hours)
**Sequence:** 1.2 (Dev Server Stability) can be done any time after MVP, especially if Windows/OneDrive instability recurs.

## Known Issues & Technical Debt

### Critical (Fix in Phase A)
1. **Excel import UX** - Missing: parse preview step (parse → preview/errors → import)
2. **Windows/OneDrive stability** - Occasional stuck `next dev` / chunk timeouts if polling not enabled or stale `.next`
3. ~~**Next.js params Promise warning**~~ - ✅ **FIXED**: `/projects/[id]` and `/projects/[id]/edit` - Fixed params handling for Next.js 15 (handle `string | string[]`). Owner: B.A.
4. ~~**Drizzle relations missing**~~ - ✅ **FIXED**: Added Drizzle relations to schema for `projects.tasks`, `tasks.project`, etc. Required for `with: { tasks: true }` queries. Owner: B.A.

### Minor (Fix in Phase B)
3. **drizzle.config.ts** - Fixed: removed deprecated `driver` field (already resolved)
4. **Excel parser** - Enhancement: add more date format patterns if edge cases emerge

---

## Risk Register

| Risk | Impact | Probability | Mitigation | Owner |
|------|--------|-------------|------------|-------|
| **Windows/OneDrive file locks** | Medium | Medium | Move repo out of OneDrive; use polling mode; document in README | B.A. |
| **better-sqlite3 build issues** | High | Low | Lock to Node 20 LTS; document version requirement | B.A. |
| **Excel format edge cases** | Medium | Medium | Thorough testing with sample files; clear error messages | Murdock |
| **Scope creep** | High | Medium | B.A. has authority to push back; escalate only if user-facing | Hannibal |
| **Estimation drift** | Low | Low | B.A.'s estimates have buffer; Phase B can flex if needed | Hannibal |

---

## Decision Authority Matrix

| Decision Type | Owner | Escalate To |
|--------------|-------|-------------|
| Implementation approach | B.A. | - |
| Component/library choice (within stack) | B.A. | - |
| Code architecture/patterns | B.A. | - |
| Refactoring | B.A. | - |
| New major dependency | Hannibal | - |
| Core architecture change (DB, framework) | Hannibal | - |
| Scope change mid-story | Hannibal | - |
| Timeline slip > 1 day | B.A. + Hannibal | - |
| Test coverage level | Murdock + Hannibal | - |
| Acceptance criteria clarification | B.A. → Hannibal | - |

---

## Definition of Ready (Story can be started)

- [ ] Acceptance criteria are clear
- [ ] No blocking dependencies
- [ ] Design/UX decisions made (if needed)
- [ ] Test strategy identified (critical paths)

---

## Definition of Done (Story is complete)

- [ ] All acceptance criteria met
- [ ] Critical paths tested (Murdock approval)
- [ ] No build errors
- [ ] README updated (if user-facing feature)
- [ ] Code pushed to branch `cursor/vandura-architecture-plan-4740`
- [ ] Hannibal sign-off (Phase A only; Phase B can auto-merge)

---

## Communication Protocol

### Daily Updates (Optional)
- B.A. posts progress on current story
- Murdock flags issues found in testing
- Hannibal monitors for escalations

### Phase Gates
- **End of Phase A:** Demo showcase slice to Hannibal (go/no-go for Phase B)
- **End of Phase B:** Final review before public release

### Escalations
- Use this document's "Known Issues" section
- Tag responsible owner
- Hannibal makes final call if needed

---

## Test Strategy (Murdock's Domain)

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
- Murdock documents test cases + results

---

## Phase A Test Plan (Murdock)

### Scope
- Demo path: Create project → Add tasks → Import Excel → View report → Export CSV
- Story coverage: 2.1, 2.2, 3.2, 4.2, 4.4, 4.1

### Critical Path Test Cases
1. **Project CRUD (Story 2.1)**
   - Create project with required fields and estimatedHours = 0 → saved successfully, UI shows "0h"
   - Create project with negative estimatedHours → blocked with validation error
   - Edit project fields (name, dates, status) → changes persist
   - Delete project → associated tasks and time entries removed (cascade)

2. **Task Management (Story 2.2)**
   - Create task under project → appears in task table
   - Edit task details → updates persist
   - Delete task → removed from project view
   - Task list filtered to current project only

3. **Excel Import Happy Path (Story 3.2)**
   - Valid file with supported formats → parse preview shows first 10 rows
   - Parse summary shows correct counts (entries, errors, warnings)
   - Import button enabled when errors = 0
   - Import succeeds in one transaction and shows success message
   - Auto-create missing developer/project/task

4. **Excel Import Error Handling (Story 3.2)**
   - File with 1 invalid row among valid rows → import blocked (strict failure)
   - Invalid duration (not multiple of 15) → parse error with row number and duration
   - Unsupported date format → parse error with row number and value
   - Empty file or missing required columns → parse error and no import

5. **Reports (Story 4.2, 4.4)**
   - Actuals vs estimates matches seeded/imported totals
   - Variance coloring: green under, red over
   - Date range presets + custom range filter results correctly
   - Empty state shown when no time entries
   - CSV export opens in Excel and contains summary + task breakdown
   - CSV filename matches `actuals-report-{projectName}-{timestamp}.csv`

6. **Dashboard (Story 4.1)**
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
- Story 2.2 tasks UI must exist before task tests
- Parse preview + error summary UI required for Excel tests
- Reporting filters and sorting UI needed for report tests
- Example Excel template file provided and stored in `/public`

### QA Results (Initial)
**Story 2.1 (Manage Projects):**
- Automated tests (tRPC + validation) PASS
- Code review PASS for create/edit/delete/status UI wiring
- Manual UI pass: pending (requires browser run)

### Existing Code QA Targets (Initial Setup)
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
   - `createProjectSchema` and `createTaskSchema` allow estimatedHours = 0 or null (per decision)
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

## Automated Tests (Current) — for Murdock

### How to run
- **Command**: `npm test`
- **Runner**: `scripts/run-tests.mjs` (runs every `tests/*.test.ts` via `node --import tsx --test`)
- **Note**: Node's test runner does **not** auto-discover `*.test.ts` by directory alone, so we keep this runner to avoid missing tests.

### Current test files
- `tests/validators.test.ts`
- `tests/report-service.test.ts`
- `tests/report-router.test.ts`
- `tests/date-utils.test.ts`
- `tests/excel-parser.test.ts`

### Next test targets (high value)
- `timesheet.parseExcel` returns `{ entries, errors, warnings }` with correct row numbering
- `timesheet.importExcel` blocks on any parse errors (no partial imports) and succeeds when `errors.length === 0`
- ExcelParser negative cases: missing required columns, invalid durations (`<= 0`, not multiple of 15), unsupported date/time formats

---

## Implementation Notes (B.A.) — for QA targeting

### Excel parse preview + error summary (Story 3.2)
- **Path**: `src/app/timesheets/upload/page.tsx` (`/timesheets/upload`)
- **UI flow** (2-step):
  - Step 1 (**Parse**): call `timesheet.parseExcel` (tRPC) and render:
    - Parse summary (entries/errors/warnings)
    - Preview table (first 10 parsed rows)
    - Expandable errors + warnings lists (include row numbers)
  - Step 2 (**Import**): call `timesheet.importExcel` only when `errors.length === 0`
- **tRPC procedures**:
  - Parse: `timesheet.parseExcel`
  - Import: `timesheet.importExcel`

### Zero-duration rows (duration = 0)
- **Decision**: **Error and block import** (strict validation).
- **Rule**:
  - `durationMinutes <= 0` → parse error like `Row N: Duration must be greater than 0`
  - Import remains **all-or-nothing** when any parse errors exist (no partial imports)

## File Structure (For Reference)

```
vandura/
├── van.md                          # This document (team status)
├── VANDURA_ARCHITECTURE.md         # Technical architecture
├── README.md                       # Public-facing docs
├── src/
│   ├── app/                        # Next.js pages
│   ├── server/
│   │   ├── db/                     # Database schema + migrations
│   │   ├── services/               # Business logic (AggregationEngine, etc.)
│   │   └── routers/                # tRPC API endpoints
│   ├── lib/                        # Shared utilities
│   └── components/                 # React components
├── scripts/                        # migrate.ts, seed.ts
└── data/                           # vandura.db (local SQLite file)
```

---

## Next Actions

**B.A.:**
- [x] Validate Story 1.1 (dev environment)
- [x] Finish Story 2.1 (Project CRUD: edit/delete/status) - ✅ Complete with tests
- [x] Fix Next.js params Promise warning (Murdock QA finding)
- [ ] Implement Story 2.2 (Tasks CRUD UI inside `/projects/[id]`)
- [ ] Implement Story 3.2 parse preview step (parse → preview/errors → import)

**Hannibal:**
- [x] Create van.md (this document)
- [x] Answer Murdock's questions
- [ ] Monitor Phase A progress

**Murdock:**
- [ ] Review van.md
- [ ] Ask clarifying questions
- [ ] Prepare test plan for Phase A deliverables

---

## Questions/Blockers

_This section is for the team to log questions and blockers. Update as needed._

**Murdock's Questions:** (Pending)

---

**End of Document**  
Last Updated: 2026-02-06 by B.A. + Murdock + Hannibal