import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/** Story 8.1: FAB mounted from Providers so it ships on every route shell. */
test('Story 8.1: Providers mounts BugReportFab', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'src/app/providers.tsx'), 'utf8');
  assert.match(src, /BugReportFab/);
  assert.match(src, /@\/components\/BugReportFab/);
});

test('Story 8.1: root appRouter exposes bugReport', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'src/server/routers/index.ts'), 'utf8');
  assert.match(src, /bugReportRouter/);
  assert.match(src, /\bbugReport:\s*bugReportRouter/);
});

test('Story 8.1: BugReportFab — accessible name, fixed control, modal copy, empty state, scroll list', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'src/components/BugReportFab.tsx'), 'utf8');
  assert.match(src, /aria-label="Report a bug or feedback"/);
  assert.match(src, /fixed bottom-4 right-4/);
  assert.match(src, /Escape/);
  assert.match(src, /No open reports\./);
  assert.match(src, /max-h-56/);
  assert.match(src, /Bug reports & feedback/);
  assert.match(src, /<Modal/);
});
