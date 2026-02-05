# Project Vandura - Architecture Plan

**Mission**: Automated Time-Tracking & Actuals Report Generator  
**Status**: Architecture Phase  
**Budget**: $0 (beyond Cursor Pro)  
**Target**: Public GitHub Showcase

---

## Executive Summary

Vandura replaces manual Excel-based time tracking with an automated system that:
- Ingests 15-minute increment timesheet entries
- Generates Actuals vs. Estimates reports
- Provides a searchable PM dashboard
- Maintains professional, modular architecture

---

## Tech Stack Recommendation

### Core Language: **TypeScript**
**Why**: Your Java/C# background translates perfectly. Strong typing, interfaces, classes, compile-time checks. Modern ecosystem with massive tooling support.

### Backend Framework: **Node.js + Express + tRPC**
- **Express**: Lightweight, battle-tested HTTP server
- **tRPC**: End-to-end type safety (TypeScript types shared between client/server)
- Familiar OOP patterns available
- Zero-cost hosting options available

### Frontend: **Next.js 15 (App Router) + React**
- **Next.js**: Full-stack React framework with server components
- Server-side rendering + Static generation options
- Built-in API routes (though we'll use tRPC)
- Easy deployment to Vercel (free tier)
- TypeScript-first approach

### Database: **SQLite + Better-SQLite3**
- **Why**: Zero cost, zero infrastructure, embedded
- Synchronous API (better performance for small-scale)
- Perfect for 15-minute increment tracking (handles millions of rows)
- Easy backup (single file)
- Migration path to PostgreSQL if needed (via SQL compatibility)

### ORM: **Drizzle ORM**
- TypeScript-native ORM
- SQL-like syntax (familiar for Java/Hibernate users)
- Best-in-class type inference
- Lightweight, no runtime overhead
- Built-in migration system

### UI Library: **shadcn/ui + Tailwind CSS**
- **shadcn/ui**: Copy-paste component library (no npm bloat)
- **Tailwind**: Utility-first CSS (fast development)
- Professional, modern design system
- Highly customizable

### Excel Parsing: **xlsx** library
- Industry standard for Excel file parsing
- Handles .xlsx, .xls formats
- Zero cost

### Deployment Stack (All Free Tier):
- **Vercel**: Frontend + API hosting (Next.js optimized)
- **Turso**: SQLite edge hosting (10GB free) - optional upgrade from local SQLite
- **GitHub Actions**: CI/CD automation

---

## Project Structure

```
vandura/
├── README.md                          # Project overview & setup
├── VANDURA_ARCHITECTURE.md            # This document
├── package.json                       # Node.js dependencies
├── tsconfig.json                      # TypeScript configuration
├── next.config.js                     # Next.js configuration
├── drizzle.config.ts                  # Database configuration
├── .env.example                       # Environment variables template
├── .gitignore                         # Git ignore rules
│
├── src/
│   ├── app/                           # Next.js App Router (Frontend)
│   │   ├── layout.tsx                 # Root layout
│   │   ├── page.tsx                   # Dashboard homepage
│   │   ├── timesheets/                # Timesheet management pages
│   │   │   ├── page.tsx               # List view
│   │   │   ├── upload/page.tsx        # Excel upload
│   │   │   └── [id]/page.tsx          # Detail view
│   │   ├── reports/                   # Reports pages
│   │   │   ├── page.tsx               # Reports list
│   │   │   └── actuals/page.tsx       # Actuals vs Estimates
│   │   ├── projects/                  # Project management
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   └── api/trpc/[trpc]/route.ts   # tRPC API endpoint
│   │
│   ├── server/                        # Backend Logic (Core Engine)
│   │   ├── db/
│   │   │   ├── schema.ts              # Drizzle schema definitions
│   │   │   ├── index.ts               # Database client
│   │   │   └── migrations/            # SQL migrations
│   │   ├── routers/                   # tRPC routers (API endpoints)
│   │   │   ├── timesheet.ts
│   │   │   ├── project.ts
│   │   │   ├── report.ts
│   │   │   └── index.ts               # Root router
│   │   ├── services/                  # Business Logic Layer
│   │   │   ├── TimesheetService.ts    # Timesheet operations
│   │   │   ├── ReportService.ts       # Report generation
│   │   │   ├── ExcelParser.ts         # Excel ingestion
│   │   │   └── AggregationEngine.ts   # Core aggregation logic
│   │   └── trpc.ts                    # tRPC initialization
│   │
│   ├── lib/                           # Shared utilities
│   │   ├── utils.ts                   # Common helpers
│   │   ├── date-utils.ts              # 15-min increment helpers
│   │   └── validators.ts              # Input validation (Zod)
│   │
│   └── components/                    # React components
│       ├── ui/                        # shadcn/ui components
│       ├── dashboard/
│       │   ├── StatsCard.tsx
│       │   └── RecentActivity.tsx
│       ├── timesheets/
│       │   ├── TimesheetTable.tsx
│       │   ├── TimesheetUpload.tsx
│       │   └── TimeEntryForm.tsx
│       └── reports/
│           ├── ActualsChart.tsx
│           └── VarianceTable.tsx
│
├── cli/                               # CLI Tools (optional)
│   ├── import.ts                      # Import Excel via CLI
│   └── export.ts                      # Export reports via CLI
│
├── scripts/                           # Utility scripts
│   ├── seed.ts                        # Database seeding
│   └── migrate.ts                     # Manual migrations
│
└── tests/                             # Test suites
    ├── unit/
    │   ├── services/
    │   └── lib/
    └── integration/
        └── api/
```

---

## Core Engine Design: The "Aggregation Engine"

### Problem: 15-Minute Granularity Without DB Bottleneck

**Challenge**: Storing millions of 15-minute increments and aggregating them efficiently.

**Solution**: Hybrid Storage + In-Memory Aggregation

### Database Schema

```typescript
// Time Entries (Raw 15-min increments)
table: time_entries
- id: INTEGER PRIMARY KEY
- project_id: INTEGER (FK)
- developer_id: INTEGER (FK)
- task_id: INTEGER (FK)
- start_time: DATETIME (indexed)
- duration_minutes: INTEGER (always 15, 30, 45, 60, etc.)
- description: TEXT
- created_at: DATETIME

// Projects
table: projects
- id: INTEGER PRIMARY KEY
- name: TEXT
- estimated_hours: REAL
- start_date: DATE
- end_date: DATE
- status: TEXT ('active', 'completed', 'on-hold')

// Developers
table: developers
- id: INTEGER PRIMARY KEY
- name: TEXT
- hourly_rate: REAL (optional, for cost tracking)

// Tasks
table: tasks
- id: INTEGER PRIMARY KEY
- project_id: INTEGER (FK)
- name: TEXT
- estimated_hours: REAL
- parent_task_id: INTEGER (self-referential, optional)

// Aggregated Actuals (Materialized View Pattern)
table: actuals_cache
- id: INTEGER PRIMARY KEY
- project_id: INTEGER
- task_id: INTEGER (nullable)
- developer_id: INTEGER (nullable)
- period_start: DATE
- period_end: DATE
- total_minutes: INTEGER
- calculated_at: DATETIME
```

### Aggregation Strategy

**Real-time Aggregation** (for dashboard/reports):
1. Query time_entries with appropriate filters (project, date range)
2. SQLite SUM() aggregation (extremely fast for < 1M rows)
3. In-memory TypeScript mapping for grouping/pivoting
4. Cache results in `actuals_cache` table for heavy queries

**Performance Optimizations**:
- **Indexes**: Composite indexes on (project_id, start_time), (developer_id, start_time)
- **Batch Inserts**: Excel imports use transactions (1000 rows/batch)
- **Query Optimization**: Use SQLite EXPLAIN QUERY PLAN during development
- **Incremental Updates**: Only re-aggregate changed date ranges

**Why This Works**:
- SQLite handles 100K+ 15-min entries easily (< 100ms queries)
- In-memory aggregation for final transformations (TypeScript)
- Materialized cache for historical reports (pre-computed)

### Example Query Flow

```typescript
// services/AggregationEngine.ts
class AggregationEngine {
  async getActualsVsEstimates(projectId: number, startDate: Date, endDate: Date) {
    // 1. Check cache first
    const cached = await this.checkCache(projectId, startDate, endDate);
    if (cached && !this.isStale(cached)) return cached;

    // 2. Aggregate from raw entries
    const actuals = await db
      .select({
        taskId: timeEntries.taskId,
        totalMinutes: sql<number>`SUM(${timeEntries.durationMinutes})`,
      })
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.projectId, projectId),
          gte(timeEntries.startTime, startDate),
          lte(timeEntries.startTime, endDate)
        )
      )
      .groupBy(timeEntries.taskId);

    // 3. Join with estimates
    const estimates = await this.getTaskEstimates(projectId);

    // 4. Calculate variance
    const report = this.calculateVariance(actuals, estimates);

    // 5. Cache result
    await this.updateCache(projectId, startDate, endDate, report);

    return report;
  }
}
```

---

## Data Flow Architecture

```
┌─────────────────┐
│  Excel Upload   │ (Web UI or CLI)
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│  ExcelParser.ts     │ Validates & parses .xlsx
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ TimesheetService.ts │ Batch insert (transaction)
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│   SQLite Database   │ Stores time_entries
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ AggregationEngine   │ Queries + aggregates
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  ReportService.ts   │ Formats for display
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  tRPC API Response  │ JSON to frontend
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  React Components   │ Charts, tables, search
└─────────────────────┘
```

---

## Excel Ingestion Format

**Expected Excel Structure**:

| Developer | Project | Task | Date | Start Time | End Time | Duration (min) | Notes |
|-----------|---------|------|------|------------|----------|----------------|-------|
| John Doe  | ProjectA| API  | 2026-02-05 | 09:00 | 09:15 | 15 | Initial setup |
| Jane Smith| ProjectA| UI   | 2026-02-05 | 09:00 | 09:30 | 30 | Design review |

**Parser Logic**:
1. Read all rows
2. Validate required columns
3. Parse dates (ISO 8601)
4. Calculate duration (or use provided)
5. Lookup/create developer, project, task IDs
6. Insert in batches with transaction

---

## API Design (tRPC Routers)

### Timesheet Router
- `timesheet.create` - Add single entry
- `timesheet.bulkCreate` - Import from Excel
- `timesheet.list` - Get entries (paginated, filtered)
- `timesheet.update` - Edit entry
- `timesheet.delete` - Remove entry

### Project Router
- `project.create` - New project
- `project.list` - All projects
- `project.get` - Single project details
- `project.update` - Edit project
- `project.getActuals` - Get actuals for project

### Report Router
- `report.actualsVsEstimates` - Main report
- `report.developerSummary` - Per-developer breakdown
- `report.taskVariance` - Task-level variance
- `report.export` - Export to CSV/Excel

---

## Development Phases

### Phase 1: Foundation (Week 1)
- ✅ Architecture plan
- Initialize Next.js + TypeScript project
- Setup Drizzle ORM + SQLite
- Define database schema
- Create tRPC boilerplate

### Phase 2: Core Engine (Week 2)
- Implement ExcelParser service
- Build AggregationEngine
- Create TimesheetService
- Write ReportService
- Add database seeding

### Phase 3: API Layer (Week 3)
- Build all tRPC routers
- Add input validation (Zod schemas)
- Implement error handling
- Create API tests

### Phase 4: Frontend (Week 4)
- Setup shadcn/ui components
- Build dashboard homepage
- Create timesheet upload UI
- Build actuals report page
- Add search/filter functionality

### Phase 5: Polish (Week 5)
- Add charts (recharts library)
- Implement export functionality
- Write documentation
- Performance optimization
- Deploy to Vercel

---

## Cost Breakdown (All Free Tier)

| Service | Free Tier | Usage Estimate |
|---------|-----------|----------------|
| Vercel | 100GB bandwidth, unlimited sites | < 10GB/month |
| SQLite (local) | Unlimited | Single file |
| Turso (optional) | 10GB storage, 1B row reads | Not needed initially |
| GitHub | Unlimited public repos | 1 repo |
| GitHub Actions | 2000 minutes/month | < 100 min/month |
| **Total Cost** | **$0** | **$0** |

---

## Migration Path (Future Growth)

If Vandura grows beyond SQLite:

1. **Database**: SQLite → Turso (still free) → PostgreSQL (Supabase free tier)
2. **Hosting**: Vercel free → Vercel Pro ($20/month)
3. **Architecture**: Monolith → Microservices (if needed)

Current architecture supports 100K+ time entries with sub-second query times.

---

## Development Tools

- **Cursor Pro**: Primary IDE (already owned)
- **Node.js v20+**: Runtime
- **pnpm**: Fast package manager (vs npm)
- **Drizzle Kit**: Database migrations
- **tRPC Panel**: API testing (dev mode)
- **Zod**: Runtime type validation

---

## Why This Stack Wins

✅ **Strongly Typed**: TypeScript end-to-end (Java/C# dev-friendly)  
✅ **Zero Cost**: All free tier services  
✅ **Modern**: 2026 best practices (Next.js 15, React Server Components)  
✅ **Performant**: SQLite + efficient aggregation  
✅ **Scalable**: Easy migration path to PostgreSQL  
✅ **Professional**: shadcn/ui for polished UI  
✅ **Type-Safe APIs**: tRPC eliminates API bugs  
✅ **Fast Development**: Hot reload, component library, ORM  

---

## Next Steps

1. **Approve architecture** ✓
2. **Initialize project structure** (next)
3. **Setup database schema** (next)
4. **Build core engine** (next)
5. **Iterate and deploy**

---

**"I love it when a plan comes together."** — Hannibal Smith

Let's build Vandura.
