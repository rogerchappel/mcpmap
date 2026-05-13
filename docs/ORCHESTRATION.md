# mcpmap Orchestration

This project was built as a single OSS Factory run.

## Build lanes

1. **Scaffold** — use StackForge `oss-cli` template, then replace placeholder package metadata.
2. **Core** — add JSONC parsing, config discovery, normalization, redaction, and doctor rules.
3. **CLI** — provide `scan` and `doctor` commands with table, JSON, and Markdown renderers.
4. **Safety** — default to static-only scanning; gate process startup behind `--allow-run`.
5. **Evidence** — add fixtures, unit tests, smoke tests, validation script, and docs.
6. **Release prep** — create public GitHub repo, push to `main`, set description/topics, and protect `main` best effort.

## Verification gates

- `npm test`
- `npm run check`
- `npm run build`
- `npm run smoke`
- `bash scripts/validate.sh`
- real fixture smoke: `node dist/cli.js scan --no-defaults --config tests/fixtures/claude-desktop.json --format json`
