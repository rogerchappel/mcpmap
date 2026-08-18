# Release Checklist

Use this checklist before tagging or publishing a release candidate.

## Local Gate

```sh
npm ci
npm run release:check
```

`release:check` starts with `release:readiness`, then runs the build-backed
test, static check, CLI smoke, and package smoke.

## Package Evidence

```sh
npm run package:smoke
```

The package smoke verifies:

- the built `mcpmap` binary target exists
- `npm pack --json` produces a publishable tarball
- the tarball includes compiled runtime files
- the tarball includes the fake example config
- the tarball includes README, license, security, changelog, contributing, and code of conduct documents
- a disposable global install runs `mcpmap --version`
- the installed package's declared library entrypoint imports successfully

## Tagged Release

The tag must be exactly `v${package.json.version}` (for example, package version
`0.1.0` requires tag `v0.1.0`). The workflow rejects a mismatched tag before
packing or publishing. It then runs `npm run release:check`, packs the validated
package, publishes that tarball with npm trusted publishing and provenance, and
attaches the same tarball to the GitHub release. Configure the npm package's
trusted publisher for this repository and `.github/workflows/release.yml`
before pushing the first release tag.

## Manual Review

- Keep generated inventories local unless every path and value has been reviewed.
- Do not publish screenshots or issue text containing real MCP config paths,
  tokens, command arguments, or private workspace names.
- Confirm the release notes describe fixture or package-contract changes with
  the command output used as evidence.
