#!/usr/bin/env node
// Purpose: Analyze labeled JSONL decisions and optionally save an offline HTML report.
import { readFile, writeFile } from 'node:fs/promises';
import { analyze, parseJSONL } from '../src/index.mjs';
import { renderHTML } from '../src/report.mjs';
async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args[0] === '--help') {
    console.log('autonomy-meter OBSERVATIONS.jsonl [--max-error 0.05] [--min-samples 30] [--tune-fraction 0.6] [--review-cost 1] [--error-cost 100] [--html REPORT.html] [--require-group NAME] [--require-pass]\nFR : Rapport JSON sur stdout ; --require-pass sort avec 2 si le holdout ou un groupe exigé échoue. Répéter --require-group pour chaque groupe.\nEN: JSON report goes to stdout; --require-pass exits 2 if holdout or a required group fails. Repeat --require-group for each group.\nES: Informe JSON en stdout; --require-pass sale con 2 si falla el holdout o un grupo requerido. Repetir --require-group por grupo.'); return;
  }
  const input = args.shift(), options = {}; let html, requirePass = false;
  const names = { '--max-error': 'maxError', '--min-samples': 'minSamples', '--tune-fraction': 'tuneFraction', '--review-cost': 'reviewCost', '--error-cost': 'errorCost' };
  while (args.length) {
    const flag = args.shift();
    if (flag === '--require-pass') { requirePass = true; continue; }
    if (flag === '--require-group') {
      const group = args.shift();
      if (!group || group.startsWith('--')) throw new Error('Nom de groupe requis. / Group name required. / Nombre de grupo requerido.');
      (options.requiredGroups ??= []).push(group); continue;
    }
    const value = args.shift();
    if (!value) throw new Error(`Missing value for ${flag}`);
    if (flag === '--html') html = value;
    else if (Object.hasOwn(names, flag)) options[names[flag]] = Number(value);
    else throw new Error(`Unknown flag: ${flag}`);
  }
  const report = analyze(parseJSONL(await readFile(input, 'utf8')), options);
  if (html) await writeFile(html, renderHTML(report), { flag: 'wx' });
  console.log(JSON.stringify(report, null, 2));
  if (requirePass && report.recommendation.status !== 'holdout_passed') process.exitCode = 2;
}
main().catch(error => { console.error(`autonomy-meter: ${error.message}`); process.exitCode = 1; });
