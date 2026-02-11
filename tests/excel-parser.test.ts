import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { excelParser } from '../src/server/services/ExcelParser';
import { db } from '../src/server/db';
import { developers, projects, tasks } from '../src/server/db/schema';
import { eq, and } from 'drizzle-orm';

test('ExcelParser accepts EU date format DD/MM/YYYY', async () => {
  const unique = Date.now();
  const rows = [
    {
      Developer: `QA Dev ${unique}`,
      Project: `QA Project ${unique}`,
      Task: 'EU Date',
      Date: '13/02/2026',
      Duration: 15,
    },
  ];

  const result = await excelParser.parseRows(rows);

  assert.equal(result.errors.length, 0);
  assert.equal(result.entries.length, 1);
});

test('ExcelParser reports detectedDeveloper from sheet-level defaultDeveloper even when all rows error', async () => {
  const result = await excelParser.parseRows(
    [
      {
        // missing project => row error
        Developer: '',
        Date: '2026-02-05',
        Duration: 15,
      },
    ],
    { defaultDeveloper: 'Sheet Dev' }
  );

  assert.equal(result.entries.length, 0);
  assert.equal(result.detectedDeveloper, 'Sheet Dev');
  assert.deepEqual(result.developers, ['Sheet Dev']);
});

test('ExcelParser reports detectedDeveloper as null when no developer can be determined', async () => {
  const result = await excelParser.parseRows([
    {
      // missing developer => row error
      Project: 'Proj',
      Date: '2026-02-05',
      Duration: 15,
    },
  ]);

  assert.equal(result.entries.length, 0);
  assert.equal(result.detectedDeveloper, null);
  assert.deepEqual(result.developers, []);
});

test('ExcelParser (preview mode) detects projects on sheet and reports invalid projects (not in DB)', async () => {
  const unique = Date.now();
  const existingName = `Existing Project ${unique}`;
  const missingName = `Missing Project ${unique}`;

  await db.insert(projects).values({ name: existingName, status: 'active' as any });

  const rows = [
    { Developer: `Dev ${unique}`, Project: existingName, Task: 'T1', Date: '2026-02-05', Duration: 15 },
    { Developer: `Dev ${unique}`, Project: missingName, Task: 'T2', Date: '2026-02-05', Duration: 15 },
  ];

  const result = await excelParser.parseRows(rows, { mode: 'preview' });

  assert.deepEqual(result.projects.all, [existingName, missingName].sort((a, b) => a.localeCompare(b)));
  assert.deepEqual(result.projects.invalid, [missingName]);
  assert.ok(result.errors.some((e) => e.includes('Invalid projects')));
});

test('ExcelParser supports Excel serial date numbers', async () => {
  const unique = Date.now();
  const target = new Date(Date.UTC(2026, 1, 5));
  const excelSerial = Math.floor(target.getTime() / 86400000) + 25569;

  const rows = [
    {
      Developer: `QA Dev ${unique}`,
      Project: `QA Project ${unique}`,
      Task: 'Serial Date',
      Date: excelSerial,
      Duration: 15,
    },
  ];

  const result = await excelParser.parseRows(rows);

  assert.equal(result.errors.length, 0);
  assert.equal(result.entries.length, 1);

  const parsed = result.entries[0].startTime;
  assert.equal(parsed.getUTCFullYear(), 2026);
  assert.equal(parsed.getUTCMonth(), 1);
  assert.equal(parsed.getUTCDate(), 5);
});

test('ExcelParser accepts US date format M/D/YYYY', async () => {
  const unique = Date.now();
  const rows = [
    {
      Developer: `QA Dev ${unique}`,
      Project: `QA Project ${unique}`,
      Task: 'US Date',
      Date: '2/5/2026',
      Duration: 15,
    },
  ];

  const result = await excelParser.parseRows(rows);

  assert.equal(result.errors.length, 0);
  assert.equal(result.entries.length, 1);
});

test('ExcelParser accepts ISO date-time format', async () => {
  const unique = Date.now();
  const rows = [
    {
      Developer: `QA Dev ${unique}`,
      Project: `QA Project ${unique}`,
      Task: 'ISO DateTime',
      Date: '2026-02-05T09:00:00',
      Duration: 15,
    },
  ];

  const result = await excelParser.parseRows(rows);

  assert.equal(result.errors.length, 0);
  assert.equal(result.entries.length, 1);
});

test('ExcelParser accepts EU date format D/M/YYYY', async () => {
  const unique = Date.now();
  const rows = [
    {
      Developer: `QA Dev ${unique}`,
      Project: `QA Project ${unique}`,
      Task: 'EU Date Single Digit',
      Date: '5/2/2026',
      Duration: 15,
    },
  ];

  const result = await excelParser.parseRows(rows);

  assert.equal(result.errors.length, 0);
  assert.equal(result.entries.length, 1);
});

test('ExcelParser rejects zero-duration rows', async () => {
  const unique = Date.now();
  const rows = [
    {
      Developer: `QA Dev ${unique}`,
      Project: `QA Project ${unique}`,
      Task: 'Zero Duration',
      Date: '2026-02-05',
      Duration: 0,
    },
  ];

  const result = await excelParser.parseRows(rows);

  assert.equal(result.entries.length, 0);
  assert.equal(result.preview.length, 0);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /Duration must be greater than 0/);
});

test('ExcelParser rejects non-15-minute durations with row number', async () => {
  const unique = Date.now();
  const rows = [
    {
      Developer: `QA Dev ${unique}`,
      Project: `QA Project ${unique}`,
      Task: 'Odd Duration',
      Date: '2026-02-05',
      Duration: 22,
    },
  ];

  const result = await excelParser.parseRows(rows);

  assert.equal(result.entries.length, 0);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /Row 2:/);
  assert.match(result.errors[0], /multiple of 15 minutes/);
});

test('ExcelParser returns preview for valid rows even when errors exist', async () => {
  const unique = Date.now();
  const rows = [
    {
      Developer: `QA Dev ${unique}`,
      Project: `QA Project ${unique}`,
      Task: 'Valid Row',
      Date: '2026-02-05',
      Duration: 15,
    },
    {
      Developer: `QA Dev ${unique}`,
      Project: `QA Project ${unique}`,
      Task: 'Invalid Row',
      Date: '2026-02-05',
      Duration: 0,
    },
  ];

  const result = await excelParser.parseRows(rows);

  assert.equal(result.entries.length, 1);
  assert.equal(result.preview.length, 1);
  assert.equal(result.errors.length, 1);
});

test('ExcelParser uses local midnight when only date is provided', async () => {
  const unique = Date.now();
  const rows = [
    {
      Developer: `QA Dev ${unique}`,
      Project: `QA Project ${unique}`,
      Task: 'Date Only',
      Date: '2026-02-05',
      Duration: 15,
    },
  ];

  const result = await excelParser.parseRows(rows);

  assert.equal(result.errors.length, 0);
  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0].startTime.getHours(), 0);
  assert.equal(result.entries[0].startTime.getMinutes(), 0);
});

test('ExcelParser treats task names as case-sensitive', async () => {
  const unique = Date.now();
  const developerName = `QA Dev ${unique}`;
  const projectName = `QA Project ${unique}`;
  const taskUpper = 'Design';
  const taskLower = 'design';

  const rows = [
    {
      Developer: developerName,
      Project: projectName,
      Task: taskUpper,
      Date: '2026-02-05',
      Duration: 15,
    },
    {
      Developer: developerName,
      Project: projectName,
      Task: taskLower,
      Date: '2026-02-05',
      Duration: 15,
    },
  ];

  try {
    const result = await excelParser.parseRows(rows);
    assert.equal(result.errors.length, 0);

    const project = await db.query.projects.findFirst({
      where: eq(projects.name, projectName),
    });
    assert.ok(project);

    const taskList = await db.query.tasks.findMany({
      where: (t, { and: andOp, eq: eqOp }) =>
        andOp(eqOp(t.projectId, project!.id), eqOp(t.name, taskUpper)),
    });
    const taskListLower = await db.query.tasks.findMany({
      where: (t, { and: andOp, eq: eqOp }) =>
        andOp(eqOp(t.projectId, project!.id), eqOp(t.name, taskLower)),
    });

    assert.equal(taskList.length, 1);
    assert.equal(taskListLower.length, 1);
  } finally {
    // cleanup by name to avoid polluting local db
    const project = await db.query.projects.findFirst({
      where: eq(projects.name, projectName),
    });
    if (project) {
      await db.delete(tasks).where(eq(tasks.projectId, project.id));
      await db.delete(projects).where(eq(projects.id, project.id));
    }
    await db.delete(developers).where(eq(developers.name, developerName));
  }
});

test('ExcelParser.parseFile selects the correct sheet when the first sheet is metadata (e.g. Variable)', async () => {
  const unique = Date.now();
  const developerName = `QA Dev ${unique}`;
  const projectName = `QA Project ${unique}`;

  const meta = XLSX.utils.aoa_to_sheet([
    ['Variable', 'Some metadata'],
    ['Lookup', 'Values'],
  ]);

  const timesheet = XLSX.utils.aoa_to_sheet([
    ['Developer', 'Project', 'Task', 'Date', 'Duration', 'Notes'],
    [developerName, projectName, 'Sheet selection', '2026-02-05', 15, 'ok'],
  ]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, meta, 'Variable');
  XLSX.utils.book_append_sheet(wb, timesheet, 'Timesheet');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

  const result = await excelParser.parseFile(buf);

  assert.equal(result.sheetName, 'Timesheet');
  assert.equal(result.errors.length, 0);
  assert.equal(result.entries.length, 1);
  assert.equal(result.preview.length, 1);
  assert.equal(result.preview[0].developer, developerName);
  assert.equal(result.preview[0].project, projectName);
});
