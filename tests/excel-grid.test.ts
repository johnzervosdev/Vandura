import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { excelParser } from '../src/server/services/ExcelParser';

test('ExcelParser imports weekly grid (Mon-Fri) using Week Ending date + Name label', async () => {
  const unique = Date.now();

  // Week ending Friday 2024-04-05 (Mon = 2024-04-01)
  const aoa = [
    ['Name:', `QA Dev ${unique}`],
    ['Week Ending:', '2024-04-05'],
    [],
    ['Project', 'Task', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Total'],
    ['QA Project Grid', 'Build parser', 1, 0, 0.25, '', 2, 3.25],
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

  const result = await excelParser.parseFile(buf);

  assert.equal(result.errors.length, 0);
  assert.equal(result.detectedDeveloper, `QA Dev ${unique}`);
  // Mon(1h) + Wed(0.25h) + Fri(2h) => 3 entries
  assert.equal(result.entries.length, 3);
  assert.equal(result.preview.length, 3);

  // All preview rows should carry sheet-level developer/project/task
  for (const p of result.preview) {
    assert.equal(p.developer, `QA Dev ${unique}`);
    assert.equal(p.project, 'QA Project Grid');
    assert.equal(p.task, 'Build parser');
  }

  // Ensure durations are multiples of 15 minutes
  for (const e of result.entries) {
    assert.equal(e.durationMinutes % 15, 0);
  }
});

test('ExcelParser detects projects on JZER-style weekly grid (Project Code + ROLE AND STORY CARD NUMBER) and flags missing projects in preview', async () => {
  const unique = Date.now();
  const aoa: any[][] = [];

  // B2/C2: Name label + value (like the real sample characterization test)
  aoa[1] = [];
  aoa[1][1] = 'Name:';
  aoa[1][2] = `QA Dev ${unique}`;

  // Week ending (Friday) so we can infer Mon..Fri even if no explicit dates exist
  aoa[2] = [];
  aoa[2][1] = 'Week Ending:';
  aoa[2][2] = '2024-04-05';

  // Header row similar to the sample: Project Code in column C, task label in column D,
  // weekday hours Sat–Fri in columns E–K.
  const headerRow = 9;
  aoa[headerRow] = [];
  aoa[headerRow][2] = 'Project Code';
  aoa[headerRow][3] = 'ROLE AND STORY CARD NUMBER';
  aoa[headerRow][4] = 'Sat';
  aoa[headerRow][5] = 'Sun';
  aoa[headerRow][6] = 'Mon';
  aoa[headerRow][7] = 'Tue';
  aoa[headerRow][8] = 'Wed';
  aoa[headerRow][9] = 'Thu';
  aoa[headerRow][10] = 'Fri';

  aoa[headerRow + 1] = [];
  aoa[headerRow + 1][2] = `PROJ-001-${unique}`;
  aoa[headerRow + 1][3] = 'DEV - Feature A';
  aoa[headerRow + 1][6] = 2; // Mon
  aoa[headerRow + 1][7] = 1; // Tue

  aoa[headerRow + 2] = [];
  aoa[headerRow + 2][2] = `PROJ-002-${unique}`;
  aoa[headerRow + 2][3] = 'QA - Bug Bash';
  aoa[headerRow + 2][8] = 3.5; // Wed

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Timesheet');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

  const preview = await excelParser.parseFile(buf, { mode: 'preview' });

  assert.equal(preview.detectedDeveloper, `QA Dev ${unique}`);
  assert.equal(preview.projects.all.length, 2);
  assert.equal(preview.projects.invalid.length, 2);
  assert.ok(preview.errors.some((e) => e.includes('Invalid projects')));
});

test('ExcelParser detects projects on Project Code grid even when weekday header cells are blank (Variable-style)', async () => {
  const unique = Date.now();

  const aoa: any[][] = [];
  aoa[1] = [];
  aoa[1][1] = 'Name:';
  aoa[1][2] = `QA Dev ${unique}`;

  aoa[2] = [];
  aoa[2][1] = 'Week Ending:';
  aoa[2][2] = '2024-04-05';

  const headerRow = 9;
  aoa[headerRow] = [];
  aoa[headerRow][2] = 'Project Code';
  aoa[headerRow][3] = 'ROLE AND STORY CARD NUMBER';
  // E–K header cells intentionally blank/null

  aoa[headerRow + 1] = [];
  aoa[headerRow + 1][2] = `PROJ-001-${unique}`;
  aoa[headerRow + 1][3] = 'DEV - Feature A';
  aoa[headerRow + 1][6] = 2; // Mon
  aoa[headerRow + 1][7] = 1; // Tue

  aoa[headerRow + 2] = [];
  aoa[headerRow + 2][2] = `PROJ-002-${unique}`;
  aoa[headerRow + 2][3] = 'QA - Bug Bash';
  aoa[headerRow + 2][8] = 3.5; // Wed

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Variable');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

  const preview = await excelParser.parseFile(buf, { mode: 'preview' });

  assert.equal(preview.sheetName, 'Variable');
  assert.equal(preview.detectedDeveloper, `QA Dev ${unique}`);
  assert.equal(preview.projects.all.length, 2);
  assert.equal(preview.projects.invalid.length, 2);
});

