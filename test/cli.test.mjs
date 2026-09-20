// Purpose: Verify CLI release-gate exit codes and non-overwriting HTML report creation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const cwd = fileURLToPath(new URL('..', import.meta.url));
const run = args => spawnSync(process.execPath, ['bin/autonomy-meter.mjs', 'examples/synthetic-observations.jsonl', ...args], { cwd, encoding: 'utf8', timeout: 10_000 });
test('CLI gate distinguishes passed, rejected and invalid input', () => {
  assert.equal(run(['--require-pass']).status, 0);
  assert.equal(run(['--min-samples', '10000', '--require-pass']).status, 2);
  assert.equal(run(['--max-error', 'not-a-number']).status, 1);
});
test('HTML output is standalone and cannot overwrite existing files', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'autonomy-report-test-'));
  t.after(() => rm(directory, { recursive: true }));
  const path = join(directory, 'report.html');
  assert.equal(run(['--html', path]).status, 0);
  const html = await readFile(path, 'utf8');
  assert.match(html, /Explore thresholds/);
  assert.ok(!html.includes('<script src='));
  assert.equal(run(['--html', path]).status, 1);
});
