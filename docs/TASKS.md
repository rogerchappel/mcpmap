# mcpmap Tasks

## MVP checklist

- [x] Scaffold Node/TypeScript CLI project.
- [x] Preserve PRD in `docs/PRD.md`.
- [x] Discover common MCP config paths and explicit files.
- [x] Parse JSON and JSONC safely enough for local config files.
- [x] Normalize Claude Desktop, VS Code, and generic server maps.
- [x] Redact sensitive environment values and token-looking strings.
- [x] Render table, JSON, and Markdown scan output.
- [x] Implement `doctor` checks for missing commands, command lookup, duplicate names, relative cwd, risky env, and unknown shapes.
- [x] Keep startup probes opt-in behind `--allow-run` with a short timeout.
- [x] Add fixture-backed tests and CLI smokes.
- [x] Add README, safety notes, contribution guidance, package metadata, and CI.
- [ ] Publish first npm release after real-world dogfooding.

## Future ideas

- Add SARIF output for security review workflows.
- Support additional MCP clients as their config shapes stabilize.
- Add schema docs for normalized JSON output.
- Provide shell completions.
