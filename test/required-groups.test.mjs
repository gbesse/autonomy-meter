// Purpose: Prevent a global pass from hiding a declared small or drifting subgroup.
import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../src/index.mjs';
import { renderHTML } from '../src/report.mjs';
import { spawnSync } from 'node:child_process';

function rows() {
  return Array.from({ length: 240 }, (_, i) => ({ id: `r${i}`, timestamp: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(), score: 0.99, prediction: 'ok', label: 'ok', group: i % 4 === 0 ? 'minority' : 'majority' }));
}
test('a sufficiently sampled required group passes both chronological samples', () => {
  const report = analyze(rows(), { maxError: 0.15, minSamples: 20, requiredGroups: ['minority'] });
  assert.equal(report.recommendation.status, 'holdout_passed');
  assert.equal(report.groupGate.tuning[0].eligible, true);
  assert.equal(report.groupGate.holdout[0].eligible, true);
});
test('group drift rejects a globally passing holdout without retuning', () => {
  const data = rows();
  data.slice(144).forEach((row, i) => { if (row.group === 'minority' && i < 20) row.label = 'wrong'; });
  const options = { maxError: 0.15, minSamples: 20 };
  const global = analyze(data, options), grouped = analyze(data, { ...options, requiredGroups: ['minority'] });
  assert.equal(global.recommendation.status, 'holdout_passed');
  assert.equal(grouped.recommendation.status, 'holdout_failed');
  assert.equal(grouped.recommendation.candidateThreshold, global.recommendation.candidateThreshold);
  assert.equal(grouped.groupGate.holdout[0].eligible, false);
  assert.equal(grouped.recommendation.threshold, null);
});
test('missing and small required groups cannot borrow the majority sample count', () => {
  const data = rows(); data.forEach((row, i) => { row.group = i === 0 ? 'rare' : 'majority'; });
  for (const group of ['rare', 'absent']) {
    const report = analyze(data, { maxError: 0.15, minSamples: 20, requiredGroups: [group] });
    assert.equal(report.recommendation.status, 'no_eligible_threshold');
    assert.equal(report.groupGate.tuning[0].eligible, false);
  }
});
test('required groups are validated and safely escaped in the offline report', () => {
  assert.throws(() => analyze(rows(), { requiredGroups: ['minority', 'minority'] }), /unique/);
  const data = rows(); data.forEach(row => { if (row.group === 'minority') row.group = '<img src=x onerror=alert(1)>'; });
  const html = renderHTML(analyze(data, { maxError: 0.15, minSamples: 20, requiredGroups: ['<img src=x onerror=alert(1)>'] }));
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(!html.includes('<img src=x onerror=alert(1)>'));
  assert.ok(html.includes('Groupes exigés / Required groups / Grupos requeridos'));
});
test('CLI repeated required-group flags enforce the release gate', () => {
  const result = spawnSync(process.execPath, ['bin/autonomy-meter.mjs', 'examples/synthetic-observations.jsonl', '--require-group', 'absent', '--require-pass'], { encoding: 'utf8' });
  assert.equal(result.status, 2);
  assert.deepEqual(JSON.parse(result.stdout).groupGate.required, ['absent']);
});
