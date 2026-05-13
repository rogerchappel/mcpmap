export type OutputFormat = 'table' | 'json' | 'markdown';

export interface CliOptions {
  command: 'scan' | 'doctor' | 'help' | 'version';
  configs: string[];
  format: OutputFormat;
  allowRun: boolean;
  timeoutMs: number;
  cwd: string;
  home: string;
  includeDefaults: boolean;
}

export interface ConfigSource {
  path: string;
  label: string;
  exists: boolean;
  explicit: boolean;
}

export interface RawServerConfig {
  command?: unknown;
  args?: unknown;
  env?: unknown;
  cwd?: unknown;
  disabled?: unknown;
  tools?: unknown;
  [key: string]: unknown;
}

export interface ServerRecord {
  name: string;
  sourcePath: string;
  sourceLabel: string;
  command?: string;
  args: string[];
  cwd?: string;
  env: Record<string, string>;
  envKeys: string[];
  tools: string[];
  disabled: boolean;
  rawShape: string;
  issues: DoctorIssue[];
  probe?: ProbeResult;
}

export type IssueSeverity = 'info' | 'warn' | 'error';

export interface DoctorIssue {
  code: string;
  severity: IssueSeverity;
  message: string;
  server?: string;
  sourcePath?: string;
}

export interface ScanResult {
  generatedAt: string;
  sources: ConfigSource[];
  servers: ServerRecord[];
  issues: DoctorIssue[];
}

export interface ProbeResult {
  status: 'skipped' | 'started' | 'timeout' | 'error';
  message: string;
  elapsedMs: number;
}
