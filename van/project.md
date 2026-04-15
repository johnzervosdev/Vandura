# Project Vandura — Project Dashboard

**Last Updated:** 2026-04-12  
**Milestone:** M1 - MVP Showcase  
**Status:** Phase A In Progress

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
- ✅ Database schema (5 tables: developers, projects, tasks, time_entries, actuals_cache)
- ✅ Database migrations + seeding scripts
- ✅ Local dev environment functional (`npm run dev`) on **Node 20 LTS**
- ✅ Windows/OneDrive mitigation documented (WATCHPACK polling + `.next` reset)

**Backend Services:**
- ✅ `AggregationEngine.ts` — time entry aggregation (developer lookup bug fixed)
- ✅ `TimesheetService.ts` — CRUD operations (bulkCreate uses a synchronous transaction)
- ✅ `ExcelParser.ts` — Excel parsing (header mapping hardened; duplicates allowed; local timezone; weekly-grid support)
- ✅ `ReportService.ts` — report generation + CSV formatting

**tRPC API Routers:** Project, Developer, Task, Timesheet, Report

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

**Still Missing (Phase B scope):**
- ⚠️ README + screenshots + architecture doc — Story 5.2

### What's IN PROGRESS 🚧

**Phase B - Production Ready:**
- 🚧 Story 5.1 — Error Handling (global toasts, 404, production-safe errors)

### What's PLANNED 📋
See Roadmap section below. Full story details in [`van/stories.md`](stories.md).

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
- **Duplicates:** Importing the same file twice will create duplicate entries.
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
6. **Test run status** — Full suite green: **76/76** passed (`npm test`; 17 `tests/*.test.ts` files). Shared-DB tests clean up in `finally` (see `van/qa.md` — includes `tests/parser-db-cleanup.ts` for ExcelParser import-mode side effects).
7. ~~**Next.js params Promise warning**~~ — ✅ **FIXED**: `/projects/[id]` and `/projects/[id]/edit` params handling corrected for Next.js 15.
8. ~~**Drizzle relations missing**~~ — ✅ **FIXED**: Added Drizzle relations to schema for `with: { tasks: true }` queries.
9. ~~**Import fails with spread error during bulk insert**~~ — ✅ **FIXED**: `bulkCreateEntries` now executes `.returning().all()` synchronously inside the transaction. Regression test: `tests/timesheet-bulkCreate.test.ts`

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
Last Updated: 2026-04-12 — Story 3.3 complete (Hannibal sign-off); Phase B remaining: 5.1, 5.2
