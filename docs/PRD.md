# mcpmap PRD

Status: in-progress

## One-liner
`mcpmap` inventories local Model Context Protocol configs and produces a redacted map of servers, commands, environment needs, and exposed tool names. 🧭

## Problem
MCP configs are spreading across editors and agent apps. Developers need to know what local tools an agent can reach, where secrets might be referenced, and which servers are stale — without sending config to a service.

## Users
- Agentic developers running multiple MCP clients.
- Security-minded maintainers auditing local tool access.
- Teams documenting reproducible agent workstations.

## MVP
- Node/TypeScript CLI.
- Scan common MCP config locations plus explicit files.
- Parse JSON/JSONC configs safely.
- Redact env values and token-looking strings.
- `mcpmap scan` emits table, JSON, and Markdown.
- `mcpmap doctor` flags missing commands, relative path issues, duplicate server names, risky env exposure, and unknown config shapes.
- Optional `--allow-run` mode probes server startup with short timeout; default is static-only.
- Tests with fixture configs for Claude Desktop-style, VS Code-style, and custom paths.

## Non-goals
- Implementing an MCP client or calling remote tools by default.
- Publishing config inventory anywhere.

## Differentiation
Focuses on local safety and documentation rather than MCP protocol traffic inspection.

## Sources / attribution
Inspired by the Model Context Protocol docs describing MCP as a standard connection layer for AI apps, plus local OpenClaw plugin/security needs.
