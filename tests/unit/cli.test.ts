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

test('rejects a recognized option where a flag value is required', () => {
  for (const [flag, nextOption] of [
    ['--config', '--no-defaults'],
    ['-c', '--format'],
    ['--format', '--allow-run'],
    ['-f', '--timeout-ms'],
    ['--timeout-ms', '--help']
  ]) {
    assert.throws(
      () => parseArgs(['scan', flag, nextOption]),
      { message: `${flag} requires a value` },
      `${flag} followed by ${nextOption}`
    );
  }
});

test('preserves path values that resemble unrecognized options', () => {
  assert.deepEqual(parseArgs(['scan', '--config', '--custom.json']).configs, ['--custom.json']);
});

test('accepts integer timeout boundary values', () => {
  assert.equal(parseArgs(['scan', '--timeout-ms', '100']).timeoutMs, 100);
  assert.equal(parseArgs(['scan', '--timeout-ms', '1500']).timeoutMs, 1500);
});

test('rejects malformed and out-of-range timeout values', () => {
  for (const value of ['99', '100abc', '1e3', '100.5', 'Infinity', 'NaN', '-100', ' 100']) {
    assert.throws(
      () => parseArgs(['scan', '--timeout-ms', value]),
      { message: '--timeout-ms must be a finite base-10 integer >= 100' },
      value
    );
  }
});
