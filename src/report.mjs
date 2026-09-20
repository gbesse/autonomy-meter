// Purpose: Render a self-contained, offline report; never embed customer records or raw HTML.
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pct = value => value === null ? 'Unknown' : `${(value * 100).toFixed(1)}%`;
export function renderHTML(report) {
  const r = report.recommendation, h = report.holdout;
  const json = JSON.stringify(report.curve).replace(/</g, '\\u003c');
  return `<!doctype html>
<!-- Purpose: Inspect held-out automation coverage, errors and threshold tradeoffs offline. -->
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Autonomy Meter · Evaluation report</title>
<style>
:root{color-scheme:dark;font-family:system-ui,sans-serif;background:#101820;color:#eaf1f4}body{max-width:1080px;margin:auto;padding:40px 24px}h1{font-size:42px;letter-spacing:-2px;margin-bottom:8px}p{color:#b4c5ce;line-height:1.6}.eyebrow{color:#72e0c1;font-size:12px;letter-spacing:3px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px}.card,section{background:#19252f;border:1px solid #344854;border-radius:12px;padding:22px;margin-top:22px}.number{font-size:32px;margin:12px 0}table{border-collapse:collapse;width:100%}th,td{padding:12px;text-align:left;border-bottom:1px solid #344854}th{color:#b4c5ce}.scroll{overflow:auto}input{width:100%;accent-color:#72e0c1}label{display:block;margin-bottom:20px}strong{color:#72e0c1}.bar{height:16px;background:#72e0c1;border-radius:4px;margin:14px 0}small{color:#b4c5ce}li{margin:10px 0;line-height:1.5}
</style>
<main><div class="eyebrow">AUTONOMY METER / OFFLINE REPORT</div><h1>How much can you automate?</h1>
<p>Chronological evaluation: ${report.split.tuning} tuning observations, ${report.split.holdout} held out. Holdout begins ${escape(report.split.holdoutStartsAt)}.</p>
<div class="grid"><div class="card">Release assessment<div class="number">${escape(r.status.replaceAll('_', ' '))}</div><small>Candidate threshold: ${r.candidateThreshold === null ? 'none' : r.candidateThreshold.toFixed(3)}</small></div><div class="card">Held-out coverage<div class="number">${pct(h.coverage)}</div><small>${h.automated} selected / ${h.total} total</small></div><div class="card">Observed error / upper 95%<div class="number">${pct(h.observedErrorRate)} / ${pct(h.errorUpper95)}</div><small>${h.errors} errors, ${h.unlabeledAutomated} selected without labels</small></div></div>
<section><h2>Explore thresholds</h2><p>The deployed candidate was selected before looking at these holdout results. Moving this slider explores tradeoffs; it does not validate a new threshold.</p><label for="threshold">Threshold: <strong id="value"></strong></label><input id="threshold" type="range" min="0" max="${report.curve.length - 1}" step="1" value="0"><div class="bar" id="bar"></div><p id="detail" aria-live="polite"></p></section>
<section><h2>Group checks</h2><div class="scroll"><table><thead><tr><th>Group</th><th>Selected</th><th>Coverage</th><th>Errors</th><th>Upper 95%</th></tr></thead><tbody>${report.groups.map(g => `<tr><td>${escape(g.group)}</td><td>${g.automated}/${g.total}</td><td>${pct(g.coverage)}</td><td>${g.errors}</td><td>${pct(g.errorUpper95)}</td></tr>`).join('')}</tbody></table></div><p>A global pass does not guarantee a pass in each group.</p></section>
<section><h2>Interpretation</h2><ul>${report.caveats.map(c => `<li>${escape(c)}</li>`).join('')}</ul><p>${escape(report.assumptions.scoreMeaning)} ${escape(report.assumptions.costMeaning)}</p></section></main>
<script type="application/json" id="curve">${json}</script><script>
const rows=JSON.parse(document.getElementById('curve').textContent), slider=document.getElementById('threshold');
function update(){const r=rows[Number(slider.value)];document.getElementById('value').textContent=r.threshold.toFixed(3);document.getElementById('bar').style.width=(r.coverage*100)+'%';document.getElementById('detail').textContent=r.automated+' automatic, '+r.reviewed+' for review; '+r.errors+' observed errors; upper bound '+(r.errorUpper95===null?'unknown':(r.errorUpper95*100).toFixed(1)+'%')+'; scenario cost '+(r.estimatedCost===null?'unknown':r.estimatedCost.toFixed(2));}
slider.addEventListener('input',update);update();
</script></html>`;
}
