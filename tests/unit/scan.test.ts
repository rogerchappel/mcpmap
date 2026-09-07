import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { renderScan } from '../../src/render.js';
import { scan } from '../../src/scan.js';
import { doctorRecord } from '../../src/doctor.js';
import type { CliOptions } from '../../src/types.js';

function options(configs: string[]): CliOptions {
  return { command: 'scan', configs, format: 'json', allowRun: false, timeoutMs: 1500, cwd: process.cwd(), home: process.cwd(), includeDefaults: false };
}

test('scans Claude Desktop style configs and redacts secrets', async () => {
  const result = await scan(options([path.join('tests', 'fixtures', 'claude-desktop.json')]));
  assert.equal(result.servers.length, 2);
  assert.equal(result.servers[0]?.env.API_TOKEN, '<redacted>');
});

test('rejects a missing explicit config with its resolved path', async () => {
  const missing = path.join(os.tmpdir(), 'mcpmap-missing-explicit.json');
  await assert.rejects(scan(options([missing])), {
    message: `Explicit config file not found: ${missing}`
  });
});

test('silently skips missing default discovery paths', async (t) => {
  const home = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mcpmap-empty-home-'));
  t.after(() => fs.promises.rm(home, { recursive: true, force: true }));
  const result = await scan({ ...options([]), home, includeDefaults: true });

  assert.equal(result.servers.length, 0);
  assert.equal(result.sources.length > 0, true);
  assert.equal(result.sources.every((source) => !source.explicit && !source.exists), true);
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

test('uses original secrets only for an opt-in startup probe', async (t) => {
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mcpmap-probe-secrets-'));
  t.after(() => fs.promises.rm(directory, { recursive: true, force: true }));
  const configPath = path.join(directory, 'config.json');
  const envSecret = 'sk-environment-secret-1234567890';
  const argumentSecret = 'ghp_123456789012345678901234567890';
  const script = 'process.exit(process.env.API_TOKEN === process.argv[1] && process.argv[2] === "expected" ? 0 : 23)';
  await fs.promises.writeFile(configPath, JSON.stringify({
    mcpServers: {
      controlled: {
        command: process.execPath,
        args: ['-e', script, envSecret, 'expected', '--token', argumentSecret],
        env: { API_TOKEN: envSecret }
      }
    }
  }));

  const result = await scan({ ...options([configPath]), allowRun: true, timeoutMs: 500 });
  assert.equal(result.servers[0]?.probe?.status, 'started');
  assert.deepEqual(result.servers[0]?.env, { API_TOKEN: '<redacted>' });
  assert.equal(result.servers[0]?.args.includes(envSecret), false);
  assert.equal(result.servers[0]?.args.includes(argumentSecret), false);
  assert.equal(result.servers[0]?.args.filter((argument) => argument === '<redacted>').length, 2);

  for (const format of ['json', 'table', 'markdown'] as const) {
    const output = renderScan(result, format);
    assert.equal(output.includes(envSecret), false, `${format} output leaked the environment secret`);
    assert.equal(output.includes(argumentSecret), false, `${format} output leaked the argument secret`);
  }
  assert.equal(result.servers[0]?.probe?.message.includes(envSecret), false);
  assert.equal(result.servers[0]?.probe?.message.includes(argumentSecret), false);
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

test('does not probe disabled servers while probing enabled servers', async (t) => {
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mcpmap-disabled-probe-'));
  t.after(() => fs.promises.rm(directory, { recursive: true, force: true }));
  const disabledMarker = path.join(directory, 'disabled-marker');
  const enabledMarker = path.join(directory, 'enabled-marker');
  const configPath = path.join(directory, 'config.json');
  const writeMarker = 'require("node:fs").writeFileSync(process.argv[1], "started")';
  await fs.promises.writeFile(configPath, JSON.stringify({
    mcpServers: {
      disabled: { command: process.execPath, args: ['-e', writeMarker, disabledMarker], disabled: true },
      enabled: { command: process.execPath, args: ['-e', writeMarker, enabledMarker] }
    }
  }));

  const result = await scan({ ...options([configPath]), allowRun: true, timeoutMs: 500 });

  assert.equal(result.servers[0]?.disabled, true);
  assert.equal(result.servers[0]?.probe, undefined);
  await assert.rejects(fs.promises.access(disabledMarker), { code: 'ENOENT' });
  assert.equal(result.servers[1]?.probe?.status, 'started');
  await fs.promises.access(enabledMarker);
  assert.ok(result.issues.some((issue) => issue.code === 'DISABLED_SERVER' && issue.server === 'disabled'));
});

test('resolves relative commands from the configured absolute cwd without running them', async (t) => {
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mcpmap-command-'));
  t.after(() => fs.promises.rm(directory, { recursive: true, force: true }));
  await fs.promises.writeFile(path.join(directory, 'start.sh'), '#!/bin/sh\nexit 99\n');
  await fs.promises.chmod(path.join(directory, 'start.sh'), 0o755);
  const record = {
    name: 'local', sourcePath: 'config.json', sourceLabel: 'config.json', command: './start.sh', args: [], cwd: directory,
    env: {}, envKeys: [], tools: [], disabled: false, rawShape: 'mcpServers', issues: []
  };

  assert.equal(doctorRecord(record).some((issue) => issue.code === 'COMMAND_NOT_FOUND'), false);
  assert.equal(doctorRecord({ ...record, command: './missing.sh' }).some((issue) => issue.code === 'COMMAND_NOT_FOUND'), true);
});

test('resolves relative commands using a relative cwd from the process directory', async (t) => {
  const directory = await fs.promises.mkdtemp(path.join(process.cwd(), '.mcpmap-command-'));
  t.after(() => fs.promises.rm(directory, { recursive: true, force: true }));
  await fs.promises.writeFile(path.join(directory, 'start.sh'), '#!/bin/sh\nexit 99\n');
  await fs.promises.chmod(path.join(directory, 'start.sh'), 0o755);
  const record = {
    name: 'local', sourcePath: 'config.json', sourceLabel: 'config.json', command: './start.sh', args: [], cwd: path.relative(process.cwd(), directory),
    env: {}, envKeys: [], tools: [], disabled: false, rawShape: 'mcpServers', issues: []
  };

  const issues = doctorRecord(record);
  assert.equal(issues.some((issue) => issue.code === 'COMMAND_NOT_FOUND'), false);
  assert.equal(issues.some((issue) => issue.code === 'RELATIVE_CWD'), true);
});

test('rejects directories and non-executable command files on POSIX', { skip: process.platform === 'win32' }, async (t) => {
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mcpmap-unrunnable-'));
  t.after(() => fs.promises.rm(directory, { recursive: true, force: true }));
  const nonExecutable = path.join(directory, 'server.sh');
  await fs.promises.writeFile(nonExecutable, '#!/bin/sh\n');
  await fs.promises.chmod(nonExecutable, 0o644);
  const record = {
    name: 'local', sourcePath: 'config.json', sourceLabel: 'config.json', command: nonExecutable, args: [],
    env: {}, envKeys: [], tools: [], disabled: false, rawShape: 'mcpServers', issues: []
  };

  for (const command of [nonExecutable, directory]) {
    assert.equal(doctorRecord({ ...record, command }).some((issue) => issue.code === 'COMMAND_NOT_FOUND'), true);
  }
});
