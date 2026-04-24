# Project Vandura — User Stories & Acceptance Criteria

**Last Updated:** 2026-04-12 (Story **6.1** ✅ **Murdock + Hannibal sign-off**; Story **6.6** ✅; Phase C notes; 7.1–7.2)  
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
**Status:** ✅ Complete (Hannibal sign-off — CI sanitize tests + code review)  
**Owner:** B.A.

**Gap analysis (what already exists — do not re-implement blindly):**
- **Excel parse errors (expandable):** `/timesheets/upload` parse preview already uses `<details>` for **Errors** and **Warnings** with row-level copy. AC is **substantially met** — verify wording, default-expanded when `errors.length > 0` (optional polish), and cross-link from Story checklist.
- **Inline form validation:** `DeveloperForm`, `ProjectForm`, `TaskForm`, and timesheet create/edit modals already use red text under fields. **Audit** every user-facing form (`/projects/new`, `/projects/[id]/edit`, any page missing the pattern) and align styling (`text-sm text-destructive` under the control).
- **API / mutation errors today:** Mix of inline red boxes, `error.message` in page body, and **page-local** “toast” strips (not global, not top-right). AC explicitly wants **top-right** — requires a **global** mechanism.

**Decisions (pre-made — Hannibal):**
- **Global API toasts:** Add a **single** app-level notification surface, **fixed top-right** (`fixed top-4 right-4 z-50`), wired from **`QueryCache` / `MutationCache` `onError`** on `QueryClient` (TanStack v5 — not `defaultOptions.queries.onError`) **or** equivalent; use query `meta.suppressGlobalError` / mutation `meta.suppressGlobalToast` where inline/modal already handles the failure. Prefer **no new heavy dependency** if a small context + queue is enough; **sonner** is acceptable if B.A. wants shadcn parity (adds bundle size — justify in commit message if used).
- **Toast content:** User-safe string only — prefer `TRPCClientError` `message` or mapped friendly text. Never raw `cause` / stack in the toast body.
- **Inline validation remains primary** for Zod/client validation; toasts are for **server/network** failures and unexpected errors after submit.
- **Critical inline vs toast (M1 — no pre-merge allowlist doc):** **Critical inline** = the user would see a blank or meaningless shell with no way to recover if we only toast. That includes: dashboard; any list page whose entire body is the table (projects, timesheets, developers, reports list, productivity); project detail when the project header depends on `get`; report detail when the chart/table is the whole point. **Toast + inline** is allowed only when inline is a single slim line (e.g. “Couldn’t refresh”) and the toast carries the actionable message — avoid two paragraphs saying the same thing. **Elsewhere:** toast-only for mutation failures after submit where there is no dedicated red box in a modal; toast-only for background refetches when previous data can still show. If a case is ambiguous, default **toast-only** unless the PR justifies “blank shell” in **one sentence** — no allowlist required for M1. If anything still feels fuzzy during implementation: **fewer toasts, clearer inline** when the page would otherwise be empty.
- **Failed `useQuery` vs `useMutation`:** List/detail pages that already have a centered “Failed to load” + **Retry** — **keep** that block (it is not redundant with a toast). Optionally add a short toast on first failure — **not required** for M1. Do **not** replace a good inline error + Retry with toast-only unless the page stays useful without the inline (rare). **Mutations:** default toast for server failure after submit where there is not already a dedicated red box in the modal.
- **Toast spam / refetch storms (M1):** One toast per distinct failure event surfaced from the global handler (e.g. first query failure in a burst) is acceptable. **Nice-to-have:** dedupe the same error message within ~3s — implement if cheap; **not** a merge blocker if time is tight.
- **404:** `src/app/not-found.tsx` — friendly title, short explanation; Next.js App Router convention (no custom server). **Minimum per AC:** Home (`/`) + Projects (`/projects`). **IA parity with header:** also link **Timesheets** and **Reports** (same as primary nav). **Skip** `/developers` on the 404 page unless the header links Developers everywhere; keep 404 links aligned with primary nav, not every route.
- **Production error sanitization (`src/server/trpc.ts` `errorFormatter` or helper):** When `NODE_ENV === 'production'`: (1) Always sanitize known **DB / SQLite / Drizzle** shapes (`SqliteError`, `SQLITE_`, etc.). (2) For any **INTERNAL_SERVER_ERROR** (or 500-class) where the message looks **non-user-safe** (stack fragment, ` at `, file path, `ECONN`, empty, etc.) or is empty, map to the **same** generic client message as (1), e.g. **`Something went wrong while saving data. Please try again.`** Do **not** blanket-replace every message — only 500-class **plus** unsafe-looking (simple regex/heuristic is fine). **Omit** stack / internal `data` from the serialized error shape. **Development:** keep verbose behavior for debugging.
- **Out of scope for 5.1:** Auth errors, rate limiting, logging service, i18n. **Story 5.2** owns README / screenshots — do not fold screenshot work into 5.1.

**Acceptance Criteria:**

*Forms:*
- [x] Every create/edit flow shows **inline** validation errors (red text below the relevant field) before submit, consistent with existing modal forms (audit: no regressions; `ProjectForm` Cancel uses `Link`)

*Global API errors:*
- [x] Failed mutations / queries (where not already using a dedicated inline error region) surface a **top-right** dismissible notification with a clear user message (`GlobalToastProvider` + cache `onError`; `meta` suppresses double-notify on critical pages / modals)

*Excel:*
- [x] Parse preview: errors remain in an **expandable** list before import; confirm UX matches AC (adjust only if gaps found)

*Routing:*
- [x] `not-found.tsx` exists; unknown routes render friendly 404 (verify `/this-route-does-not-exist`); links include Home, Projects, Timesheets, Reports per **Decisions** (Developers on 404 — header links Developers)

*Production safety:*
- [x] DB/driver failures **and** leaky `INTERNAL_SERVER_ERROR` / 500-class messages do **not** expose stacks, paths, or driver internals to the browser in production — `trpc-error-sanitize.ts` + **`tests/trpc-error-sanitize.test.ts` green in CI** + code review of the production error path satisfy Hannibal sign-off **layer (2)** (serialized sanitize shape); see **QA expectations** below. **`next build` + `next start` + forced failure** is **not** required on top of that; optional only.

**QA Checklist (Murdock):**
- [x] Trigger a known validation error on each major form — inline red text, no duplicate toast unless intentional
- [x] Disconnect network or break `/api/trpc` — user sees top-right (or graceful fallback) without white screen
- [x] Upload file that produces parse **errors** — `<details>` list present, import blocked, copy readable
- [x] Hit a bogus URL — 404 page matches spec (nav links: Home, Projects, Timesheets, Reports; Developers only if per Decisions)
- [x] **Production sanitize (layer 2):** satisfied by **code review of the production error path** + **`tests/trpc-error-sanitize.test.ts` green in CI** (see **QA expectations — Hannibal**). Optional `next build` + `next start` + forced failure is **nice-to-have integration pass only** — **not** a second gate after CI + review.

**QA expectations — Hannibal (pre-flight, 5.1):**
- **Toast dedupe:** Duplicate toasts in rapid refetch / burst edge cases are **acceptable for sign-off** unless B.A. shipped ~3s dedupe — then verify dedupe works. **Not** a defect if two toasts differ in message or are >3s apart.
- **Production sanitize — canonical sign-off (layer 2):** **(1)** Code review of `trpc` `errorFormatter` + `sanitizeTrpcShapeForClient` (production branch + heuristics). **(2)** **`tests/trpc-error-sanitize.test.ts` green in CI** fulfills the “serialized shape / production sanitize” branch — together with **(1)** this is **sufficient** for Hannibal sign-off on layer (2). **`next build` + `next start` + `NODE_ENV=production` + a forced failure** is **not required** on top of that; use it only as an **optional** extra integration pass (**nice-to-have**, **not** a second gate). **Code review alone** (no green sanitize tests) remains **not** enough — escalate to Hannibal if tests were skipped.
- **Critical vs toast “feels wrong”:** If QA believes a page is **toast-only** but the shell is **empty or unusable** (no Retry, no prior data), file as **defect** with route + screenshot — same bar as any AC miss. If the page has **Retry + full inline** and QA only dislikes **optional** extra toast, that is **not** a defect (optional toast was explicitly not required).
- **Optional toast on first query failure:** QA **assumes no optional toast** unless they observe one; **no** failure if absent.

**Global error `meta` matrix (Murdock — avoid false positives):**

All **data queries** below use **`meta: { suppressGlobalError: true }`** → on failure: **no global toast** from the query cache; the route shows **inline** error UI (and **Retry** where implemented). Any **new** `useQuery` without this meta would incorrectly get a global toast on failure (treat as a bug if spotted).

| Area | `trpc` query / notes |
|------|----------------------|
| Dashboard `/` | `report.projectsSummary` |
| Projects `/projects` | `report.projectsSummary` |
| Developers `/developers` | `developer.list` |
| Timesheets `/timesheets` | `timesheet.list`, `developer.list` ×2, `project.list` ×2, `task.listByProject` (task dropdown) |
| Reports `/reports` | `report.projectsSummary` |
| Reports productivity | `report.developerProductivity` |
| Report detail `/reports/[projectId]` | `report.projectsSummary`, `report.actualsVsEstimates` |
| Project detail `/projects/[id]` | `project.get`, `task.listByProject` (TasksSection) |
| Edit project `/projects/[id]/edit` | `project.get` |

**Mutations with `meta: { suppressGlobalToast: true }`** → on failure: **no global toast**; failure is shown **in-context** (modal `submitError`, form strip, or upload page `error` / export `exportError`):

| Surface | Mutation(s) |
|---------|-------------|
| `/projects/new` | `project.create` |
| `/projects/[id]/edit` | `project.update` |
| `/developers` (create/edit modals) | `developer.create`, `developer.update` |
| `/timesheets` (create/edit/delete modals) | `timesheet.create`, `timesheet.update`, `timesheet.delete` |
| `/timesheets/upload` | `timesheet.parseExcel`, `timesheet.importExcel` |
| Report detail CSV | `report.exportCSV` (inline `exportError`) |
| TasksSection | `task.create`, **`task.update` from Edit modal only** (`updateTaskFromModal`) |

**Mutations without suppress** → on failure: **global top-right toast** (no dedicated inline for that action):

| Surface | Mutation(s) |
|---------|-------------|
| `/projects` | `project.delete`, `project.update` (status `<select>` on each row) |
| TasksSection | `task.delete` (confirm modal has no server-error line), **`task.update` from table status `<select>`** (`updateTaskInline`) |

**Forms audit (Story AC):** There is **no separate written checklist** beyond this story and the routes above. Murdock should **derive the form list from routes** (`/projects/new`, `/projects/[id]/edit`, `/developers`, `/timesheets`, project **Tasks** modals, **TaskForm**). Anything missing vs **inline red text under fields** before submit is a **gap** to log.

**Excel parse `<details>`:** Errors and warnings remain **collapsed by default** (no `defaultOpen`). Optional polish from gap analysis was **not** shipped; treat **default-expand when `errors.length > 0`** as **nice-to-have**, not AC miss.

**Automated tests for 5.1:** `tests/trpc-error-sanitize.test.ts` (production vs dev serialization rules + SQLite / unsafe INTERNAL heuristics — **layer (2)** with code review), `tests/story-5-1-global-errors.test.ts` (`getApiErrorMessage`, `createAppQueryClient` query/mutation `meta` + `emitGlobalToast` dedupe). **Still manual / not CI gates:** Next `not-found` route render, real browser toast UX. **Prod server smoke** (`next build` + `next start` + forced failure) is **optional** for sanitize sign-off — see **QA expectations — Hannibal** above.

**Implementation notes (B.A.):**
- Add **Developers** to header nav in `layout.tsx` if still missing (small UX fix; can ride with 5.1 or separate micro-commit).
- After delivery: update `van/qa.md` test registry only if new automated tests are added (optional: smoke test for `not-found` is low value).

---

### Story 5.2: Documentation (P1) — 3-5h
**Status:** ✅ Complete (Hannibal sign-off — 2026-04-17; judgments + evidence in **`van/qa.md` → Story 5.2 — Hannibal sign-off**)  
**Owner:** B.A.

**Acceptance Criteria:**
- [x] README: Setup instructions (Windows notes), usage guide, screenshots
- [x] Sample Excel file in `/public` — `public/timesheet-template.xlsx` (linked from README + upload page; no duplicate under `/examples` unless product asks)
- [x] Architecture doc accuracy review (VANDURA_ARCHITECTURE.md)
- [x] Screenshots: Dashboard, Excel upload, Actuals report (`docs/screenshots/*.png`)

**QA notes (Murdock):** Screenshots are environment-specific; verify links render on GitHub. Re-capture if branding or primary nav changes materially.

**Hannibal:** Story status was “Ready for QA” at Murdock handoff — moved to **Complete** on sign-off. Screenshot freshness (all three pixel-current vs **`excel-upload` only**), GitHub README image render, architecture spot-check, and post–5.2 **`npm test`** are recorded under **`van/qa.md` → Story 5.2 — Hannibal sign-off**.

---

## Phase C: Budget clarity & reporting UX (P2 — post-M1 showcase)

**Goal:** Make the **project-level hour cap** (`projects.estimatedHours` in DB) explicitly **budgeted time**, separate from **per-task estimates** (`tasks.estimatedHours`). Align copy and variance UX. Replace **`N/A`** for **unset** hours with **`TBD`**. **Story 6.2** adds a project-detail **second card** to surface tasks still missing estimates and make filling them in easy. **Story 6.3** adds **sortable** task lists, with **story number** as a first-class optional field for ordering. **Story 6.4** adds **hide/show completed** tasks on the project task board to reduce clutter. **Story 6.5** surfaces when a project’s **end date has passed** but it is **not** marked **completed**. **Story 6.6** improves **discoverability** of the Developer productivity report from **`/developers`**.

**Planning — Phase C scope is provisional (Hannibal):** **B.A. estimates** and **Murdock QA bands** are logged per story below. **Combined planning hours** = **B.A. implementation** + **Murdock testing** (same story). Optional B.A. add-ons (**6.1** migration, **6.2** dashboard stretch) are **not** included in the combined low band unless explicitly taken.

**B.A. original reference sequence:** **6.1 → 6.2 → 6.3 → 6.4 → 6.5 → 6.6** (dependency-friendly linear build).

**B.A. sequencing tweak (agreed with Hannibal):** **6.6** ships **first** (same estimate—quick **IA**). For **6.3** vs **6.4**, **either PR order works**: schedule **6.4** before **6.3** if you want the hide toggle on the current table first, or **6.3** before **6.4** if you want **sortable headers stable** before adding the toggle. **Product rule unchanged:** once **6.3** exists, the completed-task filter in **6.4** applies **on top of** the **sorted** row order (**Story 6.4** AC: client filter **after** sort from **6.3**).

**Hannibal execution order (final for Phase C):** **6.6 → 6.1 → 6.5 → 6.2 → 6.3 → 6.4**

- **6.6 first:** Matches B.A. tweak; smallest story; no dependency on budget or task schema.
- **6.1 second:** Establishes **Budget / TBD** vocabulary, **`projectsSummary`** invalidation, and report/dashboard copy baseline before more task-board churn.
- **6.5 third:** Extends **`projectsSummary` / `project.get`** and multi-surface cues **after** 6.1 copy and cache behavior are stable.
- **6.2 → 6.3 → 6.4:** Keeps **project-detail task work** contiguous. **Hannibal picks 6.3 before 6.4** (B.A.: either order acceptable): sort UI and migration land first; **6.4** then implements filter-after-sort per AC; Murdock still batches **6.3 + 6.4** regression.

**B.A. Phase C rollup (6.1–6.6, dev only):** ~**23–35h** (upper band mainly if **6.2** includes the dashboard “tasks TBD” stretch **and/or** B.A. does an optional **post–6.1** **`budget_hours`** migration PR — **6.1** itself is **copy-only**, no migration).

**Per-story Murdock QA (testing) — Hannibal allocation** (sums to **~12–18h** total Murdock for 6.1–6.6; aligns with Murdock’s informal rollup):

| Story | Murdock QA (h) | Murdock focus |
|-------|----------------|----------------|
| **6.1** | **3.5–5.5** | Copy sweep, `TBD`, CSV/legend, **`projectsSummary`** invalidation — largest regression surface |
| **6.2** | **2–3** | Second card, ≤2 clicks, empty states; +dashboard if stretch ships |
| **6.3** | **2–4** | Migration, sort keys, nulls-last, router/SQL tests |
| **6.4** | **1.5–2** | Hide toggle + **6.3** interaction, `localStorage`, a11y |
| **6.5** | **2–3** | `isProjectPastEndDate`, all consumers, injectable-clock test |
| **6.6** | **0.5–1** | One-click link, accessible name — smoke |

**Combined Phase C (B.A. + Murdock per story, planning bands):**

| Story | B.A. (h) | + Murdock (h) | Combined (h) |
|-------|----------|---------------|----------------|
| **6.1** | 8–12 *(+2–3 only for optional **follow-up** `budget_hours` PR — not in 6.1)* | 3.5–5.5 | **11.5–17.5** *(same follow-up note)* |
| **6.2** | 4–6 *(+1–2 dashboard stretch)* | 2–3 | **6–9** *(+1–2 stretch)* |
| **6.3** | 5–8 | 2–4 | **7–12** |
| **6.4** | 2–3 | 1.5–2 | **3.5–5** |
| **6.5** | 3–5 | 2–3 | **5–8** |
| **6.6** | 0.5–1 | 0.5–1 | **1–2** |

**Rollup (6.1–6.6, no B.A. optionals):** B.A. **~22.5–35h** + Murdock **~11.5–18.5h** → **~34–54h** end-to-end planning band for the full phase.

**M1 remainder vs Phase C (Hannibal):** **~20 hours** remain on the **first MVP** hour bank. **Full Phase C does not fit** inside 20h at current scope—even the **low-low** combined band (~**34h**) exceeds 20h. **Triage for M1 tail:** ship **6.6** + **6.4** + **6.5** at **low** estimates (~**9.5–15h** combined) *or* prioritize **6.1** (copy-only, no migration) + **6.6** (~**12.5–19.5h** combined) and **defer** remaining stories to **Phase C+** / next milestone—**Hannibal + B.A. confirm** which slice before locking sprint.

**Optional Phase C candidates (if triaged in):** e.g. Reports hub → Upload link — **+0.5–1h** Murdock smoke; Excel → **`story_number`** — treat like a small feature (**+2–4h** depending on parser/tests).

**Not included in table above:** **Story 7.1–7.2** import integrity (**roughly +8–20h** Murdock if sized like dev — **highly scope-dependent**).

---

### Story 6.1: Project budget vs task estimates (P2) — **6–10h** (Hannibal informal) · **B.A.: 8–12h** (**copy-only** on **`projects.estimatedHours`** per Hannibal — no DB rename in 6.1; surfaces + `projectsSummary` invalidation + report/CSV + README/legend) · *Optional **follow-up** PR: `budget_hours` migration + rename ~**+2–3h** — not required to close 6.1* · **Murdock QA: 3.5–5.5h** · **Combined (planning): ~11.5–17.5h** *(migration band applies only to follow-up)*

**Status:** ✅ Complete — **Murdock QA ✅** · **Hannibal sign-off ✅** (evidence: [`van/qa.md`](qa.md) → Story 6.1)  
**Owner:** B.A.

**Problem statement:** The projects list and dashboard aggregate **actual hours** from time entries but treat **`projects.estimatedHours`** as the baseline for variance. That field is **not** a roll-up of task estimates; task edits do not change it. Users expect either one coherent “estimate” story or clear **budget vs task forecast** language plus optional comparison UI.

**Decisions (Hannibal — pre-flight):**
- **Budget = `projects.estimatedHours`:** No requirement to rename the DB column in M1 follow-up; **in-app copy and docs** should say **Budget** / **budgeted hours** for the project field. If B.A. prefers a `budgetHours` column + migration for clarity, that is **in scope** as an implementation choice—call it out in the PR.
- **Task line stays “estimate”:** Task table and task modals keep **Estimated hours (optional)** for the **task-level** forecast; do not relabel those to “budget.”
- **Variance definition (unchanged math):** Project-level variance remains **`actual − budget`** when budget is set; null/0 budget keeps existing “no variance %” behavior unless this story tightens copy.
- **TBD vs N/A (unset hours):** When **project budget** or a **task estimated hours** cell is unset (`null` / not yet filled), show **`TBD`** — meaning “to be filled in,” not **`N/A`** (which reads like “not applicable” or bad data). Apply across dashboard, `/projects`, `/reports`, project detail, actuals report labels/tables, and task tables where those cells appear; **CSV** may emit `TBD` or leave blank with a **README/legend** note — B.A. picks one approach and documents in PR.
- **Optional comparison (recommended in scope):** On **project detail** (`/projects/[id]`), show **two** numbers: **Budget (project)** and **Sum of task estimates** (computed from tasks), plus a short line when they differ (e.g. “Task estimates total 120h vs project budget 100h”) — **informational only** unless Hannibal later approves auto-sync.
- **Cache / freshness:** Invalidate **`report.projectsSummary`** (and any other consumers) when **task** create/update/delete and **time entry** create/update/delete affect numbers users see on `/projects` and `/`. Treat as **in scope** for 6.1 so actuals refresh without full reload.
- **Out of scope for 6.1:** Auto-writing project budget from sum of tasks (requires explicit product rule); the **“tasks missing estimates”** second card (**Story 6.2**); **task list sorting / story number** (**Story 6.3**); **hide completed tasks toggle** (**Story 6.4**); **past end date visual** (**Story 6.5**); Story **3.4** parse remediation; **1.2** dev scripts.

**Decisions (Hannibal — Story 6.1, B.A. Q&A):**

- **Project budget: `0` vs `null`:** **`null` / unset → `TBD`**. **`estimatedHours === 0` on the project** is an **intentional zero budget** — show **`0` / `0h`** (not **TBD**). **Variance vs actual:** keep **today’s behavior** for null/0 budget (no change to math unless a bug is discovered).
- **Sum of task estimates when some tasks have `estimatedHours === null`:** Hannibal chooses **(B)** — show the **sum line as `TBD`** if **any** task in the project still has **unset** (`null`) **task** `estimatedHours`. **Do not** imply a complete numeric total until every task has a numeric estimate (including explicit **`0`** where **0** means “set to zero”). **Rationale:** avoids false precision; aligns with **TBD = not fully specified yet**.
- **Project detail comparison block — partial data:** **Always show both labels** (**Budget** and **Task estimates total**) so the block does not appear/disappear. **Budget set, all task estimates `null`:** **Budget: Xh** · **Task estimates total: TBD**. **Budget `null`, every task has a numeric estimate:** **Budget: TBD** · **Task estimates total: Xh**. **Budget `null` and any task estimate still `null`:** both totals that depend on unknowns stay **TBD** (numeric sum **not** shown until **(B)** is satisfied).
- **CSV — compatibility vs clarity:** **Default for 6.1:** keep **existing column headers** where external consumers might depend on shape; add **README + export legend** (and/or tooltip copy in-app) to spell **budget vs task estimated** semantics. **Column renames** are **allowed** only if the PR **documents** the breaking shape change and B.A. calls it out for integrators — **not required**; Hannibal has **no** “must rename in M1 follow-up” rule and **no** “must never rename” rule — **legend-first**, rename **optional** with disclosure.
- **Scope sweep beyond named routes:** **Yes** — include **`/timesheets`** and **`/timesheets/upload`** (and any other in-app surface) if it shows **project** or **task** hour cells that today use **`N/A`** (or equivalent **unset** treatment) for **budget** or **task estimate**. **Developer productivity** (`/reports/productivity`): **out of scope for 6.1** by default (no project budget / task estimate grid there today); if a string slips in during audit, **incidental copy fix** in the same PR is OK if trivial.
- **`N/A` vs other empty glyphs:** **6.1 goal:** replace the **literal `N/A`** (and UI paths that **explicitly** mean “unset budget / unset task estimate”) with **`TBD`**. **Optional consistency:** where **`—`** / **empty** in the **same columns** clearly means the same **unset** semantic, align to **`TBD`** for **budget** and **task estimate** columns only — **do not** refactor unrelated empty states; **list exceptions** in the PR.
- **`budgetHours` DB rename:** Hannibal **prefers `copy-only` for 6.1** (no migration): ship **labels + invalidation + docs** on existing **`projects.estimatedHours`**. A follow-up PR may introduce **`budget_hours`** + migration if B.A. still wants SQL clarity — **not required** to close **6.1**.

**Acceptance Criteria:**

*Naming & copy (project-level baseline):*
- [x] **Dashboard** (`/`): Summary card and active-projects table label **budget** (e.g. “Total budgeted hours”, column “Budget”) — not “Estimated” for the project cap; subtitle/help text if needed so readers know this is the **project** field from create/edit.
- [x] **Projects list** (`/projects`): Column header and row copy use **Budget** / **budgeted hours** (or equivalent); page subtitle updated (“budget vs actual” not “estimated vs actual” if that is the only meaning).
- [x] **Projects list + dashboard active table + reports list — three-way hours:** Surfaces driven by `report.projectsSummary` show **project budget** (`projects.estimatedHours`), **task estimates total** (sum of task `estimatedHours` with **Hannibal (B)**: numeric only when every task has a set estimate; otherwise **TBD**), and **actual hours** (time entries), so users can compare all three at a glance. **`projectsSummary`** exposes **`taskEstimatesTotal`** (server-computed via `taskEstimatesTotalFromRollup` in `budget-display.ts`, same rule as project-detail / **B**). Applies to **`/projects`**, **`/`** (active-projects table), and **`/reports`** summary table; actuals report (`/reports/[projectId]`) top cards include **Task est. total** from the same query.
- [x] **Project detail header** (`/projects/[id]`): Field currently labeled “Estimated hours” for the **project** shows **Budget** (or “Budgeted hours”) with one-line helper: task estimates are separate.
- [x] **Project create/edit** (`ProjectForm`): Label + validation messages use **budget** wording; optional inline note that **task estimates** on the tasks tab are independent.

*Unset values (TBD):*
- [x] Replace **`N/A`** display for **unset** (`null`) project budget and **unset** (`null`) task estimate cells with **`TBD`** everywhere in scope for Story 6.1 (lists, detail, actuals report, dashboard cards/tables, **timesheets** / upload **import** path via cache invalidation per B.A. Q&A, as applicable). **Project budget `0`:** show numeric **zero**, not **TBD**. **Exception list** (if any) documented in PR — e.g. CSV column policy.

*Comparison & insight:*
- [x] **Project detail:** Display **Budget** and **Task estimates total** side by side. **Sum rule (Hannibal):** show a **numeric** sum only when **every** task has **`estimatedHours` not `null`** ( **`0` allowed** as “set”); if **any** task is still **`null`**, show **Task estimates total: TBD** (see **B.A. Q&A**). Show a neutral comparison line when both sides are numeric **and** differ (no alarmism—copy TBD in PR, e.g. “Task estimates total Xh · Project budget Yh”). **Partial data:** still render both labels (**Budget** + **Task estimates total**) with **TBD** where unknown.

*Reports & export:*
- [x] **Actuals vs estimates** (`/reports/[projectId]`): Disambiguate **project** summary line: user-facing label for project baseline = **Budget** (task rows keep “Estimated” for task hours). Sort/tooltips updated for consistency.
- [x] **CSV export** from that report: **Prefer** unchanged headers + **README/legend** for semantics (**Hannibal**). Header renames **allowed** if documented for integrators; not required (**B.A. Q&A**).

*Engineering & QA:*
- [x] **tRPC/React Query:** After mutations that change **aggregates** (tasks, time entries, project budget), **`report.projectsSummary`** invalidates so `/`, `/projects`, `/reports` stay fresh without hard refresh.
- [x] **Tests:** `tests/budget-display.test.ts` (incl. `taskEstimatesTotalFromRollup`), `report-service` CSV/TBD; Story 3.3 upload page tests **unaffected**; **Murdock:** README screenshot pass **optional** if dashboard strings change materially (`van/qa.md`).

*Documentation:*
- [x] **`README.md`** (short): One paragraph or bullet under product description — **project budget** vs **task estimates** vs **actuals**.
- [x] **`VANDURA_ARCHITECTURE.md`**: One subsection or table row clarifying the two fields and which surfaces show which.

**Implementation (shipped):** `src/lib/budget-display.ts` (format + task-sum rule **B** + `taskEstimatesTotalFromRollup` + active-project budget rollup). **`projectsSummary`:** `ReportService.getAllProjectsSummary` includes **`taskEstimatesTotal`**. UI: `page.tsx`, `projects/page.tsx`, `reports/page.tsx` (columns **Budget**, **Task est. total**, **Actual** + variance); `reports/[projectId]/page.tsx` (fourth summary card). CSV: `ReportService.exportToCSV` — unchanged. Invalidation: unchanged.

**QA sign-off:** **[`van/qa.md`](qa.md) → Story 6.1** — Murdock regression + Hannibal definition-of-done. **README screenshots** were **not** recaptured for this story (explicit skip per handoff); sign-off is **not** blocked on pixel drift in `docs/screenshots/`.

---

### Story 6.2: Tasks missing estimates — project “TBD” card & fast edit (P2) — **4–6h** (Hannibal informal) · **B.A.: 4–6h** (project-detail card + invalidation + focused test); **+1–2h** if including dashboard “tasks TBD” aggregate stretch · **Murdock QA: 2–3h** · **Combined (planning): ~6–9h** *(+1–2h stretch)*
**Status:** Not Started  
**Owner:** B.A.

**Goal:** Make it obvious **which tasks** still need an **estimated hours** value, and make adding that estimate **low-friction** (without forcing estimates at task creation).

**Scope:**
- **Primary surface — project detail (`/projects/[id]`):** Add a **second card** (placement: e.g. below the project header / budget strip or below the tasks table — B.A. chooses in mockup) titled along the lines of **“Tasks awaiting estimates”** or **“Estimates TBD”** listing **tasks for this project** where `estimatedHours` is `null` (and optionally treat `0` as set vs unset per PR — default: **null only**).
- Each row: task name (and status if helpful) + **primary action** to **open the existing task edit flow** (modal or inline) focused on the estimate field — **no duplicate task editor** unless cheaper to ship a minimal inline hours control; prefer reuse of `TasksSection` / `TaskForm`.
- **Empty state:** When all tasks have estimates, card shows a short **“All tasks have estimates”** (or hide card — **pick one** in PR; Hannibal prefers **short affirmative** so the layout does not jump).
- **Optional stretch (same story if time):** A **compact** aggregate on **dashboard** (`/`) — e.g. count of tasks TBD across **active** projects with a link to **first project** or to `/projects` — **only** if it does not bloat scope; otherwise **defer** to Phase C+.

**Acceptance Criteria:**
- [ ] Second card on **project detail** lists tasks missing `estimatedHours` (per rules above); copy uses **TBD** language aligned with 6.1.
- [ ] From a row, user can reach **task estimate edit** in **≤2 clicks** from card interaction (Hannibal bar).
- [ ] After saving an estimate, card list **updates** without full page reload (invalidate/refetch `task.listByProject` and card query).
- [ ] **Tests:** At least one test or Playwright-free assertion that the list query/filter matches `null` estimates (or unit test on selector/helper if UI test too heavy).

**Out of scope for 6.2:** Bulk edit across projects; mandatory estimates on create; notification emails; **column sorting / story number** (**Story 6.3**); **hide completed tasks** (**Story 6.4**).

---

### Story 6.3: Task list sorting & optional story number (P2) — **3–5h** (Hannibal informal) · **B.A.: 5–8h** (Drizzle migration + `listByProject` sort args + nulls-last + table headers + TaskForm story # + ≥2 router/SQL ordering tests) · **Murdock QA: 2–4h** · **Combined (planning): ~7–12h**
**Status:** Not Started  
**Owner:** B.A.

**Context:** `/projects/[id]` task table today has **no** `orderBy` in `task.listByProject` — row order is effectively arbitrary. There is **no** `story_number` column on **`tasks`** today; “sort by story number” needs a **stored, optional** field (parsing story IDs from free-text **`name`** is **out of scope** — fragile).

**Product choice (Hannibal):** Use a **dedicated Story # column** (not embedded-only in task name) — clearer for imports, sorting, and reporting.

**Goal:** In **one pass** through this table and `listByProject`, ship **sortable headers** for **all** primary task columns: **Story #**, **Name**, **Status**, and **Estimated hours** — same affordance as Developer Productivity (click header, toggle asc/desc, visible sort indicator). **Rationale:** wiring sort for **status** and **estimated hours** while already touching router + table is **low marginal cost** vs a later “sort polish” story. **Actions** column stays non-sortable.

**Default** when opening a project: **story number ascending, nulls last** (tasks without a story number after numbered ones).

**Scope:**
- **Schema:** Add nullable **`story_number`** `INTEGER` on `tasks` (Drizzle + SQL migration); seed updates if sample tasks should demo sorting.
- **API:** Extend **`task.listByProject`** with sort key + direction (validated enum covering **`story_number`**, **`name`**, **`status`**, **`estimated_hours`**); stable tie-breaker (e.g. `id` or `name`) when values equal; **nulls-last** policy for story # and for estimated hours when sorting those columns (document in PR).
- **UI (`TasksSection` / `TaskForm`):** Dedicated **Story #** column (optional on create/edit); **all four** data columns have **sortable** headers; **Story #** and **estimated hours** cells use **TBD** when null (aligned with **6.1**).
- **Surfaces:** **Project detail** task table is **required** for 6.3 v1; any other task lists — **document** in PR if touched or explicitly “unchanged.”

**Acceptance Criteria:**
- [ ] Migration applied; existing tasks have `story_number` **null** — no data loss.
- [ ] Create/edit task can set/clear **story number** (integer validation: non-negative or positive-only — **B.A. documents** in PR).
- [ ] Task table: **every** of **Story #**, **Name**, **Status**, **Estimated hours** is **sortable** (asc/desc + indicator); **default** sort **story number asc, nulls last**; **Actions** not sortable.
- [ ] **Tests:** Ordering covered for **at least two** keys (e.g. `story_number` + `status` or `estimated_hours`) at router/SQL level — expand if cheap.

**Out of scope for 6.3:** Parse story numbers from **task name**; Excel import mapping into `story_number` (**capture** under parse/Excel backlog if wanted); **parent/child** tree sort (`parentTaskId` exists; flat-task MVP unchanged unless expanded); **hide completed tasks** (**Story 6.4**).

---

### Story 6.4: Hide / show completed tasks (project task board) (P2) — **2–3h** (Hannibal informal) · **B.A.: 2–3h** · **Murdock QA: 1.5–2h** · **Combined (planning): ~3.5–5h**
**Status:** Not Started  
**Owner:** B.A.

**Goal:** On **`/projects/[id]`** task table, let users **temporarily hide** rows where **`status === 'completed'`** so the board stays readable; one control to **toggle** visibility without deleting data.

**UX (Hannibal):**
- Small **eye** icon (or eye-off when hidden) placed **beside the Status column** — e.g. in the **Status** header cell (right-aligned in header next to label) or immediately adjacent per mockup — **single control** for the whole table.
- **Click:** toggles **hidden** vs **visible** for completed tasks; **accessible**: `aria-pressed`, `title` / tooltip (“Hide completed tasks” / “Show completed tasks”).
- **Default:** completed tasks **visible** (current behavior) unless PR documents a different default.

**Implementation notes:**
- **Schedule:** Phase plan uses **6.3** then **6.4** (sort UI before hide toggle). B.A.: **either** merge order is acceptable; if **6.4** lands first, keep behavior consistent with **filter-after-sort** once **6.3** exists (see Phase C **Planning**).
- **v1 preference:** **Client-side** filter on the data already loaded by `task.listByProject` (no API change required) — apply **after** sort from **6.3** so order stays stable for visible rows.
- **Persistence (recommended):** Remember choice **per project** in **`localStorage`** (e.g. key `vandura.tasks.hideCompleted.{projectId}`) so refresh keeps state; **session-only** is acceptable if B.A. wants zero persistence — document in PR.
- **Story 6.2 card:** The **“tasks awaiting estimates”** card remains driven by **`estimatedHours` null** across **all** statuses (or document if it should respect the same toggle — **default: card unchanged** so PMs still see completed work missing estimates).

**Acceptance Criteria:**
- [ ] Toggle hides **only** tasks with status **`completed`**; all other statuses always visible in v1.
- [ ] Icon state reflects mode (eye vs struck / eye-off — **B.A. picks** icon set consistent with app; avoid ambiguous icons).
- [ ] Toggling does **not** mutate server data; completed tasks reappear when shown again.
- [ ] **Tests:** Optional lightweight test of filter helper or component state; **Murdock:** manual check hide + edit completed task + unhide.

**Out of scope for 6.4:** Multi-status filters (e.g. hide blocked); hiding on other pages; server-side `includeCompleted` query param (**defer** unless needed for performance).

---

### Story 6.5: Past project end date — visual cue (non-completed) (P2) — **2–4h** (Hannibal informal) · **B.A.: 3–5h** (`projectsSummary` + dates on consumers + badge/icon + injectable-clock unit test) · **Murdock QA: 2–3h** · **Combined (planning): ~5–8h**
**Status:** Not Started  
**Owner:** B.A.

**Problem:** If **`projects.endDate`** is set and that **calendar date has passed**, but **`projects.status`** is still **`active`**, **`on-hold`**, or **`cancelled`** (anything other than **`completed`**), nothing in the UI calls out that the plan window is over. PMs want a **quick visual** without changing data automatically.

**Rule (Hannibal — v1):**
- **Trigger:** `endDate != null` **and** the project’s end date is **strictly before today’s local calendar date** (inclusive end-of-day boundary — **match** date handling used elsewhere in the app, e.g. report presets).
- **Show cue when:** `status !== 'completed'`.
- **`cancelled`:** **Default:** **no** overdue-style cue (treat as intentionally stopped); **optional** muted label — **B.A. documents** if product prefers otherwise.
- **`on-hold`:** Show cue (deadline still meaningful) unless PR agrees with a softer treatment.

**Visual (B.A. picks one or combines subtly):** e.g. **badge** (“Past end” / “End date passed”), **row or card left border** tint, **icon** beside project name, **tooltip** with the stored end date — must meet **contrast** and **accessibility** (not color-only; `title` or visible text).

**Surfaces (all that show project + status + should reflect schedule):**
- [ ] **`/projects`** list (uses `report.projectsSummary` today — **extend** summary payload with **`endDate`** (and **`startDate`** if needed for symmetry) so the client can compute **past end** without a second round-trip).
- [ ] **Dashboard** (`/`) active-projects table (same `projectsSummary`).
- [ ] **`/reports`** project picker / summary table if it lists projects from the same query.
- [ ] **Project detail** header (`/projects/[id]`) — project already loaded via `project.get`; add cue near dates or title.

**Acceptance Criteria:**
- [ ] Past-end + not-`completed` → at least **one** clear visual on **each** surface above that applies.
- [ ] **`completed`** projects **never** show the overdue/past-end cue (even if `endDate` in the past).
- [ ] **`endDate` null** → no cue.
- [ ] **Tests:** Unit test for `isProjectPastEndDate({ endDate, status, now })` helper (inject clock) or equivalent — **timezone = local calendar day** per app convention.

**Out of scope for 6.5:** Auto-flip status to completed; email/notifications; gantt timeline.

---

### Story 6.6: Developers page → Developer productivity report (IA) (P2) — **0.5–1h** (Hannibal informal) · **B.A.: 0.5–1h** · **Murdock QA: 0.5–1h** · **Combined (planning): ~1–2h**
**Status:** ✅ Complete
**Owner:** B.A.

**Problem:** **`/reports/productivity`** (Developer productivity) exists but is **hard to find** from **`/developers`** — users must know to open **Reports** first and spot the right destination.

**Scope:** On **`/developers`**, add a **visible text link** (and optional short subline) to **`/reports/productivity`** — e.g. next to the page title or in the top action row near **Add developer** — copy along the lines of **“View developer productivity report →”**. Use **`next/link`**; no new data fetching.

**Decisions (Hannibal — Story 6.6, B.A. Q&A):**

- **Link label (copy & tone):** Primary visible text: **“View developer productivity report”** (verb + destination; matches in-app language: it lives under **Reports**). A trailing **→** or light chevron is **optional** if it stays one focusable control with a single clear **accessible name** (prefer **name** = the full sentence without relying on the arrow alone). Avoid **“dashboard”** here — the destination is the **Developer productivity** **report** route (`/reports/productivity`).
- **Optional subtext:** **Yes, one line is allowed** under the page title **or** directly under the link — **Hannibal approves** final product copy; B.A. may ship a draft (e.g. *“See hours, projects, and tasks by developer for a date range.”*); Murdock may flag a11y/length only — no separate PM beyond Hannibal for this microcopy.
- **Placement:** **Primary:** top **action row**, **next to “Add developer”** (same visual band as other primary actions). **Do not** duplicate the same link in two places for 6.6 unless one is clearly secondary (Hannibal: **one** primary link is enough). **Mobile:** Prefer **one row** when it fits; if the row crowds, **stack** the link **below** the title + actions block so it remains **tappable** and **above the fold** when reasonable — not a hard AC.
- **`/reports` hub:** **Strict:** no layout or navigation changes to **`/reports`** in **6.6** (AC unchanged).
- **After 6.6 (Phase C order):** **Next story is 6.1** (budget / **TBD** / `projectsSummary` invalidation) per Hannibal execution order — **not** 6.2 unless Hannibal explicitly re-sequences.
- **Demo / sign-off bar:** Success = **one click** from **`/developers`** to **`/reports/productivity`**, link **keyboard-focusable**, **accessible name** reads sensibly in a screen reader (not “click here”). **1366×768 above the fold** is **desired** for the primary link, **not** a formal AC — ship the best default layout B.A. chooses within the placement rules above.

**Acceptance Criteria:**
- [x] From **`/developers`**, user reaches **`/reports/productivity`** in **one click** without using the main Reports hub first.
- [x] Link is keyboard-focusable and has clear accessible **name** (not “click here”).
- [x] **Out of scope:** Duplicating report content on `/developers`; changing `/reports` layout.

**Implementation (shipped):** `src/app/developers/page.tsx` — **`next/link`** in the top action row next to **Add developer**; label **“View developer productivity report”**; subline (Hannibal editorial, aligned with **Developers** page title): *“Hours, projects, and tasks by developer for a selected date range.”* `tests/story-6-6-developers-productivity-link.test.ts` locks link text + `href`, subline copy, and source-order vs **Add Developer**. **`/reports` hub untouched.**

**Hannibal sign-off:** Likes the page. **Optional polish (not blockers):** (1) The app **shell** still renders an **h1** “Vandura” in `layout` while the page has its own **h1** (e.g. “Developers”) — **two top-level headings** is a **pre-existing** pattern across the app, **not** introduced by 6.6; fixing it would be a **global** nav / heading-level **a11y** pass, out of scope for 6.6. (2) The report **text link** is visually **lighter** than the **Add developer** primary button — **appropriate** so the main CTA stays “add” while the report stays discoverable.

**Phase note:** **First** in Hannibal’s Phase C execution order (see **Planning** above) — small IA before budget/summary/task-board batch. **Next:** **6.1**.

---

### B.A.: Optional Phase C candidates (triage — not in Hannibal’s base 6.1–6.6 list)

Small items that **fit the same release train** (budget / tasks / IA) if Hannibal wants them **without** expanding Phase C scope to import integrity (**7.x**) or deferred **1.2** / **3.4**.

| Candidate | Rationale | Rough size |
|-----------|-----------|------------|
| **Reports hub → Upload** (`/reports` → `/timesheets/upload`) | Mirrors **6.6** (“where do I upload?”); one `next/link` + copy. | **0.5–1h** |
| **README / screenshot hygiene** after **6.1** | Budget + TBD copy may change dashboard strings; optional Murdock pass per `van/qa.md`. | **0.5–1.5h** |
| **Excel → `story_number`** (follow **6.3**) | Optional once column exists; needs parser + sheet contract + tests. | **3–6h** |
| **“Sync project budget from sum of task estimates”** (explicit control) | Hannibal kept **auto-sync** out of **6.1**; gated button + confirmation is a **separate** product story. | **2–4h** |

**Keep out of Phase C by default:** **7.1–7.2** (import pack — own milestone), **1.2** (dev stability), **3.4** (parse remediation), **pie/donut** idea until interpretation A/B/C is chosen (see **Captured ideas** below).

---

## Captured ideas (not in Phase C sequence — backlog)

These items are **on record for planning** but are **not** committed deliverables for **Stories 6.1–6.6** unless Hannibal explicitly expands Phase C.

### Idea: Budget vs task status — pie / donut report

**Intent:** A visual report (e.g. **pie or donut chart**) so PMs can see how **project budget** lines up with work **by task status** — e.g. share of scope in **completed** vs **pending** vs **in progress** vs **blocked** (per Vandura’s task status enum).

**Product / data definition (must be resolved before sizing):** **Budget** is a **project-level** number; **status** lives on **tasks**. The chart could mean different things:

- **Interpretation A — Task estimates by status:** Slices = **sum of `tasks.estimatedHours`** grouped by `tasks.status` (only tasks with numeric estimates; **TBD** tasks need a rule: separate “Unestimated” slice, exclude from chart, or force 6.2 cleanup first).
- **Interpretation B — Actuals by status:** Slices = **sum of logged hours** on time entries, grouped by the **task’s current status** (or status at entry time — **snapshot vs current** is a schema/product choice).
- **Interpretation C — Composite:** e.g. donut = budget vs **remaining budget**; inner ring or second chart = distribution of task estimates across statuses — richer but more build + test cost.

**Placement ideas:** Tab or card on **`/projects/[id]`**, section on **`/reports/[projectId]`**, or linked “Budget breakdown” from project detail after 6.1 lands.

**Stack note:** **Recharts** is already a dependency; pie/donut is feasible once metrics are defined.

**Phase placement:** Treat as **Phase C+** or a **small “report pack”** story after **6.1–6.6** (or whatever set remains after **B.A. estimate triage**) — **not** in the current Phase C sequence until Hannibal picks A/B/C (or a hybrid) and B.A. estimates.

---

## Import integrity (future — Stories 7.1–7.2)

**Context:** MVP shipped with **explicit “allow duplicate imports”** (see `tests/timesheet-router-excel.test.ts`, `VANDURA_ARCHITECTURE.md`). **Story 7.1** — row-level policy: **no duplicate** logical entries; **identical** re-import **no-op**; **conflicts** need **user review**. **Story 7.2** — separate batch concern: users sometimes want to **“dump the whole timesheet”** (replace a whole slice of work) and, if they **reject** after problems, to **drop only the entries from that import/timesheet** — not hand-delete row by row.

### Story 7.1: Excel import — no duplicate entries; no-op on identical re-import; review on conflict (P1–P2) — **B.A.: 14–22h** (full draft AC: canonical identity row + weekly grid, preview warnings, conflict review UI, tests + docs); **10–14h** only if Hannibal narrows to **block import + summary** without per-row resolution UI
**Status:** Not Started  
**Owner:** B.A.

**Goal:**
1. **No duplicates:** Do not insert a new `time_entries` row when it would duplicate **the same logged work** (definition below).
2. **Identical replacement attempt:** If incoming rows **match** existing rows on the canonical key **and** all compared fields are **equal** (no net change), **skip** those rows — **no DB write**, user sees a clear summary (e.g. “0 new rows — data already matches” / per-row skipped counts).
3. **Conflict:** If incoming data **targets the same logical slot** as an existing entry (same developer / project / task / time identity — **exact key TBD in PR**) but **differs** in any user-visible field (e.g. duration, description, times), **do not** silently overwrite. The user must **review** (e.g. side-by-side or “existing vs proposed”) and **choose** per row or batch: **replace**, **keep existing**, or **skip** — **Import** commits only after conflicts are resolved or deferred rows excluded.

**Hannibal — design notes (B.A. refines in PR):**
- **Canonical identity** for “same work” is the crux — likely includes **developer**, **task** (or project-level null task), **local calendar date**, and **start time + duration** (or start + end). **Weekly-grid** vs **row** Excel paths must map to the **same** comparison rules.
- **Overlap without exact key** (e.g. adjacent 15-min slots) — **out of scope for v1** unless B.A. expands; document edge cases.
- **Parse preview** step should surface **warnings**: would-create-duplicate vs **would-conflict** before final import where feasible.

**Acceptance Criteria (draft):**
- [ ] Import path enforces **no silent duplicate** inserts per canonical rule.
- [ ] **Fully identical** re-import produces **no new rows** and a **clear** user-visible outcome (counts / message).
- [ ] **Conflicts** block or gate final commit until user **reviews and decides** (minimum UX defined in PR — table + actions).
- [ ] **Docs:** Update **README**, **`/timesheets/upload`** copy, **`VANDURA_ARCHITECTURE.md`**, **`van/project.md`** Key Technical Decisions — remove “duplicates allowed” as the long-term policy once behavior ships.
- [ ] **Tests:** Replace or extend **`tests/timesheet-router-excel.test.ts`** duplicate-import expectation; add cases for **identical skip** and **conflict review** (mock-friendly where possible).

**Phase placement:** **Not** part of Phase **6.x** unless explicitly triaged in; default **Story 7.1** / **import pack** after Phase C or as its own milestone. **Depends on:** stable parse → row mapping (Story **3.2** foundation already in place).

**Out of scope for 7.1:** **Whole-timesheet replace** semantics and **discard this import’s rows** after user abort — **Story 7.2** (needs batch identity on rows or a staging model).

---

### Story 7.2: Whole-timesheet import / replace scope + “discard this import” (P1–P2) — **B.A.: ~10–16h** fork **A** (`import_batch_id` + discard UI + tests); **~16–26h** fork **B** (staging); **~12–20h** fork **C** (window replace, higher product/QA risk). **Import pack rollup (7.1 + 7.2):** ~**24–45h** depending on fork + conflict UX — **not** folded into Phase C unless explicitly triaged in.
**Status:** Not Started  
**Owner:** B.A.

**Problem:** Today **`importExcel`** commits **one atomic transaction** for all parsed rows once parse errors are clear — there is **no** persisted **import batch id** on `time_entries`, so the product **cannot** say “delete everything we just added from *this* timesheet upload” if the user later decides the sheet had **too many problems** to keep. Users who think in **whole timesheet** units want either: (a) **replace** all rows attributable to a prior upload of “this sheet,” or (b) after a **staged** or **multi-step** flow, **rollback only that batch**.

**Goal (directional — B.A. picks model in PR):**
- Support a mental model of **“this upload / this timesheet”** as a **unit** the user can **accept** or **reject**.
- On **reject** (too many issues after review): **remove** (or never commit) **only** the entries tied to that **import attempt** — must **not** delete unrelated historical entries.

**Design forks (document choice in PR):**
- **A — Batch id on commit:** Add **`import_batch_id`** (UUID or monotonic id) to **`time_entries`** (nullable for legacy/manual rows); `importExcel` sets it on every row in the transaction; UI offers **“Discard this import”** deleting `WHERE import_batch_id = ?` (with safeguards).
- **B — Staging table:** Rows land in **`time_entries_staging`** until user confirms → promote to **`time_entries`** or drop staging rows on cancel.
- **C — Replace by window:** User selects **developer + date range** (or file fingerprint) and confirms **“Replace timesheet for this period”** — deletes existing rows in window then inserts new (**dangerous** — needs strong confirmation; overlaps 7.1 conflict rules).

**Current code note:** `TimesheetService.bulkCreateEntries` is **already atomic** per import call — “partial commit then regret” only arises if the product later introduces **multi-step** commit or **non-atomic** paths; 7.2 still matters for **explicit discard** and **whole-sheet replace** even with today’s atomicity.

**Acceptance Criteria (draft):**
- [ ] User can **abandon** an import batch (or equivalent) without hunting individual row IDs — **exact UX tied to fork A/B/C**.
- [ ] **Replace whole timesheet** (if in scope) is **explicit**, **confirmed**, and **documented** vs 7.1 row-level merge rules.
- [ ] **Tests:** Delete-by-batch or staging lifecycle covered; **Murdock:** destructive paths + edge cases (overlap week, two developers on one file).

**Phase placement:** **Separate** from **7.1** (can ship in either order; **7.2** often **larger** if schema + UI). Default **import pack** milestone after estimates.

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
Last Updated: 2026-04-12 — Story **6.1** complete, **ready for Murdock** (`van/qa.md`); Story **6.6** ✅; Phase C **B.A. estimates** + **Murdock QA** rollup; 7.1–7.2; optional Phase C candidates; captured idea: budget vs status pie; Phase B closed
