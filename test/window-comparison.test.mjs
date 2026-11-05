import test from 'node:test';import assert from 'node:assert/strict';import {compareWindows}from '../src/index.mjs';const r=(id,label)=>({id,timestamp:'2026-11-05T00:00:00Z',score:.9,prediction:'yes',label});
test('frozen threshold exposes observed degradation',()=>{const x=compareWindows([r('a','yes')],[r('b','no')],.8);assert.equal(x.observedErrorRateDelta,1);assert.equal(x.retuned,false);assert.equal(x.driftProven,false);});
test('missing labels keep comparison unknown',()=>assert.equal(compareWindows([r('a','yes')],[r('b',null)],.8).observedErrorRateDelta,null));
test('overlap rejected',()=>assert.throws(()=>compareWindows([r('a','yes')],[r('a','yes')],.8),/Overlapping/));
