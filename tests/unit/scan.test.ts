import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { scan } from '../../src/scan.js';
import type { CliOptions } from '../../src/types.js';

function options(configs: string[]): CliOptions {
  return { command: 'scan', configs, format: 'json', allowRun: false, timeoutMs: 1500, cwd: process.cwd(), home: process.cwd(), includeDefaults: false };
}

test('scans Claude Desktop style configs and redacts secrets', async () => {
  const result = await scan(options([path.join('tests', 'fixtures', 'claude-desktop.json')]));
  assert.equal(result.servers.length, 2);
  assert.equal(result.servers[0]?.env.API_TOKEN, '<redacted>');
});

test('scans VS Code style configs and reports relative cwd', async () => {
  const result = await scan(options([path.join('tests', 'fixtures', 'vscode-mcp.json')]));
  assert.equal(result.servers[0]?.name, 'sqlite');
  assert.ok(result.issues.some((issue) => issue.code === 'RELATIVE_CWD'));
});

test('scans custom JSONC server maps', async () => {
  const result = await scan(options([path.join('tests', 'fixtures', 'custom.jsonc')]));
  assert.equal(result.servers[0]?.name, 'notes');
  assert.deepEqual(result.servers[0]?.args, ['server.js']);
});
