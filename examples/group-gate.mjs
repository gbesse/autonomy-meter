// Purpose: Demonstrate a globally passing release rejected by a declared drifting subgroup.
import { analyze } from '../src/index.mjs';
const rows = Array.from({ length: 240 }, (_, i) => ({ id: `r${i}`, timestamp: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(), score: 0.99, prediction: 'ok', label: i >= 144 && i < 164 && i % 4 === 0 ? 'wrong' : 'ok', group: i % 4 === 0 ? 'minority' : 'majority' }));
const options = { maxError: 0.15, minSamples: 20 };
const global = analyze(rows, options), grouped = analyze(rows, { ...options, requiredGroups: ['minority'] });
console.log(JSON.stringify({ synthetic: true, description: { fr: 'Le global passe ; le groupe déclaré échoue sans changer le seuil choisi.', en: 'Global passes; the declared group fails without changing the selected threshold.', es: 'El global pasa; el grupo declarado falla sin cambiar el umbral elegido.' }, global: global.recommendation, grouped: grouped.recommendation, groupAssessment: grouped.groupGate.holdout }, null, 2));
