// Purpose: Print held-out metrics on explicitly synthetic, deterministic observations.
import { analyze } from '../src/index.mjs';
import { syntheticRows } from './synthetic-data.mjs';
const report = analyze(syntheticRows());
console.log(JSON.stringify({ source: 'synthetic fixture, not Jev performance', recommendation: report.recommendation, holdout: report.holdout }, null, 2));
