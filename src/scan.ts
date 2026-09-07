import fs from 'node:fs';
import { buildSources } from './paths.js';
import { parseJsonc } from './jsonc.js';
import { extractServerConfigs, pathExists } from './discover.js';
import { redactArguments, redactObject } from './redact.js';
import { doctorRecords } from './doctor.js';
import { probeServer } from './probe.js';
import type { CliOptions, DoctorIssue, ProbeConfig, RawServerConfig, ScanResult, ServerRecord } from './types.js';

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? redactArguments(value) : [];
}

function asStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return redactObject(value as Record<string, unknown>);
}

function asRawStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function asRawStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, String(item)]));
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
  const probeConfigs = new Map<ServerRecord, ProbeConfig>();
  for (const source of sources) {
    source.exists = await pathExists(source.path);
    if (!source.exists) {
      if (source.explicit) throw new Error(`Explicit config file not found: ${source.path}`);
      continue;
    }
    let text: string;
    try {
      text = await fs.promises.readFile(source.path, 'utf8');
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`Unable to read config file ${source.path}: ${detail}`, { cause: error });
    }
    const parsed = parseJsonc(text, source.path);
    const extracted = extractServerConfigs(parsed, source.path);
    issues.push(...extracted.issues);
    for (const [name, raw] of Object.entries(extracted.servers)) {
      const server = normalizeServer(name, raw, source.path, source.label, extracted.shape);
      servers.push(server);
      if (options.allowRun && !server.disabled) {
        probeConfigs.set(server, {
          command: asString(raw.command),
          args: asRawStringArray(raw.args),
          cwd: asString(raw.cwd),
          env: asRawStringRecord(raw.env)
        });
      }
    }
  }
  const doctorIssues = doctorRecords(servers);
  issues.push(...doctorIssues);
  for (const server of servers) {
    server.issues = issues.filter((issue) => issue.server === server.name && issue.sourcePath === server.sourcePath);
    const probeConfig = probeConfigs.get(server);
    if (probeConfig) server.probe = await probeServer(probeConfig, options.timeoutMs);
  }
  return { generatedAt: new Date().toISOString(), sources, servers, issues };
}
