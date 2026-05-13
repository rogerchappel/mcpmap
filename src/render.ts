import path from 'node:path';
import type { DoctorIssue, ScanResult, ServerRecord } from './types.js';

function truncate(value: string, width: number): string {
  return value.length > width ? `${value.slice(0, width - 1)}…` : value;
}

function table(rows: string[][]): string {
  const widths = rows[0]?.map((_, index) => Math.min(42, Math.max(...rows.map((row) => row[index]?.length ?? 0)))) ?? [];
  return rows.map((row, rowIndex) => {
    const line = row.map((cell, index) => truncate(cell, widths[index] ?? 10).padEnd(widths[index] ?? 10)).join('  ');
    return rowIndex === 0 ? `${line}\n${widths.map((w) => '-'.repeat(w)).join('  ')}` : line;
  }).join('\n');
}

export function renderScan(result: ScanResult, format: 'table' | 'json' | 'markdown'): string {
  if (format === 'json') return `${JSON.stringify(result, null, 2)}\n`;
  if (format === 'markdown') return renderMarkdown(result);
  const rows = [['name', 'command', 'args', 'env', 'tools', 'source']];
  for (const server of result.servers) {
    rows.push([server.name, server.command ?? '', server.args.join(' '), server.envKeys.join(', '), server.tools.join(', '), path.basename(server.sourcePath)]);
  }
  return `${table(rows)}\n\n${summary(result)}\n`;
}

export function renderDoctor(result: ScanResult, format: 'table' | 'json' | 'markdown'): string {
  if (format === 'json') return `${JSON.stringify({ generatedAt: result.generatedAt, issues: result.issues }, null, 2)}\n`;
  if (format === 'markdown') return renderIssuesMarkdown(result.issues);
  const rows = [['severity', 'code', 'server', 'message']];
  for (const issue of result.issues) rows.push([issue.severity, issue.code, issue.server ?? '-', issue.message]);
  return `${table(rows)}\n\n${result.issues.length} issue(s) found.\n`;
}

function renderMarkdown(result: ScanResult): string {
  const lines = ['# MCP Map', '', `Generated: ${result.generatedAt}`, '', '## Servers', '', '| Name | Command | Args | Env keys | Tools | Source |', '| --- | --- | --- | --- | --- | --- |'];
  for (const server of result.servers) {
    lines.push(`| ${escapeMd(server.name)} | ${escapeMd(server.command ?? '')} | ${escapeMd(server.args.join(' '))} | ${escapeMd(server.envKeys.join(', '))} | ${escapeMd(server.tools.join(', '))} | ${escapeMd(server.sourcePath)} |`);
  }
  lines.push('', '## Doctor issues', '', ...renderIssueLines(result.issues), '');
  return `${lines.join('\n')}\n`;
}

function renderIssuesMarkdown(issues: DoctorIssue[]): string {
  return `# MCP Doctor\n\n${renderIssueLines(issues).join('\n')}\n`;
}

function renderIssueLines(issues: DoctorIssue[]): string[] {
  if (issues.length === 0) return ['No issues found.'];
  return issues.map((issue) => `- **${issue.severity.toUpperCase()} ${issue.code}**${issue.server ? ` (${escapeMd(issue.server)})` : ''}: ${escapeMd(issue.message)}`);
}

function escapeMd(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function summary(result: ScanResult): string {
  const existing = result.sources.filter((source) => source.exists).length;
  return `Scanned ${existing}/${result.sources.length} source(s), found ${result.servers.length} server(s), ${result.issues.length} doctor issue(s).`;
}
