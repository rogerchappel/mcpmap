#!/usr/bin/env bash
set -euo pipefail
node dist/cli.js scan --no-defaults --config tests/fixtures/claude-desktop.json --format json | grep 'filesystem'
node dist/cli.js scan --no-defaults --config tests/fixtures/custom.jsonc --format markdown | grep '# MCP Map'
node dist/cli.js doctor --no-defaults --config tests/fixtures/problematic.jsonc --format table || test "$?" = "1"
