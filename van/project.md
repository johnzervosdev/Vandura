# Project Vandura — Project Dashboard

**Last Updated:** 2026-04-12  
**Milestone:** M1 - MVP Showcase  
**Status:** Phase B complete — Story **5.2** shipped. **Phase C:** **6.1** ✅ + **6.6** ✅ + **6.7** (**BUG-REPORT-001**) ✅ + **Epic 8 / 8.1** ✅ (in-app bug reports). **Next B.A. priority:** **6.5** → **6.2**–**6.4** (see **`van/stories.md`** Phase C **Remaining queue**). **Epic 8.2+** remains optional parallel work.

> **Navigation:** This is the entry point. Read this first for project context.  
> Story details → [`van/stories.md`](stories.md) | QA strategy & results → [`van/qa.md`](qa.md)

---

## Team Roles

| Role | Agent | Responsibility |
|------|-------|----------------|
| **Project Manager** | Hannibal | Strategy, roadmap, requirements, scope decisions, escalation resolution |
| **Lead Developer** | B.A. Baracus | Implementation, technical decisions, code quality, timeline execution |
| **QA Engineer** | Murdock | Testing strategy, edge cases, failure scenarios, quality gates |

### QA Responsibilities (Murdock)
- **Do:** reproduce issues, gather runtime evidence, write failing tests, validate fixes, update van docs with evidence/status.
- **Don't:** implement fixes or refactors unless explicitly asked; change production behavior to "solve" bugs; merge/push without request.

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
- ✅ Database schema (**6** tables: developers, projects, tasks, time_entries, actuals_cache, **bug_reports** — Epic **8.1**)
- ✅ Database migrations + seeding scripts
- ✅ Local dev environment functional (`npm run dev`) on **Node 20 LTS**
- ✅ Windows/OneDrive mitigation documented (WATCHPACK polling + `.next` reset)

**Backend Services:**
- ✅ `AggregationEngine.ts` — time entry aggregation (developer lookup bug fixed)
- ✅ `TimesheetService.ts` — CRUD operations (bulkCreate uses a synchronous transaction)
- ✅ `ExcelParser.ts` — Excel parsing (header mapping hardened; **duplicate imports currently allowed** until Story **7.1**; local timezone; weekly-grid support)
- ✅ `ReportService.ts` — report generation + CSV formatting

**tRPC API Routers:** Project, Developer, Task, Timesheet, Report, **BugReport** (Epic **8.1**)

**Phase A Stories Complete ✅ (Gate Cleared 2026-03-15):**
- ✅ Story 1.1 — Local Dev Environment
- ✅ Story 2.1 — Manage Projects
- ✅ Story 2.2 — Manage Tasks
- ✅ Story 3.2 — Excel Import (parse preview + bulk insert)
- ✅ Story 4.2 — Actuals vs Estimates Report
- ✅ Story 4.4 — Export CSV
- ✅ Story 4.1 — Dashboard Polish

**Frontend (MVP Slice — still incomplete vs full AC):**
- ✅ Dashboard (`/`) project variance summary + quick actions
- ✅ Projects: list + create (`/projects`), detail (`/projects/[id]`)
- ✅ Timesheets: list (`/timesheets`)
- ✅ Excel import UI (`/timesheets/upload`) with parse preview, format docs, template download, duplicate + timezone copy
- ✅ Reports: project summaries (`/reports`), actuals report (`/reports/[projectId]`), CSV export
- ✅ Developer productivity report (`/reports/productivity`) — Story 4.3

**Phase B Stories Complete:**
- ✅ Story 3.1 — Manual Time Entry UI (create/edit/delete + filters)
- ✅ Story 2.3 — Manage Developers (`/developers`, soft-delete, active/inactive toggle)
- ✅ Story 4.3 — Developer Productivity Report (`/reports/productivity`)
- ✅ Story 3.3 — Excel format docs + `public/timesheet-template.xlsx`
- ✅ Story 5.1 — Error handling (global toasts, `not-found`, production-safe tRPC errors)
- ✅ Story 5.2 — README setup/walkthrough/screenshots + `VANDURA_ARCHITECTURE.md` pass

**Phase C (in flight — see [`van/stories.md`](stories.md) Phase C):**
- ✅ Story **6.1** — **`projectsSummary.taskEstimatesTotal`** (SQL + `taskEstimatesTotalFromRollup`); **`/`**, **`/projects`**, **`/reports`** show **Budget**, **Task est. total**, **Actual**; actuals report top row adds **Task est. total** card; **TBD** + variance **TBD** when no project budget; CSV **Note** row; `tests/budget-display.test.ts` (incl. rollup) + `ReportService` / `projectsSummary` path — **QA complete** (`van/qa.md` → Story 6.1)
- ✅ Story **6.6** — **`/developers`** → **`/reports/productivity`** link (top action row, Hannibal copy + B.A. draft subline; `tests/story-6-6-developers-productivity-link.test.ts`)
- ✅ Story **6.7** — **BUG-REPORT-001**: actuals **`/reports/[projectId]`** implicit **All Time** matches **`projectsSummary`** (`tests/aggregation-actuals-report-date-range.test.ts`; `van/qa.md` → Story 6.7)
- ✅ Story **8.1** (**Epic 8**) — **`bug_reports`** table + **`bugReport`** tRPC router + **`BugReportFab`** (`tests/story-8-1-*.test.ts`; `van/qa.md` → Story 8.1)

**Still Missing (Phase B scope):**
- _(none — Phase B backlog cleared.)_

**Phase C (remaining — planned, in-repo; order provisional)** — per-story **B.A. estimates** in [`van/stories.md`](stories.md) → Phase C:
- **Story 6.2** — **Second card** on project detail: tasks missing estimates, fast path to edit. Hannibal **4–6h** · **B.A. 4–6h** (+**1–2h** dashboard stretch).
- **Story 6.3** — **Story #** column + migration; sortable **Story #, Name, Status, Estimated hours**. Hannibal **3–5h** · **B.A. 5–8h**.
- **Story 6.4** — Hide/show **`completed`** tasks (client + optional **localStorage**). Hannibal **2–3h** · **B.A. 2–3h**.
- **Story 6.5** — Past **`endDate`** cue; extend **`projectsSummary`**. Hannibal **2–4h** · **B.A. 3–5h**.
- **Story 8.2+** (**Epic 8**) — follow-ups from [`van/stories.md`](stories.md) **Epic 8** (optional; **8.1** shipped).
- **Backlog (not sequenced in Phase C):** Pie/donut **budget vs task status** — [`van/stories.md`](stories.md) → **Captured ideas**.

### What's IN PROGRESS 🚧

**Phase B - Production Ready:**
- _(none)_

### What's PLANNED 📋
- **Phase C:** **6.1** + **6.6** + **6.7** + **8.1** shipped; **6.2**–**6.5** remaining (**execution order** in [`van/stories.md`](stories.md)); **Epic 8.2+** optional. Phase C band **~34–54h** (**6.1–6.6**) — **M1 ~20h** triage in stories **Planning** + optional candidates. **+ ~10–18h** for **8.1** is **spent** if counted against epic capacity.
- **Story 7.1** — Excel import **duplicate policy** — **B.A. 10–22h** (scope-dependent) — [`van/stories.md`](stories.md) **Import integrity** (not Phase C unless triaged in).
- **Story 7.2** — **Whole-timesheet** / **discard import** — **B.A. ~10–26h** (fork A/B/C) — same section; **7.1+7.2 ~24–45h** combined if both ship.
- **M2 / hosting**, **Story 1.2** (dev hardening), **Story 3.4** (parse remediation), and other **deferred** work — see [`van/stories.md`](stories.md) Deferred section.

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
- **Timezone:** All times are treated as local machine time (no timezone conversion).
- **Week boundaries:** Calendar days, no UTC offset

### Excel Import Behavior
- **Current (MVP, until Story 7.1 ships):** Importing the same file twice **creates duplicate** `time_entries` rows (by design — simple parser, no dedupe).
- **Planned (Stories 7.1–7.2 — [`van/stories.md`](stories.md) → Import integrity):** **7.1** — **No duplicate entries** for the same logical logged work; **identical** re-import → **no-op**; **conflicts** → **user review** before overwrite (canonical key in PR). **7.2** — **Whole-timesheet** workflows: e.g. **discard all rows from one import** if the user rejects the sheet after review, or explicit **replace** scope — requires **batch identity** or staging (see story).
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

1. **$0 Budget** — Free tier only, no paid services
2. **TypeScript** — All code must be typed
3. **SQLite for M1** — No database change until M2
4. **Next.js App Router** — No Pages Router migration
5. **Node 20 LTS** — Lock version for better-sqlite3 compatibility

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

## Roadmap & Timeline

### Phase A: Showcase Slice (24-31 hours / 3-4 dev days)
**Sequence:** 1.1 → 2.1 → 2.2 → 3.2 → 4.2 → 4.4 → 4.1

**Deliverable:** Fully functional demo path: Create project → Add tasks → Import Excel → View report → Export CSV

**Go-Live Target:** End of Week 1

### Phase B: Production Ready (21-27 hours / 3-4 dev days)
**Sequence:** 3.1 → 2.3 → 4.3 → 3.3 → 5.1 → 5.2

**Deliverable:** Production-grade system ready for public GitHub showcase

**Go-Live Target:** End of Week 2

### Phase C: Budget clarity & reporting UX (**~34–54h** for **6.1–6.6** — see [`van/stories.md`](stories.md) **Planning**; **does not fit ~20h M1 remainder** without triage)

### Epic 8: In-app feedback (**Story 8.1 ~10–18h** combined — parallel / optional; see [`van/stories.md`](stories.md) **Epic 8**)

**Sequence (Hannibal — Phase C):** **6.6 → 6.1 → 6.5 → 6.2 → 6.3 → 6.4** _(B.A.: **6.6** first; **6.3**/**6.4** may be flipped for schedule—Hannibal uses **6.3→6.4** for sort-before-hide; [`van/stories.md`](stories.md) Phase C **Planning**.)_

**Sequence (Epic 8):** **8.1** slots **independently** — often **parallel** to Phase C **6.2–6.5** when feedback capture is prioritized.

**Deliverable — Phase C:** **(6.1)** Budget vs estimates + **TBD** copy + **`projectsSummary`** invalidation. **(6.2)** Tasks missing estimates card. **(6.3)** Story # + full column sort. **(6.4)** Hide completed tasks. **(6.5)** Past **end date** visual + summary **`endDate`**. **(6.6)** **`/developers`** link to **Developer productivity** report.

**Deliverable — Epic 8:** **(8.1)** Global **bug** control + **open** backlog + **close** workflow (SQLite + modal).

**Notes:** Optional follow-ons: DB rename `estimatedHours` → `budgetHours`, “sync budget from tasks”, dashboard-wide “tasks TBD” aggregate (6.2 stretch). **Captured backlog (not Phase C):** pie/donut **budget vs task status** report — see [`van/stories.md`](stories.md) → **Captured ideas** (product interpretation A/B/C TBD before estimate).

### Optional (Deferred): Dev Environment Hardening (1-2 hours)
Story 1.2 can be done any time after MVP if Windows/OneDrive instability recurs.

---

## Known Issues & Technical Debt

### Critical (Fix in Phase A)
1. ~~**Excel import UX**~~ — ✅ **FIXED**: parse preview step implemented (parse → preview/errors → import) using shared `Modal`.
2. **Windows/OneDrive stability** — Occasional stuck `next dev` / chunk timeouts if polling not enabled or stale `.next`
3. ~~**Excel parser weekly-grid timesheet layout**~~ — ✅ **FIXED**: weekly grid (Mon/Tue/…) converted to row-based entries. Validated via `tests/timesheet-sample-extract.test.ts` (JZER-style layout; synthetic workbook fallback for CI).
4. ~~**Projects list fails to load (SQL alias error)**~~ — ✅ **FIXED** (see `tests/report-projects-summary-error.test.ts`)
5. ~~**Template timesheet missing date errors**~~ — ✅ **FIXED**: weekly-grid conversion now supplies per-row dates.
6. **Test run status** — Current counts and file list: **[`van/qa.md`](qa.md)** → **Automated Test Registry** (run **`npm test`** locally). Shared-DB tests must use **`finally`** cleanup (see `van/qa.md` — includes `tests/parser-db-cleanup.ts` for ExcelParser import-mode side effects).
7. ~~**BUG-REPORT-001** / **Story 6.7**~~ — **Resolved** **2026-04-12** — Implicit **All Time** on **`/reports/{id}`** no longer clips to **`projects.endDate`**; see **`van/stories.md`** bug backlog + **`AggregationEngine.getActualsVsEstimates`**.
8. ~~**Next.js params Promise warning**~~ — ✅ **FIXED**: `/projects/[id]` and `/projects/[id]/edit` params handling corrected for Next.js 15.
9. ~~**Drizzle relations missing**~~ — ✅ **FIXED**: Added Drizzle relations to schema for `with: { tasks: true }` queries.
10. ~~**Import fails with spread error during bulk insert**~~ — ✅ **FIXED**: `bulkCreateEntries` now executes `.returning().all()` synchronously inside the transaction. Regression test: `tests/timesheet-bulkCreate.test.ts`

### Minor (Fix in Phase B)
- **drizzle.config.ts** — deprecated `driver` field already removed
- **Excel parser** — add more date format patterns if edge cases emerge

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
| Implementation approach | B.A. | — |
| Component/library choice (within stack) | B.A. | — |
| Code architecture/patterns | B.A. | — |
| Refactoring | B.A. | — |
| New major dependency | Hannibal | — |
| Core architecture change (DB, framework) | Hannibal | — |
| Scope change mid-story | Hannibal | — |
| Timeline slip > 1 day | B.A. + Hannibal | — |
| Test coverage level | Murdock + Hannibal | — |
| Acceptance criteria clarification | B.A. → Hannibal | — |

---

## Definition of Ready (Story can be started)
- [ ] Acceptance criteria are clear
- [ ] No blocking dependencies
- [ ] Design/UX decisions made (if needed)
- [ ] Test strategy identified (critical paths)

## Definition of Done (Story is complete)

**Code:**
- [ ] All acceptance criteria met
- [ ] Critical paths tested (Murdock approval)
- [ ] No build errors
- [ ] README updated (if user-facing feature)
- [ ] Code pushed to branch `cursor/vandura-architecture-plan-4740`

**Documentation (required — both files):**
- [ ] `van/stories.md` — story status updated to ✅ Complete; all AC checkboxes checked
- [ ] `van/project.md` — story moved to "Phase A Stories Complete" list; any related Known Issues struck through and marked FIXED

**Sign-off:**
- [ ] Hannibal sign-off (Phase A only; Phase B can auto-merge)

---

## Communication Protocol

### Document Ownership & Write Rules

| File | Owner | Who Else Can Write |
|------|-------|--------------------|
| `van/project.md` | Hannibal | B.A. may update Known Issues when fixing a bug |
| `van/stories.md` | B.A. | Murdock updates QA checklists per story |
| `van/qa.md` | Murdock | B.A. adds new test file rows to the registry when writing a test |
| `van.md` (root) | Hannibal | Strictly index — no decisions, headlines, or status updates ever |

**Test registry rule:** B.A. adds the row when writing a test. Murdock owns the status column and verifies coverage. Murdock has final say on whether a test covers what it claims.

**Story completion rule:** Closing a story always requires updates in two places — `van/stories.md` (status + ACs) AND `van/project.md` (current status summary + Known Issues). B.A. handles both as part of delivery. Hannibal then reviews for sign-off.

### Daily Updates (Optional)
- B.A. posts progress on current story (van/stories.md + van/project.md Next Actions)
- Murdock flags issues found in van/qa.md and van/stories.md QA checklists
- Hannibal monitors for escalations

### Phase Gates
- **End of Phase A:** Demo showcase slice to Hannibal (go/no-go for Phase B)
- **End of Phase B:** Final review before public release

### Escalations
- Log in Known Issues section of this file
- Tag responsible owner
- Hannibal makes final call if needed

---

## File Structure (For Reference)

```
vandura/
├── van/
│   ├── project.md          # THIS FILE — project dashboard (start here)
│   ├── stories.md          # User stories, AC, implementation notes (B.A. + Murdock)
│   └── qa.md               # Test strategy, plans, registry, QA results (Murdock)
├── van.md                  # Index — points here
├── VANDURA_ARCHITECTURE.md # Technical architecture reference
├── README.md               # Public-facing docs
├── src/
│   ├── app/                # Next.js pages
│   ├── server/
│   │   ├── db/             # Database schema + migrations
│   │   ├── services/       # Business logic (AggregationEngine, etc.)
│   │   └── routers/        # tRPC API endpoints
│   ├── lib/                # Shared utilities
│   └── components/         # React components
├── tests/                  # `*.test.ts` (see `van/qa.md`); `parser-db-cleanup.ts` = shared DB cleanup helpers for parser tests
├── scripts/                # migrate.ts, seed.ts
└── data/                   # vandura.db (local SQLite file)
```

---

## Next Actions

**B.A.:**
- [x] Validate Story 1.1 (dev environment)
- [x] Finish Story 2.1 (Project CRUD: edit/delete/status)
- [x] Fix Next.js params Promise warning
- [x] Implement Story 2.2 (Tasks CRUD UI)
- [x] Implement Story 3.2 (Excel import parse preview + bulk insert fix)
- [ ] Implement Story 4.2 (Actuals vs Estimates Report)
- [ ] Implement Story 4.4 (CSV filename format AC)
- [ ] Implement Story 4.1 (Dashboard Polish)

**Hannibal:**
- [x] Create van.md / restructure to van/ folder
- [x] Story 3.2 sign-off
- [ ] Monitor Phase A progress
- [ ] Phase A gate review (go/no-go for Phase B)

**Murdock:**
- [x] Review project docs and prepare Phase A test plan
- [x] Write JZER-style fixture tests (`tests/timesheet-sample-extract.test.ts`)
- [x] Real-file validation for weekly-grid parser — complete
- [ ] QA Story 4.2 (Actuals vs Estimates Report) when B.A. delivers
- [ ] QA Story 4.4 (CSV export filename) when B.A. delivers
- [ ] QA Story 4.1 (Dashboard Polish) when B.A. delivers

---

## Questions/Blockers

_Log questions and blockers here. Tag the owner._

---

**End of Document**  
Last Updated: 2026-04-17 — Phase C **B.A. estimates** logged (`van/stories.md`); Stories **7.1–7.2** import integrity; Phase B closed; Story 5.2 sign-off in `van/qa.md`
