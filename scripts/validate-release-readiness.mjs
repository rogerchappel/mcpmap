#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';

const root = new URL('..', import.meta.url);
const packageJson = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const errors = [];

function requireValue(condition, message) {
  if (!condition) {
    errors.push(message);
  }
}

requireValue(packageJson.repository?.url?.includes('github.com/rogerchappel/mcpmap'), 'repository.url must point to rogerchappel/mcpmap');
requireValue(packageJson.license === 'MIT', 'license must be MIT');
requireValue(packageJson.bin?.mcpmap === './dist/cli.js', 'bin.mcpmap must point at ./dist/cli.js');
requireValue(packageJson.files?.includes('dist'), 'files must include dist');
requireValue(packageJson.files?.includes('examples'), 'files must include examples');
requireValue(packageJson.scripts?.['package:smoke']?.includes('scripts/package-smoke.mjs'), 'package:smoke must run the package smoke script');

for (const file of ['README.md', 'LICENSE', 'SECURITY.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'CODE_OF_CONDUCT.md']) {
  requireValue(existsSync(new URL(file, root)), `${file} must exist`);
}

let workflowFiles = [];
try {
  workflowFiles = await readdir(new URL('.github/workflows/', root));
} catch {
  workflowFiles = [];
}

requireValue(workflowFiles.some((file) => /^ci\.ya?ml$/.test(file)), 'CI workflow must be present');

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`release readiness: ${error}`);
  }
  process.exit(1);
}

console.log('release readiness passed');
