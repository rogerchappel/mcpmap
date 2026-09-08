import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parseArgs } from '../../src/cli.js';

const execFileAsync = promisify(execFile);

test('parses repeated config paths and markdown format', () => {
  const args = parseArgs(['scan', '-c', 'a.json', '--config', 'b.jsonc', '--format', 'markdown', '--no-defaults']);
  assert.deepEqual(args.configs, ['a.json', 'b.jsonc']);
  assert.equal(args.format, 'markdown');
  assert.equal(args.includeDefaults, false);
});

test('rejects unsupported formats', () => {
  assert.throws(() => parseArgs(['scan', '--format', 'yaml']), /Unsupported format/);
});

test('built doctor CLI succeeds for disabled-only startup-readiness gaps', async (t) => {
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mcpmap-disabled-doctor-'));
  t.after(() => fs.promises.rm(directory, { recursive: true, force: true }));
  const configPath = path.join(directory, 'config.json');
  await fs.promises.writeFile(configPath, JSON.stringify({
    mcpServers: {
      noCommand: { disabled: true },
      missingCommand: { disabled: true, command: 'definitely-not-installed' },
      relativeCwd: { disabled: true, command: process.execPath, cwd: 'relative' }
    }
  }));

  const { stdout } = await execFileAsync(process.execPath, ['dist/cli.js', 'doctor', '--no-defaults', '--config', configPath, '--format', 'json']);
  const output = JSON.parse(stdout) as { issues: Array<{ code: string }> };
  assert.deepEqual(output.issues.map((issue) => issue.code), ['DISABLED_SERVER', 'DISABLED_SERVER', 'DISABLED_SERVER']);
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
