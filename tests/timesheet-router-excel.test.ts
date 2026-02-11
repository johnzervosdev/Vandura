import test from 'node:test';
import assert from 'node:assert/strict';
import { timesheetRouter } from '../src/server/routers/timesheet';
import { excelParser } from '../src/server/services/ExcelParser';
import { timesheetService } from '../src/server/services/TimesheetService';

test('Story 3.2: parseExcel returns preview (first 10) and does not throw on row errors', async () => {
  const originalParse = excelParser.parseFile;

  try {
    excelParser.parseFile = async () =>
      ({
        sheetName: 'Sheet1',
        entries: Array.from({ length: 12 }, (_, i) => ({
          developerId: 1,
          projectId: 1,
          taskId: undefined,
          startTime: new Date(`2026-02-0${(i % 9) + 1}T09:00:00`),
          durationMinutes: 15,
          description: undefined,
        })),
        detectedDeveloper: 'Dev A',
        developers: ['Dev A'],
        projects: { all: ['Proj 1'], invalid: [] },
        preview: Array.from({ length: 10 }, (_, i) => ({
          developer: `Dev ${i}`,
          project: `Proj ${i}`,
          task: `Task ${i}`,
          startTime: new Date(`2026-02-0${(i % 9) + 1}T09:00:00`),
          durationMinutes: 15,
          notes: undefined,
        })),
        errors: ['Row 2: Missing developer name'],
        warnings: ['Row 5: Something minor'],
      }) as any;

    const caller = timesheetRouter.createCaller({ headers: new Headers() });
    const result = await caller.parseExcel({ fileBuffer: 'AAAA' });

    assert.equal(result.sheetName, 'Sheet1');
    assert.equal(result.entryCount, 12);
    assert.equal(result.detectedDeveloper, 'Dev A');
    assert.equal(result.preview.length, 10);
    assert.equal(result.errors.length, 1);
    assert.equal(result.warnings.length, 1);
  } finally {
    excelParser.parseFile = originalParse;
  }
});

test('Story 3.2: importExcel blocks when parse errors exist (no partial import)', async () => {
  const originalParse = excelParser.parseFile;
  const originalBulk = timesheetService.bulkCreateEntries;

  try {
    let bulkCalled = false;

    excelParser.parseFile = async () =>
      ({
        entries: [
          {
            developerId: 1,
            projectId: 1,
            taskId: undefined,
            startTime: new Date('2026-02-01T09:00:00'),
            durationMinutes: 15,
            description: undefined,
          },
        ],
        detectedDeveloper: 'Dev 1',
        developers: ['Dev 1'],
        projects: { all: ['Proj 1'], invalid: ['Proj 1'] },
        preview: [],
        errors: ['Row 2: Duration must be greater than 0'],
        warnings: [],
      }) as any;

    timesheetService.bulkCreateEntries = async () => {
      bulkCalled = true;
      return [];
    };

    const caller = timesheetRouter.createCaller({ headers: new Headers() });
    await assert.rejects(() => caller.importExcel({ fileBuffer: 'AAAA' }), /Parse errors:/);
    assert.equal(bulkCalled, false);
  } finally {
    excelParser.parseFile = originalParse;
    timesheetService.bulkCreateEntries = originalBulk;
  }
});

test('Story 3.2: importExcel calls bulkCreate and returns imported count when no errors', async () => {
  const originalParse = excelParser.parseFile;
  const originalBulk = timesheetService.bulkCreateEntries;

  try {
    const entries = [
      {
        developerId: 1,
        projectId: 1,
        taskId: undefined,
        startTime: new Date('2026-02-01T09:00:00'),
        durationMinutes: 15,
        description: undefined,
      },
      {
        developerId: 1,
        projectId: 1,
        taskId: undefined,
        startTime: new Date('2026-02-01T10:00:00'),
        durationMinutes: 30,
        description: undefined,
      },
    ];

    excelParser.parseFile = async () =>
      ({
        entries,
        detectedDeveloper: 'Dev 1',
        developers: ['Dev 1'],
        projects: { all: ['Proj 1'], invalid: [] },
        preview: [],
        errors: [],
        warnings: [],
      }) as any;

    timesheetService.bulkCreateEntries = async () => entries as any;

    const caller = timesheetRouter.createCaller({ headers: new Headers() });
    const result = await caller.importExcel({ fileBuffer: 'AAAA' });

    assert.equal(result.imported, 2);
    assert.equal(result.errors.length, 0);
    assert.equal(result.warnings.length, 0);
  } finally {
    excelParser.parseFile = originalParse;
    timesheetService.bulkCreateEntries = originalBulk;
  }
});

test('Story 3.2: duplicate imports call bulkCreate each time (no dedupe)', async () => {
  const originalParse = excelParser.parseFile;
  const originalBulk = timesheetService.bulkCreateEntries;

  try {
    const entries = [
      {
        developerId: 1,
        projectId: 1,
        taskId: undefined,
        startTime: new Date('2026-02-01T09:00:00'),
        durationMinutes: 15,
        description: undefined,
      },
    ];

    let bulkCalls = 0;
    excelParser.parseFile = async () =>
      ({
        entries,
        detectedDeveloper: 'Dev 1',
        developers: ['Dev 1'],
        projects: { all: ['Proj 1'], invalid: [] },
        preview: [],
        errors: [],
        warnings: [],
      }) as any;

    timesheetService.bulkCreateEntries = async () => {
      bulkCalls += 1;
      return entries as any;
    };

    const caller = timesheetRouter.createCaller({ headers: new Headers() });
    await caller.importExcel({ fileBuffer: 'AAAA' });
    await caller.importExcel({ fileBuffer: 'AAAA' });

    assert.equal(bulkCalls, 2);
  } finally {
    excelParser.parseFile = originalParse;
    timesheetService.bulkCreateEntries = originalBulk;
  }
});

