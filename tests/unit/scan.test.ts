import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { renderScan } from '../../src/render.js';
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

test('redacts secret-bearing arguments in every scan output format', async (t) => {
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mcpmap-args-'));
  t.after(() => fs.promises.rm(directory, { recursive: true, force: true }));
  const configPath = path.join(directory, 'config.json');
  const token = 'ghp_123456789012345678901234567890';
  await fs.promises.writeFile(configPath, JSON.stringify({
    mcpServers: {
      leaky: { command: 'node', args: ['server.js', '--token', token, '--port=3000'] }
    }
  }));

  const result = await scan(options([configPath]));
  assert.deepEqual(result.servers[0]?.args, ['server.js', '--token', '<redacted>', '--port=3000']);
  for (const format of ['json', 'table', 'markdown'] as const) {
    const output = renderScan(result, format);
    assert.equal(output.includes(token), false, `${format} output leaked the token`);
    assert.match(output, /<redacted>/);
  }
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

test('reports disabled servers as informational doctor issues', async () => {
  const result = await scan(options([path.join('tests', 'fixtures', 'custom.jsonc')]));

  assert.equal(result.servers[1]?.name, 'archived');
  assert.equal(result.servers[1]?.disabled, true);
  assert.ok(result.issues.some((issue) => issue.code === 'DISABLED_SERVER' && issue.severity === 'info'));
});
