import test from 'node:test';import assert from 'node:assert/strict';
import {groupThresholdMetrics}from '../src/index.mjs';const rows=[{id:'a',timestamp:'2026-11-01T00:00:00Z',prediction:'yes',label:'yes',score:.9,group:'large'},{id:'b',timestamp:'2026-11-02T00:00:00Z',prediction:'yes',label:'no',score:.9,group:'small'},{id:'c',timestamp:'2026-11-03T00:00:00Z',prediction:'yes',score:.9,group:'unknown'}];
test('subgroup errors and missing labels remain visible',()=>{const x=groupThresholdMetrics(rows,[.8]);assert.equal(x.groups.find(g=>g.group==='small').points[0].observedErrorRate,1);assert.equal(x.groups.find(g=>g.group==='unknown').points[0].estimatedCost,null);assert.equal(x.global[0].errors,1);});
test('no threshold fitting or simultaneous bound claim',()=>{const x=groupThresholdMetrics(rows,[.8]);assert.equal(x.thresholdSelected,false);assert.equal(x.groupBoundsSimultaneous,false);});
test('invalid threshold refused',()=>assert.throws(()=>groupThresholdMetrics(rows,[NaN])));
