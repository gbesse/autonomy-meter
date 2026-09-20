// Purpose: Verify statistical boundaries, holdout isolation, missing-label behavior and report escaping.
import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze, metrics, wilsonUpper, calibration, parseJSONL, fromDecisionRecord } from '../src/index.mjs';
import { renderHTML } from '../src/report.mjs';
import { syntheticRows } from '../examples/synthetic-data.mjs';
test('zero observed errors still has a positive uncertainty bound', () => {
  assert.equal(wilsonUpper(0, 0), null);
  assert.ok(Math.abs(wilsonUpper(0, 100) - 0.0369935) < 0.000001);
  assert.ok(wilsonUpper(5, 10) > 0.7);
});
test('selects a candidate on tuning and confirms on a separate holdout', () => {
  const report = analyze(syntheticRows());
  assert.equal(report.recommendation.status, 'holdout_passed');
  assert.equal(report.recommendation.threshold, 0.97);
  assert.equal(report.holdout.automated, 160);
  assert.equal(report.holdout.errors, 0);
  assert.equal(report.split.tuning, 360);
});
test('changing holdout labels cannot influence the selected candidate', () => {
  const rows = syntheticRows();
  const original = analyze(rows);
  rows.slice(360).forEach(row => { row.label = 'wrong'; });
  const report = analyze(rows);
  assert.equal(report.recommendation.candidateThreshold, original.recommendation.candidateThreshold);
  assert.equal(report.recommendation.threshold, null);
  assert.equal(report.recommendation.status, 'holdout_failed');
});
test('small samples cannot justify automation even with no observed errors', () => {
  const report = analyze(syntheticRows(20));
  assert.equal(report.recommendation.status, 'no_eligible_threshold');
  assert.equal(report.recommendation.threshold, null);
});
test('unlabeled automated rows remain unknown and block an eligibility claim', () => {
  const rows = syntheticRows(); rows.forEach(row => { row.label = null; });
  const m = metrics(rows, 0.9);
  assert.equal(m.observedErrorRate, null); assert.equal(m.estimatedCost, null);
  assert.equal(analyze(rows).recommendation.status, 'no_eligible_threshold');
});
test('calibration scores measure correctness, including score exactly one', () => {
  const rows = syntheticRows(2); rows[0].score = 1; rows[0].label = 'wrong'; rows[1].score = 1;
  assert.equal(calibration(rows).correctnessBrier, 0.5);
  assert.equal(calibration(rows).bins[9].count, 2);
});
test('input validation rejects duplicates, invalid scores and missing timezone', () => {
  const rows = syntheticRows(2);
  assert.throws(() => analyze([rows[0], rows[0]]), /unique/);
  assert.throws(() => analyze([{ ...rows[0], score: 1.1 }, rows[1]]), /score/);
  assert.throws(() => analyze([{ ...rows[0], timestamp: '2026-01-01' }, rows[1]]), /timestamp/);
  assert.throws(() => parseJSONL('{broken}\n'), /line 1/);
  assert.throws(() => analyze(rows, { maxError: NaN }), /maxError/);
  assert.throws(() => metrics(rows, 0, { errorCost: -1 }), /Costs/);
});
test('equal timestamps cannot be split across tuning and holdout', () => {
  const rows = syntheticRows(10); rows.forEach(row => { row.timestamp = rows[0].timestamp; });
  assert.throws(() => analyze(rows), /distinct timestamps/);
});
test('group and prediction strings cannot inject HTML', () => {
  const rows = syntheticRows(); rows[500].group = '<script>alert(1)</script>';
  const html = renderHTML(analyze(rows));
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(!html.includes('<script>alert(1)</script>'));
});
test('DecisionPacks adapter uses selected probability, never the confidence statistic', () => {
  const row = fromDecisionRecord({ id: 'record-1', timestamp: new Date().toISOString(), answers: { team: { type: 'choice', choice: 'billing', probabilities: { billing: 0.94 }, confidence: 0.4 } } }, { question: 'team', label: 'billing' });
  assert.equal(row.score, 0.94);
});
