import fs from 'node:fs';
import type { DoctorIssue, RawServerConfig } from './types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function collectFromMap(value: unknown): Record<string, RawServerConfig> | undefined {
  if (!isRecord(value)) return undefined;
  const entries = Object.entries(value).filter(([, candidate]) => isRecord(candidate));
  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries) as Record<string, RawServerConfig>;
}

export function extractServerConfigs(data: unknown, sourcePath: string): { servers: Record<string, RawServerConfig>; issues: DoctorIssue[]; shape: string } {
  const issues: DoctorIssue[] = [];
  if (!isRecord(data)) {
    return { servers: {}, issues: [{ code: 'UNKNOWN_CONFIG_SHAPE', severity: 'warn', message: 'Config root is not an object.', sourcePath }], shape: 'non-object' };
  }

  const direct = collectFromMap(data.mcpServers);
  if (direct) return { servers: direct, issues, shape: 'mcpServers' };

  const vscodeMcp = isRecord(data.mcp) ? collectFromMap(data.mcp.servers) : undefined;
  if (vscodeMcp) return { servers: vscodeMcp, issues, shape: 'mcp.servers' };

  const servers = collectFromMap(data.servers);
  if (servers) return { servers, issues, shape: 'servers' };

  issues.push({ code: 'UNKNOWN_CONFIG_SHAPE', severity: 'warn', message: 'No mcpServers, mcp.servers, or servers object found.', sourcePath });
  return { servers: {}, issues, shape: 'unknown' };
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await fs.promises.access(path, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}
