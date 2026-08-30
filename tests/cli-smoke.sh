#!/usr/bin/env bash
set -euo pipefail
node dist/cli.js scan --no-defaults --config tests/fixtures/claude-desktop.json --format json | grep 'filesystem'
probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT
ln -s "$(pwd)/dist/cli.js" "$probe_dir/mcpmap"
test "$(node "$probe_dir/mcpmap" --version)" = "0.1.0"
node dist/cli.js scan --no-defaults --config tests/fixtures/custom.jsonc --format markdown | grep '# MCP Map'
node dist/cli.js doctor --no-defaults --config tests/fixtures/problematic.jsonc --format table || test "$?" = "1"
missing_config="${TMPDIR:-/tmp}/mcpmap-missing-$$.json"
if node dist/cli.js scan --no-defaults --config "$missing_config" 2>missing-config.err; then
  echo "expected missing explicit config to fail" >&2
  exit 1
fi
grep "Explicit config file not found: $missing_config" missing-config.err
rm -f missing-config.err
