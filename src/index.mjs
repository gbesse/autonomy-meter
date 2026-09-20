// Purpose: Quantify selective automation using separate tuning and chronological holdout samples.
function ensure(condition, message) { if (!condition) throw new Error(message); }
function unit(value, name) { ensure(Number.isFinite(value) && value >= 0 && value <= 1, `${name} must be between 0 and 1`); }

export function validateRows(rows) {
  ensure(Array.isArray(rows) && rows.length > 0, 'Provide at least one observation');
  const ids = new Set();
  for (const row of rows) {
    ensure(row && typeof row === 'object', 'Observation must be an object');
    ensure(typeof row.id === 'string' && row.id.length > 0 && !ids.has(row.id), 'Observation ids must be nonempty and unique');
    ids.add(row.id);
    ensure(typeof row.timestamp === 'string' && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(row.timestamp) && Number.isFinite(Date.parse(row.timestamp)), `Invalid timezone-qualified timestamp: ${row.id}`);
    unit(row.score, `score for ${row.id}`);
    ensure(typeof row.prediction === 'string' && row.prediction.length > 0, `Missing prediction: ${row.id}`);
    ensure(row.label === undefined || row.label === null || (typeof row.label === 'string' && row.label.length > 0), `Invalid label: ${row.id}`);
    ensure(row.group === undefined || typeof row.group === 'string', `Invalid group: ${row.id}`);
  }
  return rows;
}

/** Wilson's two-sided 95% upper endpoint; descriptive bound, not a guarantee under drift. */
export function wilsonUpper(errors, count) {
  ensure(Number.isInteger(count) && count >= 0 && Number.isInteger(errors) && errors >= 0 && errors <= count, 'Invalid binomial counts');
  if (!count) return null;
  const z = 1.959963984540054, z2 = z * z, p = errors / count;
  return (p + z2 / (2 * count) + z * Math.sqrt((p * (1 - p) + z2 / (4 * count)) / count)) / (1 + z2 / count);
}

export function metrics(rows, threshold, { reviewCost = 1, errorCost = 100 } = {}) {
  validateRows(rows);
  if (threshold !== null) unit(threshold, 'threshold');
  ensure(Number.isFinite(reviewCost) && reviewCost >= 0 && Number.isFinite(errorCost) && errorCost >= 0, 'Costs must be finite and nonnegative');
  const selected = threshold === null ? [] : rows.filter(row => row.score >= threshold);
  const labeled = selected.filter(row => typeof row.label === 'string');
  const errors = labeled.filter(row => row.prediction !== row.label).length;
  return {
    threshold, total: rows.length, automated: selected.length, reviewed: rows.length - selected.length,
    coverage: selected.length / rows.length, labeledAutomated: labeled.length,
    unlabeledAutomated: selected.length - labeled.length, errors,
    observedErrorRate: labeled.length ? errors / labeled.length : null,
    errorUpper95: wilsonUpper(errors, labeled.length),
    // Partial labels cannot justify an expected loss; null keeps unknown losses visible.
    estimatedCost: labeled.length === selected.length ? (rows.length - selected.length) * reviewCost + errors * errorCost : null,
    manualReviewCost: rows.length * reviewCost,
  };
}

export function calibration(rows, bins = 10) {
  validateRows(rows);
  ensure(Number.isInteger(bins) && bins >= 1 && bins <= 100, 'bins must be between 1 and 100');
  const labeled = rows.filter(row => typeof row.label === 'string');
  const buckets = Array.from({ length: bins }, (_, i) => ({ lower: i / bins, upper: (i + 1) / bins, count: 0, scoreSum: 0, correct: 0 }));
  let squaredError = 0;
  for (const row of labeled) {
    const correct = Number(row.prediction === row.label);
    const bucket = buckets[Math.min(bins - 1, Math.floor(row.score * bins))];
    bucket.count++; bucket.scoreSum += row.score; bucket.correct += correct;
    squaredError += (row.score - correct) ** 2;
  }
  const reliability = buckets.map(({ lower, upper, count, scoreSum, correct }) => ({ lower, upper, count, meanScore: count ? scoreSum / count : null, accuracy: count ? correct / count : null }));
  return {
    labeled: labeled.length, unlabeled: rows.length - labeled.length,
    correctnessBrier: labeled.length ? squaredError / labeled.length : null,
    expectedCalibrationError: labeled.length ? reliability.reduce((sum, b) => sum + b.count * Math.abs((b.meanScore ?? 0) - (b.accuracy ?? 0)), 0) / labeled.length : null,
    bins: reliability,
  };
}

export function analyze(rows, { maxError = 0.05, minSamples = 30, tuneFraction = 0.6, reviewCost = 1, errorCost = 100 } = {}) {
  validateRows(rows);
  unit(maxError, 'maxError');
  ensure(Number.isInteger(minSamples) && minSamples > 0, 'minSamples must be a positive integer');
  ensure(Number.isFinite(tuneFraction) && tuneFraction > 0 && tuneFraction < 1, 'tuneFraction must be strictly between 0 and 1');
  ensure(rows.length >= 2, 'Need at least two observations for a holdout');
  const sorted = [...rows].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp) || a.id.localeCompare(b.id));
  let boundary = Math.max(1, Math.min(sorted.length - 1, Math.floor(sorted.length * tuneFraction)));
  // Keep observations at the same timestamp together to prevent temporal split leakage.
  while (boundary < sorted.length && Date.parse(sorted[boundary - 1].timestamp) === Date.parse(sorted[boundary].timestamp)) boundary++;
  ensure(boundary < sorted.length, 'Cannot create chronological holdout: provide distinct timestamps');
  const tune = sorted.slice(0, boundary), holdout = sorted.slice(boundary);
  const thresholds = [...new Set([0, 1, ...tune.map(row => row.score)])].sort((a, b) => a - b);
  const costOptions = { reviewCost, errorCost };
  const eligible = measurement => measurement.labeledAutomated >= minSamples && measurement.unlabeledAutomated === 0 && measurement.errorUpper95 !== null && measurement.errorUpper95 <= maxError;
  const tuningCurve = thresholds.map(threshold => metrics(tune, threshold, costOptions));
  // Select on tuning data only. The held-out result may reject this threshold; never retune on it.
  const candidate = tuningCurve.filter(eligible).sort((a, b) => b.automated - a.automated || b.threshold - a.threshold)[0];
  const threshold = candidate?.threshold ?? null;
  const heldout = metrics(holdout, threshold, costOptions);
  const accepted = threshold !== null && eligible(heldout);
  const groupNames = [...new Set(holdout.map(row => row.group ?? 'ungrouped'))].sort();
  return {
    schemaVersion: 1,
    assumptions: { maxError, minSamples, tuneFraction, reviewCost, errorCost, scoreMeaning: 'Estimated probability that the selected prediction is correct; do not substitute Jev confidence.', costMeaning: 'Scenario cost; assumes reviewed rows are corrected, excludes inference and operational costs.', interval: 'Two-sided 95% Wilson upper endpoint, assuming independent representative observations. No simultaneous group guarantee.' },
    split: { total: rows.length, tuning: tune.length, holdout: holdout.length, holdoutStartsAt: holdout[0].timestamp },
    recommendation: { status: accepted ? 'holdout_passed' : threshold === null ? 'no_eligible_threshold' : 'holdout_failed', threshold: accepted ? threshold : null, candidateThreshold: threshold },
    tuning: candidate ?? metrics(tune, null, costOptions), holdout: heldout,
    calibration: calibration(holdout),
    groups: groupNames.map(group => ({ group, ...metrics(holdout.filter(row => (row.group ?? 'ungrouped') === group), threshold, costOptions) })),
    curve: thresholds.map(value => metrics(holdout, value, costOptions)),
    caveats: ['Threshold chosen on tuning data; curve is exploratory holdout analysis, not permission to select another threshold.', 'Historical accuracy does not guarantee future performance or authorize an action.', 'Missing labels can bias results. Inspect the source and representativeness of human outcomes.', 'A global pass does not imply each group passes. Small group intervals are uncertain.'],
  };
}

export function parseJSONL(text) {
  const lines = text.split(/\r?\n/);
  const rows = [];
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    try { rows.push(JSON.parse(lines[i])); }
    catch (cause) { throw new Error(`Invalid JSON at line ${i + 1}`, { cause }); }
  }
  return validateRows(rows);
}

export function fromDecisionRecord(record, { question, label, group } = {}) {
  const answer = record.answers?.[question];
  ensure(answer?.type === 'choice', 'Adapter requires a Choice answer');
  const row = { id: record.id, timestamp: record.timestamp, prediction: answer.choice, score: answer.probabilities?.[answer.choice], label, group };
  validateRows([row]);
  return row;
}
