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

const releaseWorkflowUrl = new URL('.github/workflows/release.yml', root);
if (existsSync(releaseWorkflowUrl)) {
  const releaseWorkflow = await readFile(releaseWorkflowUrl, 'utf8');
  const releaseCheckIndex = releaseWorkflow.indexOf('npm run release:check');
  const tagGuardIndex = releaseWorkflow.indexOf('Verify release tag matches package version');
  const packIndex = releaseWorkflow.indexOf('npm pack');
  const publishIndex = releaseWorkflow.indexOf('npm publish');

  requireValue(/id-token:\s*write/.test(releaseWorkflow), 'release workflow must grant id-token: write for npm trusted publishing');
  requireValue(releaseCheckIndex >= 0, 'release workflow must run release:check');
  requireValue(tagGuardIndex >= 0, 'release workflow must verify the release tag matches package.json version');
  requireValue(
    /expected_tag="v\$\(node --print "require\('\.\/package\.json'\)\.version"\)"/.test(releaseWorkflow),
    'release workflow must derive the expected tag from package.json version',
  );
  requireValue(
    /GITHUB_REF_NAME[\s\S]*Release tag\/version mismatch[\s\S]*exit 1/.test(releaseWorkflow),
    'release workflow tag guard must fail with an actionable mismatch diagnostic',
  );
  requireValue(tagGuardIndex < packIndex, 'release workflow must verify the release tag before packing');
  requireValue(tagGuardIndex < publishIndex, 'release workflow must verify the release tag before publishing');
  requireValue(packIndex > releaseCheckIndex, 'release workflow must pack only after release:check passes');
  requireValue(publishIndex > packIndex, 'release workflow must publish the packed artifact after validation');
  requireValue(/npm publish[^\n]*--provenance/.test(releaseWorkflow), 'release workflow npm publish must enable provenance');
  requireValue(/npm publish[^\n]*--access public/.test(releaseWorkflow), 'release workflow npm publish must use public access');
} else {
  errors.push('release workflow must be present');
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`release readiness: ${error}`);
  }
  process.exit(1);
}

console.log('release readiness passed');
