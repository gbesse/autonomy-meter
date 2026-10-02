# Autonomy Meter

**Choose automation thresholds with evidence, then test them on data you held back.**

[![Tests](https://github.com/gbesse/autonomy-meter/actions/workflows/test.yml/badge.svg)](https://github.com/gbesse/autonomy-meter/actions/workflows/test.yml)
[MIT](LICENSE) · Node.js 22+ · Offline by default · No runtime dependencies · Public alpha

Autonomy Meter measures the tradeoff between automated coverage and observed errors.
It picks a threshold on an earlier tuning sample, evaluates it on a later holdout, and
produces JSON plus a standalone interactive HTML report. No customer records leave your machine.

## Quick start

```sh
git clone https://github.com/gbesse/autonomy-meter.git
cd autonomy-meter
npm run demo
node bin/autonomy-meter.mjs examples/synthetic-observations.jsonl --html local-report.html
```

Open `local-report.html` in your browser. The report works offline. The included dataset
is synthetic: it demonstrates behavior and does not measure Jev accuracy. HTML output
uses exclusive creation and will not overwrite an existing file.

## Input format

One JSON object per line:

```json
{"id":"decision-1","timestamp":"2026-09-20T08:00:00Z","score":0.94,"prediction":"billing","label":"billing","group":"English"}
```

- `id`: unique observation id.
- `timestamp`: decision time with an explicit timezone.
- `score`: estimated probability that the selected `prediction` is correct, between 0 and 1.
- `prediction`: selected class, as a string.
- `label`: reference class confirmed independently; missing/null means unknown.
- `group`: optional diagnostic segment, such as language or product.

For a Jev Choice, use `probabilities[choice]`, **not `confidence`**. Score and Noul
need an application-specific mapping to a prediction and a correctness probability;
the tool does not silently reinterpret them.

## A gate for your release process

```sh
node bin/autonomy-meter.mjs observations.jsonl --max-error 0.05 --min-samples 30 --require-pass
```

Exit codes: 0 = successful analysis (or a passing gate); 1 = invalid input or I/O error;
2 = `--require-pass` was requested but the held-out assessment did not pass.

The tool requires the upper endpoint of a two-sided 95% Wilson interval to be within
`--max-error`, and at least `--min-samples` labeled automatic decisions, on both tuning
and holdout data. Zero observed errors is not a zero upper bound. A candidate that
fails holdout is rejected; the tool does not choose another threshold using the holdout.

A pass is historical evidence, not authorization or a guarantee of future accuracy.

## Library usage

```sh
npm install github:gbesse/autonomy-meter#v0.1.1
```

```js
import { analyze, parseJSONL, fromDecisionRecord } from '@gbesse/autonomy-meter';
const report = analyze(rows, { maxError: 0.05, minSamples: 30, tuneFraction: 0.6 });
const observation = fromDecisionRecord(record, {
  question: 'department', label: 'billing', group: 'English',
});
```

`record` can come from [DecisionPacks](https://github.com/gbesse/decisionpacks).
Collect labels independently and sample automatic decisions too, not only escalations.

## What the report contains

- Chronological tuning/holdout sizes and the selected candidate.
- Automation coverage, observed errors and Wilson upper bounds.
- Unknown-label counts; unknown automatic outcomes block an eligibility claim.
- Reliability bins, correctness Brier score and expected calibration error.
- Group diagnostics and an exploratory threshold slider.
- Scenario costs with explicit review/error costs and assumptions.

The HTML contains aggregated results only, not original observations. Group labels are
HTML-escaped. The CLI sends no telemetry and never calls a model.

## Shareable demo report

Run `npm run demo:report` to capture this repository’s bundled example as one JSON object with the project purpose, version and complete demo output. The command fails if the demo fails, so the report is useful when sharing a reproducible first look or reporting unexpected behavior. The bundled demo’s data and safety boundaries still apply.

## Boundaries

This alpha reads data into memory and scans exact tuning thresholds; use modest datasets
(thousands of observations), not a warehouse export. Chronological splitting reduces one
source of leakage but does not make correlated observations independent. A global pass
can hide a failing subgroup. You must investigate both.

The cost scenario assumes reviewed cases are corrected and excludes inference/integration
cost. Calibration reports **correctness** of the selected class, not the full multiclass
Brier score. No recalibration, fine-tuning, causal ROI estimate, insurance guarantee or
hosted monitoring is implemented.

See [methodology](docs/methodology.md), [validation](docs/validation.md), and
[contributing](CONTRIBUTING.md). Pair with [IntentBus](https://github.com/gbesse/intentbus)
to observe the outcomes of event-driven automations.
