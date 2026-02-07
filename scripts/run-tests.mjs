import { readdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const testsDir = path.join(repoRoot, 'tests');

const testFiles = readdirSync(testsDir)
  .filter((f) => f.endsWith('.test.ts'))
  .map((f) => path.join('tests', f))
  .sort();

if (testFiles.length === 0) {
  console.error('No test files found matching tests/*.test.ts');
  process.exit(1);
}

const args = ['--import', 'tsx', '--test', ...testFiles];
const result = spawnSync(process.execPath, args, { stdio: 'inherit' });

process.exit(result.status ?? 1);

