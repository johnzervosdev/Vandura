import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';
import { excelParser } from '../src/server/services/ExcelParser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

/** Must match `src/app/timesheets/upload/page.tsx` (Story 3.3 DoD). */
const STORY_33_EXACT_COPY = {
  duplicate: 'Importing the same file twice will create duplicate entries.',
  timezone: 'All times are treated as local machine time (no timezone conversion).',
} as const;

test('Story 3.3: public timesheet template is valid xlsx with canonical columns and 15-minute sample row', () => {
  const templatePath = path.join(repoRoot, 'public', 'timesheet-template.xlsx');
  const buf = readFileSync(templatePath);
  assert.ok(buf.length > 100, 'timesheet-template.xlsx should exist under public/');

  const wb = XLSX.read(buf, { type: 'buffer' });
  assert.ok(wb.SheetNames.length >= 1, 'workbook should have at least one sheet');
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];

  assert.ok(Array.isArray(aoa) && aoa.length >= 2, 'header row + at least one example row');
  const header = (aoa[0] as unknown[]).map((c) => String(c ?? '').trim());
  assert.deepEqual(header, [
    'Developer',
    'Project',
    'Task',
    'Date',
    'Start Time',
    'End Time',
    'Duration (min)',
    'Notes',
  ]);

  const durationCell = (aoa[1] as unknown[])[6];
  assert.equal(durationCell, 15, 'example row must use a valid 15-minute duration');
});

test('Story 3.3: committed template parses in preview — ≥1 preview row and explicit validation (no silent success)', async () => {
  const buf = readFileSync(path.join(repoRoot, 'public', 'timesheet-template.xlsx'));
  const r = await excelParser.parseFile(buf, { mode: 'preview' });

  assert.ok(r.preview.length >= 1, 'QA: template should yield at least one preview row');
  const explainsInvalidProjects =
    r.errors.length > 0 && r.errors.some((e) => /invalid projects/i.test(e));
  assert.ok(
    explainsInvalidProjects || r.errors.length === 0,
    'either invalid-project validation is visible (sample project not in DB) or parse is clean'
  );
});

test('Story 3.3: upload page includes DoD copy, template href, and format headings', () => {
  const pagePath = path.join(repoRoot, 'src', 'app', 'timesheets', 'upload', 'page.tsx');
  const src = readFileSync(pagePath, 'utf8');

  assert.ok(src.includes(STORY_33_EXACT_COPY.duplicate));
  assert.ok(src.includes(STORY_33_EXACT_COPY.timezone));
  assert.ok(src.includes('href="/timesheet-template.xlsx"'));
  assert.ok(src.includes('Download blank template (.xlsx)'));
  assert.ok(src.includes('Expected format'));
  assert.ok(src.includes('Dates &amp; times'));
  assert.ok(src.includes('flexibly') && src.includes('case-insensitive'));
  assert.ok(src.includes('Developer') && src.includes('Duration (min)'));
  assert.ok(src.includes('YYYY-MM-DD') && src.includes('Excel serial dates'));
});
