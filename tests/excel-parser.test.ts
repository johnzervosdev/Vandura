import test from 'node:test';
import assert from 'node:assert/strict';
import { excelParser } from '../src/server/services/ExcelParser';

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