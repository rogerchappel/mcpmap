#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

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

const packOutput = execFileSync('npm', ['pack', '--dry-run', '--json'], {
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

console.log(`package smoke passed: ${requiredFiles.length} required files present`);
