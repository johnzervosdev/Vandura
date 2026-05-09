import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

/** Story 6.5 — [`van/stories.md`](../van/stories.md): visible labels + title (not color-only). */
const CUE_ACTIVE_LABEL = 'Past end date';
const CUE_ON_HOLD_LABEL = 'End date passed';

function read(relFromRoot: string): string {
  return readFileSync(path.join(repoRoot, ...relFromRoot.split('/')), 'utf8');
}

test('Story 6.5: ProjectPastEndCue exposes agreed copy and title prefix', () => {
  const src = read('src/components/ProjectPastEndCue.tsx');
  assert.ok(src.includes(CUE_ACTIVE_LABEL), 'active / strong cue label');
  assert.ok(src.includes(CUE_ON_HOLD_LABEL), 'on-hold / lighter cue label');
  assert.ok(
    src.includes('title={`Planning end date was ${endLabel}`}'),
    'title must include planning end date text for accessibility'
  );
});

const SURFACES: { label: string; page: string; usage: string }[] = [
  {
    label: 'dashboard /',
    page: 'src/app/page.tsx',
    usage: '<ProjectPastEndCue endDate={project.endDate} status={project.status} />',
  },
  {
    label: '/projects',
    page: 'src/app/projects/page.tsx',
    usage: '<ProjectPastEndCue endDate={p.endDate} status={p.status} />',
  },
  {
    label: '/reports',
    page: 'src/app/reports/page.tsx',
    usage: '<ProjectPastEndCue endDate={p.endDate} status={p.status} />',
  },
  {
    label: '/projects/[id]',
    page: 'src/app/projects/[id]/page.tsx',
    usage: '<ProjectPastEndCue endDate={data.endDate} status={data.status} />',
  },
  {
    label: '/reports/[projectId]',
    page: 'src/app/reports/[projectId]/page.tsx',
    usage: '<ProjectPastEndCue endDate={projectRow.endDate} status={projectRow.status} />',
  },
];

test('Story 6.5: past-end cue is wired on all summary/detail surfaces', () => {
  for (const { label, page, usage } of SURFACES) {
    const src = read(page);
    assert.ok(
      src.includes("from '@/components/ProjectPastEndCue'"),
      `${label}: import ProjectPastEndCue`
    );
    assert.ok(src.includes(usage), `${label}: usage line`);
  }
});
