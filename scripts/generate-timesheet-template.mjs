/**
 * One-off / CI helper: writes public/timesheet-template.xlsx
 * Run: node scripts/generate-timesheet-template.mjs
 */
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(__dirname, '..', 'public', 'timesheet-template.xlsx');
fs.mkdirSync(path.dirname(out), { recursive: true });

const rows = [
  ['Developer', 'Project', 'Task', 'Date', 'Start Time', 'End Time', 'Duration (min)', 'Notes'],
  ['Sample Developer', 'Sample Project', 'Sample Task', '2026-01-15', '', '', 15, 'Example row — 15 minutes'],
];

const ws = XLSX.utils.aoa_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Timesheet');
XLSX.writeFile(wb, out);
console.log('Wrote', out);
