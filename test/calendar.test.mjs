import test from 'node:test';import assert from 'node:assert/strict';import {validateRows} from '../src/index.mjs';
const row={id:'a',score:.9,prediction:'ok'};
test('impossible calendar days and normalized midnight are rejected',()=>{for(const timestamp of ['2026-02-30T00:00:00Z','2025-02-29T00:00:00Z','2026-04-31T00:00:00+02:00','2026-01-01T24:00:00Z'])assert.throws(()=>validateRows([{...row,timestamp}]),/Invalid calendar/);});
test('leap day, offset and fractional timestamps remain accepted',()=>{for(const timestamp of ['2024-02-29T00:00:00Z','2026-01-01T23:59:59.123456+02:30'])assert.equal(validateRows([{...row,timestamp}])[0].timestamp,timestamp);});
