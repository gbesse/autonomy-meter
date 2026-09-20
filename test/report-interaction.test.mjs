// Purpose: Exercise the offline slider script with a minimal DOM model, without browser/network access.
import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { renderHTML } from '../src/report.mjs';
import { analyze } from '../src/index.mjs';
import { syntheticRows } from '../examples/synthetic-data.mjs';
test('report slider updates selected threshold, counts and coverage', () => {
  const report = analyze(syntheticRows());
  const html = renderHTML(report);
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const nodes = { curve: { textContent: JSON.stringify(report.curve) }, threshold: { value: '0', addEventListener(event, callback) { this.callback = callback; } }, value: {}, bar: { style: {} }, detail: {} };
  runInNewContext(script, { document: { getElementById: id => nodes[id] } }, { timeout: 1000 });
  assert.equal(nodes.value.textContent, '0.000');
  assert.equal(nodes.bar.style.width, '100%');
  nodes.threshold.value = String(report.curve.length - 1); nodes.threshold.callback();
  assert.equal(nodes.value.textContent, '1.000');
  assert.equal(nodes.bar.style.width, '0%');
  assert.match(nodes.detail.textContent, /0 automatic/);
});
