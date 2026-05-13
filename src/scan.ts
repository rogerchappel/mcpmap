import fs from 'node:fs';
import { buildSources } from './paths.js';
import { parseJsonc } from './jsonc.js';
import { extractServerConfigs, pathExists } from './discover.js';
import { redactObject } from './redact.js';
import { doctorRecords } from './doctor.js';
import { probeServer } from './probe.js';
import type { CliOptions, DoctorIssue, RawServerConfig, ScanResult, ServerRecord } from './types.js';

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function asStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return redactObject(value as Record<string, unknown>);
}

function extractTools(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => typeof item === 'string' ? item : typeof item === 'object' && item && 'name' in item ? String((item as { name: unknown }).name) : undefined).filter((item): item is string => Boolean(item));
  }
  if (value && typeof value === 'object') return Object.keys(value as Record<string, unknown>);
  return [];
}

function normalizeServer(name: string, raw: RawServerConfig, sourcePath: string, sourceLabel: string, rawShape: string): ServerRecord {
  const env = asStringRecord(raw.env);
  return {
    name,
    sourcePath,
    sourceLabel,
    command: asString(raw.command),
    args: asStringArray(raw.args),
    cwd: asString(raw.cwd),
    env,
    envKeys: Object.keys(env),
    tools: extractTools(raw.tools),
    disabled: raw.disabled === true,
    rawShape,
    issues: []
  };
}

export async function scan(options: CliOptions): Promise<ScanResult> {
  const sources = buildSources(options.configs, options);
  const servers: ServerRecord[] = [];
  const issues: DoctorIssue[] = [];
  for (const source of sources) {
    source.exists = await pathExists(source.path);
    if (!source.exists) continue;
    const text = await fs.promises.readFile(source.path, 'utf8');
    const parsed = parseJsonc(text, source.path);
    const extracted = extractServerConfigs(parsed, source.path);
    issues.push(...extracted.issues);
    for (const [name, raw] of Object.entries(extracted.servers)) {
      servers.push(normalizeServer(name, raw, source.path, source.label, extracted.shape));
    }
  }
  const doctorIssues = doctorRecords(servers);
  issues.push(...doctorIssues);
  for (const server of servers) {
    server.issues = issues.filter((issue) => issue.server === server.name && issue.sourcePath === server.sourcePath);
    if (options.allowRun) server.probe = await probeServer(server, options.timeoutMs);
  }
  return { generatedAt: new Date().toISOString(), sources, servers, issues };
}
