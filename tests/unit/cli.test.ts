import test from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs } from '../../src/cli.js';

test('parses repeated config paths and markdown format', () => {
  const args = parseArgs(['scan', '-c', 'a.json', '--config', 'b.jsonc', '--format', 'markdown', '--no-defaults']);
  assert.deepEqual(args.configs, ['a.json', 'b.jsonc']);
  assert.equal(args.format, 'markdown');
  assert.equal(args.includeDefaults, false);
});

test('rejects unsupported formats', () => {
  assert.throws(() => parseArgs(['scan', '--format', 'yaml']), /Unsupported format/);
});
