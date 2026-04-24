import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

/** Story 6.6 — [`van/stories.md`](../van/stories.md) + Hannibal sign-off on link label. */
const STORY_66_LINK_TEXT = 'View developer productivity report';

/** Hannibal editorial — aligned with Developers page vocabulary (`van/stories.md` Implementation). */
const STORY_66_SUBLINE =
  'Hours, projects, and tasks by developer for a selected date range.';

function readDevelopersPageSrc(): string {
  return readFileSync(path.join(repoRoot, 'src', 'app', 'developers', 'page.tsx'), 'utf8');
}

test('Story 6.6: /developers includes productivity report link (next/link, one focusable target)', () => {
  const src = readDevelopersPageSrc();

  assert.ok(/from ['"]next\/link['"]/.test(src), 'page should import next/link');
  assert.ok(src.includes('href="/reports/productivity"'));
  assert.ok(src.includes(STORY_66_LINK_TEXT));
  assert.ok(
    !/click here/i.test(src),
    'avoid placeholder link copy'
  );
});

test('Story 6.6: productivity link subline uses developer vocabulary (Hannibal editorial)', () => {
  const src = readDevelopersPageSrc();
  assert.ok(src.includes(STORY_66_SUBLINE), 'subline under link should match agreed copy');
  assert.ok(
    !/by person for a selected date range/i.test(src),
    'avoid superseded “by person” subline copy'
  );
});

test('Story 6.6: Add Developer action remains in the same top band as the report link', () => {
  const src = readDevelopersPageSrc();
  assert.ok(src.includes('Add Developer'), 'primary add action should remain');

  const iLink = src.indexOf(STORY_66_LINK_TEXT);
  const iSub = src.indexOf(STORY_66_SUBLINE);
  const iAdd = src.indexOf('Add Developer');
  assert.ok(iLink !== -1 && iSub !== -1 && iAdd !== -1, 'link, subline, and Add Developer should all exist');
  assert.ok(
    iLink < iSub && iSub < iAdd,
    'source order: link text, then subline, then Add Developer (top action row)'
  );
});
