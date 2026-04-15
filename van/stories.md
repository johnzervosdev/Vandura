# Project Vandura — User Stories & Acceptance Criteria

**Last Updated:** 2026-04-12 (Story 3.3 scope expanded)  
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
- [x] Full suite green (76/76 — see `van/qa.md` registry)

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
**Status:** ✅ Complete  
**Owner:** B.A.

**Decisions (pre-made):**
- **Create/Edit:** modal (consistent with Tasks pattern)
- **Delete:** confirmation modal
- **Duration:** dropdown of 15-min increments (15, 30, 45 … 480 min / 8h max)
- **Date + Time:** separate date picker + time picker (not a combined datetime; keeps it simple)
- **Task dropdown:** filtered by selected project; required; no inline task creation
- **Developer dropdown:** active developers only; required; no inline developer creation (consistent with "dropdowns only" UI pattern)
- **Developer management link:** a `"Manage developers →"` text link below the developer dropdown navigates to `/developers` (same tab). No auto-refresh on return — user reopens the modal. `/developers` will be a dead link until Story 2.3 is complete; this is expected and not a bug.
- **Pagination:** 100 entries per page, most recent first

**Acceptance Criteria:**

*List View:*
- [x] `/timesheets` shows all time entries, most recent first
- [x] Columns: Date, Developer, Project, Task, Duration, Description
- [x] Filters: Project (dropdown), Developer (dropdown), Date range (presets + custom) — above the table
- [x] Empty state (no entries, or no entries match filter): `"No time entries found."`
- [x] "Add Entry" button (top-right) opens create modal
- [x] Pagination: 100 rows per page with prev/next controls

*Create Modal:*
- [x] Fields: Developer (required, active-only dropdown), Project (required, active-only dropdown), Task (required, dropdown filtered by selected project), Date (required, date picker), Start Time (required, HH:MM time picker), Duration (required, 15-min increment dropdown), Description (optional, textarea)
- [x] Task dropdown resets when project changes
- [x] Inline validation: required fields shown in red before submit
- [x] After successful create, entry appears in list (top), modal closes

*Edit Modal:*
- [x] Edit button on each row opens edit modal pre-filled with existing values
- [x] Same fields and validation as create
- [x] After save, row updates in place

*Delete:*
- [x] Delete button on each row opens confirm modal: `"Delete this time entry? This cannot be undone."`
- [x] After confirm, row is removed from list

**QA Checklist (Murdock):**
- [ ] **Prep (clean dev list)**: If the Developer dropdown is polluted with `QA Dev ...`, run `node scripts/mark-qa-developers-inactive.mjs` (local-only helper) and refresh.
- [x] **List renders**: Visit `/timesheets` and confirm rows are **most recent first**; table columns are **Date, Developer, Project, Task, Duration, Description**.
- [x] **Empty state**: With filters that match zero entries, verify empty row text is exactly `"No time entries found."`
- [x] **Filters**:
  - [x] Project filter reduces rows; clearing returns full list.
  - [x] Developer filter reduces rows; clearing returns full list.
  - [x] Date presets work: `Last 7 Days`, `Last 30 Days`, `This Month`, `All Time`.
  - [x] Custom Start/End date fields work and override preset selection.
- [x] **Pagination**: Page size is 100. `Prev` disabled on first page; `Next` disabled when no more.
- [x] **Create**:
  - [x] Click `Add Entry` → create modal opens.
  - [x] Required validation shows red errors if you hit Save with blank required fields.
  - [x] Developer dropdown shows **active developers only**.
  - [x] Project dropdown shows **active projects only**.
  - [x] Task dropdown is disabled until a project is selected; once selected it shows tasks for that project only.
  - [x] Changing Project resets Task selection.
  - [x] Duration options are 15-minute increments (15…480).
  - [x] After save, modal closes and entry appears at the top of the list.
- [x] **Edit**:
  - [x] Click `Edit` on a row → modal is pre-filled and saves update; row updates in list.
- [x] **Delete**:
  - [x] Click `Delete` → confirm modal message is exactly `"Delete this time entry? This cannot be undone."`
  - [x] Confirm removes the row from list.
- [x] **Manage developers link**:
  - [x] In create/edit modal, verify `"Manage developers →"` appears directly below developer dropdown.
  - [x] Clicking navigates to `/developers` (expected to 404 until Story 2.3 ships; **not a bug**).

**UI Location:** `/timesheets` (list + create/edit/delete UI)

---

### Story 2.3: Manage Developers (P1) — 3-4h
**Status:** ✅ Complete
**Owner:** B.A.

**Decisions (pre-made):**
- **Create/Edit:** modal on the `/developers` page (consistent with Tasks pattern)
- **Delete:** not available — developers are soft-deleted only (mark inactive). No hard delete in M1; deleting a developer with time entries would corrupt history.
- **Inactive = soft delete:** `isActive` flag toggled to false. No cascade. Developer remains in database and all historical time entries are preserved.
- **Filter:** toggle between "Active only" (default) and "All developers" — simple toggle, not a dropdown
- **Hourly rate:** optional field; no currency symbol in M1, plain number input
- **Email:** optional but validated as proper email format if provided
- **"Manage developers →" link:** this page is the destination for the link added in Story 3.1. Once 2.3 ships, that link stops 404-ing — no code change needed in 3.1.

**Acceptance Criteria:**

*List View:*
- [x] `/developers` shows developer list, default filter: active only
- [x] Columns: Name, Email, Hourly Rate, Status (Active / Inactive)
- [x] Toggle above table: "Active only" / "All" — switches filter without page reload
- [x] Empty state (active filter, no active devs): `"No active developers."`
- [x] Empty state (no developers at all): `"No developers yet. Add one to get started."`
- [x] "Add Developer" button (top-right) opens create modal

*Create Modal:*
- [x] Fields: Name (required), Email (optional), Hourly Rate (optional, ≥ 0)
- [x] Inline validation: Name required; Email must be valid format if provided; Hourly Rate must be ≥ 0 if provided
- [x] New developer defaults to Active
- [x] After save, developer appears in list, modal closes

*Edit Modal:*
- [x] Edit button on each row opens edit modal pre-filled
- [x] Same fields and validation as create
- [x] After save, row updates in place

*Deactivate / Reactivate:*
- [x] Active developers show a "Deactivate" button; clicking sets `isActive = false` with a confirm: `"Mark this developer as inactive? They will no longer appear in time entry dropdowns."`
- [x] Inactive developers (visible when "All" filter is on) show a "Reactivate" button; clicking sets `isActive = true` with no confirm needed
- [x] No hard delete option anywhere in the UI

**QA Checklist (Murdock):**
- [x] **Default view**: Visit `/developers` and confirm the default toggle is **Active only** and only active devs are shown.
- [x] **Toggle behavior**: Switch between **Active only** and **All**; table updates without a full page reload.
- [ ] **Empty states**:
  - [ ] If there are **0 developers total**, page shows `"No developers yet. Add one to get started."`
  - [ ] If there are developers but **0 active**, Active-only view shows `"No active developers."`
- [x] **Create**:
  - [x] Click `Add Developer` → modal opens.
  - [x] Name required validation.
  - [x] Email format validation (if provided).
  - [x] Hourly rate must be **≥ 0** if provided (verify `0` is accepted).
  - [x] New developer defaults to **Active** and appears in list after save.
- [x] **Edit**:
  - [x] Click `Edit` → pre-filled modal.
  - [x] Save updates row in place.
- [x] **Deactivate/reactivate**:
  - [x] Active dev shows `Deactivate`. Clicking opens confirm containing exact copy:
    - `"Mark this developer as inactive? They will no longer appear in time entry dropdowns."`
  - [x] Confirm sets status to **Inactive** (visible under All).
  - [x] Inactive dev shows `Reactivate` and **does not** prompt confirm.
- [x] **No hard delete**: Verify there is no delete button anywhere.
- [x] **Integration**: From `/timesheets` create/edit modal, click `"Manage developers →"` and confirm `/developers` loads (no 404).

**UI Location:** `/developers` (list + create/edit/deactivate UI)

---

### Story 4.3: Developer Productivity Report (P1) — 4-6h
**Status:** ✅ Complete (Hannibal sign-off 2026-04-12)  
**Owner:** B.A.

**Decisions (pre-made):**
- **Who appears in the table:** **Active developers only** (matches existing `ReportService.getDeveloperProductivity` — one row per active developer). Developers with **zero** time entries in the selected range still appear with `0` hours — that is correct.
- **Date range UX:** Same pattern as Actuals report (`/reports/[projectId]`): presets **Last 7 Days**, **Last 30 Days**, **This Month**, **All Time**, plus **custom** start/end date fields. Use `getPresetRange`, `startOfDay`, and `endOfDay` from `@/lib/date-utils` so boundaries match other reports.
- **Backend audit:** `report.developerProductivity` and `getDeveloperProductivity` already exist. B.A. must verify `startDate`/`endDate` are applied with **inclusive** day boundaries (wrap filter dates with `startOfDay` / `endOfDay` in the service if not already — parity with Actuals report).
- **Metric definition (Avg Hours/Active Day):** Backend computes `totalHours / (number of distinct calendar days with ≥1 entry in range)`. **Tooltip text (exact):** *"Average hours per calendar day on which this developer logged at least one entry in the selected range."*
- **Sorting:** Client-side sort on column header click. Default sort: **developer name A→Z**. Toggle asc/desc on repeat click for the same column.
- **Navigation:** Add a clear link from `/reports` to `/reports/productivity` (e.g. text link or secondary button next to the project picker flow).
- **Optional column:** API returns `entriesCount`; showing it in the table is **optional** — not required by AC.

**Acceptance Criteria:**

*Page & data:*
- [x] New page at `/reports/productivity` (App Router)
- [x] `/reports` includes navigation to `/reports/productivity`
- [x] Calls `trpc.report.developerProductivity.useQuery` with `startDate` / `endDate` derived from preset or custom range (both optional for "all time" behavior — align with how All Time is represented elsewhere, typically `undefined` both ends)
- [x] Table lists **active** developers with: **Developer name**, **Total hours** (formatted, e.g. one decimal + `h`), **Project count**, **Task count**, **Avg Hours/Active Day** (column header exactly as written; tooltip with exact copy above)

*Filters:*
- [x] Presets: Last 7 Days, Last 30 Days, This Month, All Time
- [x] Custom start and end date inputs; when set, they override / replace preset selection in a way consistent with the timesheets or actuals report UX

*Table behavior:*
- [x] All listed columns are **sortable** via header click
- [x] Loading and error states (reuse patterns from `/reports` — e.g. retry on failure)

*Empty state:*
- [x] When **no time entries** fall in the selected date range (all developers have 0 hours / 0 entries in range), show a single empty message: **`No time entries in this range.`** (no misleading table of all zeros — cleaner UX)

**QA Checklist (Murdock):**
- [x] `/reports` includes navigation to `/reports/productivity`
- [x] Default view loads without error; table shows active developers
- [x] Each preset changes totals predictably (compare narrow vs All Time on seeded data)
- [x] Custom range matches expected inclusion (same day boundary behavior as Actuals report)
- [x] Sorting: click each sortable column; order toggles and data looks correct
- [x] Tooltip on **Avg Hours/Active Day** matches spec wording
- [x] Empty state appears when range has no entries (use extreme past/future custom range if needed)
- [x] Spot-check: project count / task count match distinct projects/tasks from time entries in range (manual SQL or UI cross-check on one developer)

**UI Location:** `/reports/productivity`

**Implementation notes (B.A.):**
- Reuse `Modal` only if needed; this page is primarily a filter bar + table (like reports list + detail pattern).
- **Automated tests:** `tests/report-developer-productivity.test.ts` — service/router integration on shared DB with `finally` cleanup (see **`van/qa.md`** registry).

---

### Story 3.3: Excel Format Docs (P1) — 3-4h
**Status:** ✅ Complete (Hannibal sign-off 2026-04-12)  
**Owner:** B.A.

**Decisions (pre-made):**
- **Placement:** Add a dedicated documentation block on `/timesheets/upload` **above** the file picker (after the page title/subtitle). Keep the existing **Important** card; merge or dedupe so duplicate/timezone messaging is not repeated three times — one clear **Format** section + one **Important** callout is enough.
- **Example table:** Markdown-style table in the UI (HTML `<table>` or grid) showing **canonical** column headers aligned with the parser: `Developer`, `Project`, `Task`, `Date`, `Start Time`, `End Time`, `Duration (min)`, `Notes` (or the exact aliases the parser accepts — note "headers are matched flexibly, case-insensitive").
- **Template file:** Static asset at **`public/timesheet-template.xlsx`**. Minimum content: header row with those columns + one example data row (valid 15‑min duration). Link text e.g. **Download blank template (.xlsx)** — opens in new tab or downloads per browser default.
- **Date/time formats (on-page doc):** Summarize what `ExcelParser` supports — at minimum document: **ISO date `YYYY-MM-DD`** (local midnight), **Excel serial dates** (numeric cells), common **slash dates** (`M/D/YYYY` / `D/M/YYYY` where implemented), and that **time** fields accept typical `HH:MM` style values as implemented in the parser. Point to **`VANDURA_ARCHITECTURE.md`** or **`README.md` Excel section** for readers who want the short version — the upload page should be self-contained for a normal user.
- **Exact strings (must appear somewhere on the page):**
  - Timezone: **"All times are treated as local machine time (no timezone conversion)."** (may shorten slightly if the existing shorter line is kept — meaning must match.)
  - Duplicates: **"Importing the same file twice will create duplicate entries."** (already present — ensure it remains visible after layout changes.)
- **Automated tests:** `tests/story-3-3-excel-format-docs.test.ts` — committed template structure + `parseFile` preview smoke + required on-page strings (exact duplicate/timezone copy, template link, headings).

**Acceptance Criteria:**

*Upload page (`/timesheets/upload`):*
- [x] **Format / example:** Visible table illustrating expected columns (and note that flexible header matching applies)
- [x] **Template:** Working link to `/timesheet-template.xlsx` (file committed under `public/`)
- [x] **Date & time:** Short subsection listing supported date/time representations (not exhaustive code dump — user-facing bullets)
- [x] **Timezone** sentence present (see Decisions)
- [x] **Duplicate warning** present (see Decisions)

**QA Checklist (Murdock):**
- [x] `/timesheets/upload` loads; new doc section is readable without horizontal scroll on mobile width (sm breakpoint)
- [x] Template link downloads/opens a valid `.xlsx` with headers + sample row
- [x] Importing the template file (after parse) produces ≥1 preview row or clear validation — no false confidence if sample row is intentionally minimal
- [x] Duplicate + timezone copy still visible and accurate
- [x] No duplicate paragraphs saying the same thing in three places (consolidation check)

**UI Location:** `/timesheets/upload` (documentation section)

**Implementation notes (B.A.):**
- Generating `timesheet-template.xlsx`: use the same `xlsx` dependency as `ExcelParser`, or add a one-off script under `scripts/` that writes `public/timesheet-template.xlsx` — either commit the binary or document `npm run …` to regenerate. Prefer **committed binary** in `public/` so CI and clones work out of the box.

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
Last Updated: 2026-04-12 by Hannibal (Story 3.3 complete)
