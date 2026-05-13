#!/usr/bin/env bash
set -euo pipefail
node dist/src/cli.js scan --no-defaults --config tests/fixtures/claude-desktop.json --format json | grep 'filesystem'
node dist/src/cli.js scan --no-defaults --config tests/fixtures/custom.jsonc --format markdown | grep '# MCP Map'
node dist/src/cli.js doctor --no-defaults --config tests/fixtures/problematic.jsonc --format table || test "$?" = "1"
