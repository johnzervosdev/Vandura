# Project Vandura — User Stories & Acceptance Criteria

**Last Updated:** 2026-03-13  
**Owner:** B.A. (maintains ACs + implementation notes) | Murdock (updates QA checklists)

> **Navigation:** [`van/project.md`](project.md) — project dashboard | [`van/qa.md`](qa.md) — test plans & results

---

## Phase A: Showcase Slice (P0 - Core Value)

### Story 1.1: Local Dev Environment (P0) — 1-2h
**Status:** ✅ Complete  
**Owner:** B.A.

**Acceptance Criteria:**
- [x] `npm install` completes without errors (Node 20 LTS)
- [x] `npm run db:migrate` creates SQLite database
- [x] `npm run db:seed` populates sample data
- [x] `npm run dev` starts server on localhost:3000
- [x] README has clear setup instructions for Windows + OneDrive users

---

### Story 2.1: Manage Projects (P0) — 3-4h
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

### Story 2.2: Manage Tasks (P0) — 4-5h
**Status:** ✅ Complete  
**Owner:** B.A.

**Decisions (clarified):**
- **Create**: modal
- **Edit**: modal
- **Delete**: confirmation modal
- **Status**: both (in form + quick-edit dropdown in table)
- **Parent/subtasks (`parentTaskId`)**: OUT of scope (keep tasks flat; always `null`)
- **Actual hours column**: OUT of scope (avoid new aggregation work; focus on CRUD + status)

**Acceptance Criteria:**
- [x] View tasks in a table on `/projects/[id]` (filtered to current project only)
- [x] Empty state: "No tasks yet. Add one to get started."
- [x] "Add Task" button opens a create modal
- [x] Create task form fields: Name (required), Estimated hours (optional, ≥ 0), Description (optional), Status (pending/in-progress/completed/blocked; default pending)
- [x] After create, task appears in the table without navigation
- [x] Edit task via Edit button → edit modal (same fields)
- [x] Delete task via Delete button → confirm modal with copy: "Delete this task? Time entries linked to this task will become unassigned."
- [x] Quick-edit status dropdown in table updates status immediately
- [x] Validation: name required; estimated hours ≥ 0 if provided

**Definition of Done:**
- [x] Navigate to a project detail page
- [x] Click "Add Task" → modal opens
- [x] Create task with name, estimated hours, description, status
- [x] See task appear in table
- [x] Click status dropdown in table → change status inline
- [x] Click "Edit" → modal opens with existing values
- [x] Update task → changes persist
- [x] Click "Delete" → confirmation modal → task removed
- [x] See empty state if no tasks exist

**UI Location:** `/projects/[id]` (embedded tasks section)

**QA Checklist (Murdock)**
- [x] Create modal: empty name → inline error "Name is required"
- [x] Create modal: negative estimated hours → inline error "Estimated hours must be 0 or greater"
- [x] Create task: success → modal closes, task appears in table
- [x] Status dropdown: change → disabled during save → updates on success
- [x] Status dropdown: server error → reverts to original value, shows error toast
- [x] Edit modal: pre-populates existing values
- [x] Edit modal: update → persists changes
- [x] Delete modal: shows exact copy: "Delete this task? Time entries linked to this task will become unassigned."
- [x] Delete task: removes from list; time entries become unassigned (`taskId = null`)
- [x] Empty state shows when no tasks exist

**Refactors completed (post-QA polish)**
- ✅ Extracted shared `Modal` component: `src/components/Modal.tsx`
- ✅ Extracted `TasksSection`: `src/app/projects/[id]/_components/TasksSection.tsx`
- ✅ QA validated no regressions after refactor

---

### Story 3.2: Excel Import (P0) — 4-5h
**Status:** ✅ Complete  
**Owner:** B.A.

**Acceptance Criteria:**
- [x] Upload .xlsx file via `/timesheets/upload` page
- [x] Show parse preview: first 10 rows in table (parse-only step)
- [x] Show parse summary: "X entries parsed, Y errors, Z warnings"
- [x] Expandable error/warning list with row numbers
- [x] "Import" button disabled if errors > 0
- [x] Batch insert uses proper transaction
- [x] Success message: "Imported 247 time entries"
- [x] Auto-create missing developers/projects/tasks
- [x] Apply timezone rule: treat as local time
- [x] Apply dedupe rule: allow duplicates
- [x] Weekly-grid timesheets supported (Mon–Fri weekday columns) when the sheet includes a **Week Ending** date and a sheet-level **Name/Developer** label (grid → row conversion)

**QA Checklist (Murdock)**
- [x] Parse: shows preview (max 10 rows) + summary counts
- [x] Parse: errors/warnings expandable with row numbers
- [x] Import disabled when errors exist
- [x] Import succeeds when no errors and shows success banner
- [x] Import blocks on errors (no partial import)
- [x] Full suite green (60/60)

**UI Location:** `/timesheets/upload`

**Implementation Notes (B.A.)**
- **tRPC procedures:**
  - Parse: `timesheet.parseExcel` → returns `{ entryCount, preview (first 10), errors, warnings }`
  - Import: `timesheet.importExcel` → throws if any parse errors
- **UI flow (2-step):**
  - Step 1 (Parse): call `timesheet.parseExcel`, render preview + error/warning lists
  - Step 2 (Import): call `timesheet.importExcel` only when `errors.length === 0`; modal closes on success; success banner shows imported count
- **Excel parsing:**
  - Parser: `src/server/services/ExcelParser.ts`
  - Weekly grid conversion inside `ExcelParser.parseFile()` when sheet looks like weekday columns (Mon/Tue/…)
- **Zero-duration rows:** `durationMinutes <= 0` → parse error `Row N: Duration must be greater than 0`. All-or-nothing import.

---

### Story 4.2: Actuals vs Estimates Report (P0) — 4-6h
**Status:** ✅ Complete  
**Owner:** B.A.

**Acceptance Criteria:**
- [x] Select project from dropdown
- [x] Date range presets: "Last 7 Days", "Last 30 Days", "This Month", "All Time"
- [x] Custom date inputs (start/end date pickers)
- [x] Project-level summary: total estimated, total actual, variance, variance %
- [x] Task-level breakdown table: task name, estimated, actual, variance, variance %
- [x] Color-coded variance (green if under, red if over)
- [x] Sortable table columns
- [x] Empty state if no time entries

**UI Location:** `/reports`, `/reports/[projectId]`

---

### Story 4.4: Export CSV (P0) — 1-2h
**Status:** ✅ Complete  
**Owner:** B.A.

**Acceptance Criteria:**
- [x] "Export CSV" button on actuals report page
- [x] Filename format: `actuals-report-{projectName}-{timestamp}.csv`
- [x] CSV includes project summary + task breakdown
- [x] Opens correctly in Excel (proper escaping)

**UI Location:** `/reports/[projectId]` (export button)

---

### Story 4.1: Dashboard Polish (P0) — 1-2h
**Status:** ✅ Complete  
**Owner:** B.A.

**Acceptance Criteria:**
- [x] Summary cards: Total projects, estimated hours, actual hours, variance
- [x] Active projects table with variance indicators
- [x] Empty state: "No projects yet. Create one to get started."
- [x] Quick action cards: Upload, Create Project, View Reports
- [x] Color-coded variance throughout

**UI Location:** `/` (homepage)

---

## Phase B: Production Ready (P1 - Polish)

### Story 3.1: Manual Time Entry (P1) — 5-7h
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

### Story 2.3: Manage Developers (P1) — 3-4h
**Status:** Not Started

**Acceptance Criteria:**
- [ ] Create developer (name, email, hourly rate)
- [ ] View list of developers
- [ ] Edit developer details
- [ ] Mark developer as inactive (soft delete, no cascade)
- [ ] Filter: show active only vs all

**UI Location:** `/developers` (list + create/edit UI)

---

### Story 4.3: Developer Productivity Report (P1) — 4-6h
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

### Story 3.3: Excel Format Docs (P1) — 3-4h
**Status:** Not Started

**Acceptance Criteria:**
- [ ] Upload page shows example Excel format table
- [ ] Downloadable template file link (`public/timesheet-template.xlsx`)
- [ ] Documentation of supported date/time formats
- [ ] Timezone handling explanation: "All times treated as local machine time"
- [ ] Duplicate warning: "Importing the same file twice will create duplicates"

**UI Location:** `/timesheets/upload` (documentation section)

---

### Story 5.1: Error Handling (P1) — 4-6h
**Status:** Not Started

**Acceptance Criteria:**
- [ ] Form validation errors displayed inline (red text below field)
- [ ] API errors shown in toast/alert (top-right corner)
- [ ] Excel parse errors shown in expandable list before import
- [ ] 404 page for missing routes
- [ ] Database errors: graceful message, no stack traces in production

---

### Story 5.2: Documentation (P1) — 3-5h
**Status:** Not Started

**Acceptance Criteria:**
- [ ] README: Setup instructions (Windows notes), usage guide, screenshots
- [ ] Sample Excel file in `/public` or `/examples`
- [ ] Architecture doc accuracy review (VANDURA_ARCHITECTURE.md)
- [ ] Screenshots: Dashboard, Excel upload, Actuals report

---

## Deferred Stories (P2 - Post-MVP)

### Story 1.2: Dev Server Stability (Windows/OneDrive) — 1-2h
**Status:** Deferred (post-MVP)  
**Owner:** B.A.

**Problem:** On Windows (especially under OneDrive), `next dev` can occasionally bind port 3000 but stop responding until processes are killed and `.next` is cleared.

**Acceptance Criteria:**
- [ ] Add `dev:win` script — runs `next dev` with Watchpack polling enabled
- [ ] Add `dev:clean` script — clears `.next` before starting dev server
- [ ] Document recovery steps in README (kill stuck `node.exe`, delete `.next`, restart with polling)
- [ ] Update van/project.md risk notes to reference these scripts

**Notes:** Operational hardening; do only when Hannibal prioritizes.

---

### Story 3.4: Parse Preview Remediation Tools — 4-8h
**Status:** Deferred (post-MVP)  
**Owner:** TBD (B.A. likely)

**Goal:** Reduce friction when Excel parse preview finds invalid projects or obvious timesheet mistakes.

**Scope (post-MVP ideas):**
- **Invalid project quick-add:** Add "Add project" button/link next to each invalid project in parse preview; opens pre-filled modal; after create, re-validates without re-upload
- **On-the-fly correction (optional):** Map invalid project to existing project (alias/misspelling correction); maintain alias table
- **Developer feedback export (optional):** "Copy/Download" message summarizing issues for the developer

**Acceptance Criteria:**
- [ ] Parse preview shows invalid projects with an Add project action
- [ ] Adding a project updates the invalid list without a full page reload
- [ ] (Optional) Provide a "Copy message" action containing a clean list of issues

**Notes:** Explicitly post-MVP. MVP remains strict (import blocked on errors); no remediation workflows in M1.

---

**End of Document**  
Last Updated: 2026-03-13 by Hannibal (split from van.md into van/ folder)
