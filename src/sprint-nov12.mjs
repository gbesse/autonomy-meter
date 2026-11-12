import {validateRows,metrics}from './index.mjs';
export function groupThresholdMetrics(rows,thresholds){
 validateRows(rows);if(!Array.isArray(thresholds)||!thresholds.length||thresholds.length>100||thresholds.some(t=>!Number.isFinite(t)||t<0||t>1))throw new TypeError('Seuils invalides / Invalid thresholds / Umbrales inválidos');
 const groups=new Map();for(const r of rows){const key=r.group??null;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
 return {groups:[...groups].map(([group,samples])=>({group,points:thresholds.map(t=>metrics(samples,t))})),global:thresholds.map(t=>metrics(rows,t)),groupBoundsSimultaneous:false,thresholdSelected:false};
}
