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
- `npm pack --dry-run --json` completes successfully
- the tarball includes compiled runtime files
- the tarball includes the fake example config
- the tarball includes README, license, security, changelog, contributing, and code of conduct documents

## Manual Review

- Keep generated inventories local unless every path and value has been reviewed.
- Do not publish screenshots or issue text containing real MCP config paths,
  tokens, command arguments, or private workspace names.
- Confirm the release notes describe fixture or package-contract changes with
  the command output used as evidence.
