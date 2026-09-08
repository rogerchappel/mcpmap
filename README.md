# mcpmap 🧭

`mcpmap` inventories local Model Context Protocol (MCP) config files and prints a redacted map of servers, commands, environment needs, and known tool names. It is a nosy little cartographer for your agent workstation — useful, cautious, and allergic to leaking secrets.

## Why

MCP configs now live in several editor and agent app corners. Before you hand an agent more tools, it helps to know:

- which MCP servers are configured locally;
- which commands and working directories they use;
- which environment keys may contain credentials;
- where duplicate or stale entries are hiding.

`mcpmap` stays local. It does not upload inventories or run MCP servers unless you explicitly opt in with `--allow-run`.

`--timeout-ms` accepts a finite base-10 integer number of milliseconds greater than or equal to `100` (default: `1500`). Decimal, exponent, non-finite, signed, and trailing-character forms are rejected.

## Install

The first npm release has not been published yet. Until it is available, install
and run `mcpmap` from a checkout:

```bash
npm install
npm run build
node dist/cli.js scan
```

After the first registry release, `npm install -g mcpmap` will be the supported
global installation command.

## Usage

```bash
mcpmap scan
mcpmap scan --config ./claude_desktop_config.json --format markdown
mcpmap scan --config ./mcp.json --no-defaults --format json
mcpmap doctor --config ./problematic.jsonc
mcpmap doctor --allow-run --timeout-ms 1000
```

### Outputs

- `table` (default): compact terminal overview.
- `json`: machine-readable inventory with redacted env values.
- `markdown`: pasteable documentation for team workstations.

### Config discovery

By default, `mcpmap` checks common local MCP locations for Claude Desktop, VS Code, Cursor, Windsurf, and `.mcp.json`; default locations that do not exist are silently skipped. Add `--config` / `-c` for explicit JSON or JSONC files. An explicit path must exist and be readable, otherwise the command exits non-zero with that path in the diagnostic. Use `--no-defaults` when you only want those explicit files.

### Safety model

Default mode is static-only: read config files, parse them, redact secrets, and report doctor findings. `--allow-run` briefly starts each enabled configured command to see if it survives a short startup window; entries marked `disabled` are never started and have no probe result. The opt-in probe receives the command's original arguments and environment so it can start normally, while inventory records, rendered output, and probe diagnostics remain redacted. That can execute arbitrary local commands from your config, so leave it off unless you trust the files being scanned.

Redaction covers sensitive env key names (`TOKEN`, `PASSWORD`, `SECRET`, `API_KEY`, etc.), common token-looking values, long opaque strings, and selected inline patterns. Treat output as safer, not magically declassified.

## Doctor checks

`mcpmap doctor` currently flags:

- missing commands;
- bare commands without a runnable file on `PATH`, or slash-containing commands without a runnable regular file relative to the configured `cwd` (using the process directory when `cwd` is omitted or relative; POSIX execute bits and Windows `PATHEXT` are respected);
- relative `cwd` values;
- duplicate server names across scanned configs;
- disabled server entries;
- risky env keys or token-looking env values;
- unknown config shapes.

Disabled server records remain visible as informational findings, but doctor
does not apply command or `cwd` startup-readiness checks to them. Passive
redaction and sensitive-environment findings still apply.

## Examples

```bash
# Make a quick local map
mcpmap scan --format table

# Document one workstation config
mcpmap scan -c "$HOME/Library/Application Support/Claude/claude_desktop_config.json" --format markdown > MCP-MAP.md

# CI-style audit of checked-in sample config
mcpmap doctor --no-defaults -c ./examples/mcp.json --format json
```

The repository includes `examples/mcp.json` with fake values only, so you can inspect redaction and duplicate/risk output without exposing a workstation config.

## Development

```bash
npm install
npm test
npm run check
npm run build
npm run smoke
bash scripts/validate.sh
```

## Package contents

The npm package allowlist includes the runtime files plus the public support
documents needed for release review: `README.md`, `LICENSE`, `SECURITY.md`,
`CHANGELOG.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and
`docs/RELEASE_CHECKLIST.md`.
Run `npm run package:smoke` or `npm pack --dry-run` before publishing to
confirm those files are still present in the tarball.

`npm run package:smoke` builds and packs the package, verifies the compiled CLI
bin and required package files, installs the tarball into a disposable global
prefix, runs `mcpmap --version`, and imports the declared library entrypoint.

## Contributing

Bug reports and small, practical improvements are welcome. Please include fixture configs with secrets replaced by obviously fake values. Do not paste real tokens into issues, tests, or screenshots.

See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and [docs/PRD.md](docs/PRD.md).
Use [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md) before tagging or
publishing a release candidate.

## License

MIT © Roger Chappel

## Verification

Run the release-readiness checks that match this package before publishing or opening a release PR.

- `npm run release:check` - run the full release gate
- `npm run release:readiness` - verify metadata, package allowlist coverage,
  support docs, CI presence, and package-smoke wiring
