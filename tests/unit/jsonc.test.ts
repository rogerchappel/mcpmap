import test from 'node:test';
import assert from 'node:assert/strict';
import { parseJsonc, stripJsonComments } from '../../src/jsonc.js';

test('strips line and block comments while keeping URLs', () => {
  const source = '{"url":"https://example.test/a//b",/*x*/"ok":true}// tail';
  assert.equal((parseJsonc(source, 'inline') as { ok: boolean }).ok, true);
  assert.match(stripJsonComments(source), /https:\/\/example/);
});

test('accepts trailing commas', () => {
  assert.deepEqual(parseJsonc('{"a":[1,2,],}', 'inline'), { a: [1, 2] });
});
