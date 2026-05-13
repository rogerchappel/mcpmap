import fs from 'node:fs';
import path from 'node:path';
import type { DoctorIssue, ServerRecord } from './types.js';
import { looksSensitiveKey, looksSensitiveValue } from './redact.js';

export function doctorRecords(records: ServerRecord[]): DoctorIssue[] {
  const issues: DoctorIssue[] = [];
  const names = new Map<string, ServerRecord[]>();
  for (const record of records) {
    names.set(record.name, [...(names.get(record.name) ?? []), record]);
    issues.push(...doctorRecord(record));
  }
  for (const [name, matches] of names) {
    if (matches.length > 1) {
      for (const match of matches) issues.push({ code: 'DUPLICATE_SERVER_NAME', severity: 'warn', message: `Server name '${name}' appears in multiple configs.`, server: name, sourcePath: match.sourcePath });
    }
  }
  return issues;
}

export function doctorRecord(record: ServerRecord): DoctorIssue[] {
  const issues: DoctorIssue[] = [];
  if (!record.command) {
    issues.push({ code: 'MISSING_COMMAND', severity: 'error', message: 'Server has no command.', server: record.name, sourcePath: record.sourcePath });
  } else if (!commandExists(record.command)) {
    issues.push({ code: 'COMMAND_NOT_FOUND', severity: 'warn', message: `Command '${record.command}' was not found on PATH or as a file.`, server: record.name, sourcePath: record.sourcePath });
  }
  if (record.cwd && !path.isAbsolute(record.cwd)) {
    issues.push({ code: 'RELATIVE_CWD', severity: 'warn', message: `cwd '${record.cwd}' is relative; startup depends on the client working directory.`, server: record.name, sourcePath: record.sourcePath });
  }
  for (const [key, value] of Object.entries(record.env)) {
    if (looksSensitiveKey(key)) {
      issues.push({ code: 'RISKY_ENV_KEY', severity: 'warn', message: `Environment key '${key}' looks sensitive and was redacted.`, server: record.name, sourcePath: record.sourcePath });
    } else if (looksSensitiveValue(value)) {
      issues.push({ code: 'RISKY_ENV_VALUE', severity: 'warn', message: `Environment value for '${key}' looks token-like and was redacted.`, server: record.name, sourcePath: record.sourcePath });
    }
  }
  return issues;
}

function commandExists(command: string): boolean {
  if (command.includes('/') || command.includes('\\')) return fs.existsSync(command);
  const paths = (process.env.PATH ?? '').split(path.delimiter);
  const extensions = process.platform === 'win32' ? ['.exe', '.cmd', '.bat', ''] : [''];
  return paths.some((dir) => extensions.some((ext) => fs.existsSync(path.join(dir, `${command}${ext}`))));
}
