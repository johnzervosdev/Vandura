import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import * as XLSX from 'xlsx';
import { excelParser } from '../src/server/services/ExcelParser';

const DEFAULT_SAMPLE_PATH = path.join(
  process.cwd(),
  'public',
  'examples',
  'JZER240405.xlsx'
);

function getSamplePath(): string {
  return process.env.TIMESHEET_SAMPLE_PATH || DEFAULT_SAMPLE_PATH;
}

function buildSyntheticSampleMatrix(): any[][] {
  // This test file is meant to characterize a *real* weekly-grid timesheet layout,
  // but we intentionally do not commit real client timesheets to the repo.
  //
  // So, when the real sample isn't available, we fall back to a small synthetic
  // workbook that matches the expected cell positions/headers used below:
  // - B2: "Name:" (label), C2: "<Developer Name>"
  // - A? header row contains "Project Code" in column C
  // - Column D contains task labels
  // - Columns E–K contain weekday hours (Sat–Fri)
  const rows: any[][] = [];

  // Ensure at least 2 rows exist for B2/C2 checks
  rows[0] = [];
  rows[1] = [];
  rows[1][1] = 'Name:'; // B2
  rows[1][2] = 'John Doe'; // C2

  // Put the grid header a little further down to mimic real-world spacing
  const headerRow = 9; // 0-based => Excel row 10
  rows[headerRow] = [];
  rows[headerRow][2] = 'Project Code'; // Column C
  rows[headerRow][3] = 'ROLE AND STORY CARD NUMBER'; // Column D (task label column)
  rows[headerRow][4] = 'Sat';
  rows[headerRow][5] = 'Sun';
  rows[headerRow][6] = 'Mon';
  rows[headerRow][7] = 'Tue';
  rows[headerRow][8] = 'Wed';
  rows[headerRow][9] = 'Thu';
  rows[headerRow][10] = 'Fri';

  // Add a couple task lines with hours in E–K
  rows[headerRow + 1] = [];
  rows[headerRow + 1][2] = 'PROJ-001';
  rows[headerRow + 1][3] = 'DEV - Feature A';
  rows[headerRow + 1][6] = 2; // Mon
  rows[headerRow + 1][7] = 1; // Tue

  rows[headerRow + 2] = [];
  rows[headerRow + 2][2] = 'PROJ-002';
  rows[headerRow + 2][3] = 'QA - Bug Bash';
  rows[headerRow + 2][8] = 3.5; // Wed

  // Add a couple rows that should be excluded from project lists
  rows[headerRow + 3] = [];
  rows[headerRow + 3][2] = '08/22/2025'; // date-like header value

  rows[headerRow + 4] = [];
  rows[headerRow + 4][2] = 'Daily totals:'; // row label, not a project

  return rows;
}

function loadMatrix(samplePath: string): any[][] {
  if (!fs.existsSync(samplePath)) {
    return buildSyntheticSampleMatrix();
  }

  const workbook = XLSX.readFile(samplePath, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json<any>(sheet, { header: 1, raw: false, defval: null });
}

function findHeaderRow(matrix: any[][], headerLabel: string): number {
  const target = headerLabel.toLowerCase();
  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r];
    if (!Array.isArray(row)) continue;
    const found = row.some(
      (cell) => typeof cell === 'string' && cell.toLowerCase().trim() === target
    );
    if (found) return r;
  }
  return -1;
}

test('Timesheet sample: detect developer name at B2/C2', () => {
  const matrix = loadMatrix(getSamplePath());
  const label = matrix[1]?.[1]; // B2
  const value = matrix[1]?.[2]; // C2

  assert.equal(typeof label, 'string');
  assert.equal(label.toLowerCase().replace(/[:\s]+/g, ''), 'name');
  assert.equal(typeof value, 'string');
  assert.ok(value.trim().length > 0);
});

test('Timesheet sample: collect Project Code values from column C', () => {
  const matrix = loadMatrix(getSamplePath());
  const headerRow = findHeaderRow(matrix, 'Project Code');
  assert.ok(headerRow >= 0, 'Project Code header row not found');

  const codes: string[] = [];
  for (let r = headerRow + 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!Array.isArray(row)) continue;
    const code = row[2]; // Column C
    if (typeof code === 'string' && code.trim().length > 0) {
      codes.push(code.trim());
    }
  }

  assert.ok(codes.length > 0, 'No project codes found');
});

test('Timesheet sample: project list excludes dates and row labels', () => {
  const samplePath = getSamplePath();
  let buf: Buffer;
  if (fs.existsSync(samplePath)) {
    buf = fs.readFileSync(samplePath);
  } else {
    const matrix = buildSyntheticSampleMatrix();
    const ws = XLSX.utils.aoa_to_sheet(matrix);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Variable');
    buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  // This is the real assertion: the parser's project list should exclude non-project tokens.
  return excelParser.parseFile(buf, { mode: 'preview' }).then((preview) => {
    assert.equal(preview.projects.all.includes('08/22/2025'), false);
    assert.equal(preview.projects.all.includes('Daily totals:'), false);
  });
});

test('Timesheet sample: detect tasks with weekday hours (Sat–Fri columns E–K)', () => {
  const matrix = loadMatrix(getSamplePath());
  const headerRow = findHeaderRow(matrix, 'Project Code');
  assert.ok(headerRow >= 0, 'Project Code header row not found');

  const tasksWithHours: string[] = [];
  for (let r = headerRow + 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!Array.isArray(row)) continue;
    const taskLabel = row[3]; // Column D (ROLE AND STORY CARD NUMBER)
    if (typeof taskLabel !== 'string' || !taskLabel.trim()) continue;

    const hoursCells = row.slice(4, 11); // Columns E–K
    const hasHours = hoursCells.some((cell) => {
      if (cell === null || cell === undefined || cell === '') return false;
      const n = typeof cell === 'number' ? cell : Number(cell);
      return Number.isFinite(n) && n > 0;
    });

    if (hasHours) tasksWithHours.push(taskLabel.trim());
  }

  assert.ok(tasksWithHours.length > 0, 'No tasks with weekday hours detected');
});
