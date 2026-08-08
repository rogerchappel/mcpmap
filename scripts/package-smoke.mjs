#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const binTarget = packageJson.bin?.mcpmap;

if (!binTarget) {
  throw new Error('package.json must expose the mcpmap binary');
}

if (!existsSync(new URL(`../${binTarget}`, import.meta.url))) {
  throw new Error(`built binary is missing: ${binTarget}`);
}

const requiredFiles = [
  'dist/cli.js',
  'dist/index.js',
  'examples/mcp.json',
  'docs/RELEASE_CHECKLIST.md',
  'README.md',
  'LICENSE',
  'SECURITY.md',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md'
];

const packOutput = execFileSync('npm', ['pack', '--json'], {
  cwd: new URL('..', import.meta.url),
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'inherit']
});

const [pack] = JSON.parse(packOutput);
const files = new Set(pack.files.map((file) => file.path));
const missing = requiredFiles.filter((file) => !files.has(file));

if (missing.length > 0) {
  throw new Error(`npm package is missing required files: ${missing.join(', ')}`);
}

const installRoot = mkdtempSync(join(tmpdir(), 'mcpmap-package-smoke-'));

try {
  const tarball = new URL(`../${pack.filename}`, import.meta.url);
  execFileSync('npm', ['install', '--global', '--prefix', installRoot, tarball.pathname], {
    stdio: 'inherit'
  });
  execFileSync(join(installRoot, 'bin', 'mcpmap'), ['--version'], {
    stdio: 'inherit'
  });

  const entrypoint = join(installRoot, 'lib', 'node_modules', packageJson.name, packageJson.main);
  execFileSync(process.execPath, ['--input-type=module', '--eval', `await import(${JSON.stringify(entrypoint)})`], {
    stdio: 'inherit'
  });
} finally {
  rmSync(new URL(`../${pack.filename}`, import.meta.url));
  rmSync(installRoot, { recursive: true, force: true });
}

for (const value of ['100abc', '1e3', '100.5', 'Infinity']) {
  try {
    execFileSync(process.execPath, ['dist/cli.js', 'scan', '--no-defaults', '--timeout-ms', value, '--format', 'json'], {
      cwd: new URL('..', import.meta.url),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    throw new Error(`packaged CLI accepted malformed --timeout-ms value: ${value}`);
  } catch (error) {
    if (error.status === undefined) throw error;
    const stderr = error.stderr?.toString() ?? '';
    if (!stderr.includes('--timeout-ms must be a finite base-10 integer >= 100')) {
      throw new Error(`packaged CLI returned an unhelpful diagnostic for --timeout-ms ${value}: ${stderr}`);
    }
  }
}

execFileSync(process.execPath, ['dist/cli.js', 'scan', '--no-defaults', '--timeout-ms', '100', '--format', 'json'], {
  cwd: new URL('..', import.meta.url),
  stdio: ['ignore', 'ignore', 'inherit']
});

console.log(`package smoke passed: ${requiredFiles.length} required files present, disposable install works, and CLI timeout validation works`);
