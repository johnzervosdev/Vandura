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

