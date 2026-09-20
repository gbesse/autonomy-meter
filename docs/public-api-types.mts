// Purpose: Compile-check public statistical and report APIs without executing examples.
import { analyze, metrics, type Observation } from '../src/index.mjs';
import { renderHTML } from '../src/report.mjs';
const rows: Observation[] = [{ id: 'example', timestamp: '2026-09-20T10:00:00Z', score: 0.9, prediction: 'a', label: 'a' }];
const report = analyze(rows, { maxError: 0.05 });
const html: string = renderHTML(report);
metrics(rows, null);
void html;
// @ts-expect-error Thresholds are numeric, not strings.
metrics(rows, '0.9');
