#!/usr/bin/env node
import os from 'node:os';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { scan } from './scan.js';
import { renderDoctor, renderScan } from './render.js';
import type { CliOptions, OutputFormat } from './types.js';

const VERSION = '0.1.0';

function help(): string {
  return `mcpmap - inventory local MCP configs without leaking secrets\n\nUsage:\n  mcpmap scan [--config path] [--format table|json|markdown] [--allow-run] [--timeout-ms 1500]\n  mcpmap doctor [--config path] [--format table|json|markdown] [--allow-run]\n\nOptions:\n  --config, -c       JSON/JSONC config; missing/unreadable paths fail (repeatable)\n  --no-defaults      Only scan explicit --config files\n  --format, -f       Output format: table, json, markdown (default: table)\n  --allow-run        Probe startup by running server commands briefly (off by default)\n  --timeout-ms       Startup probe timeout as an integer >= 100 (default: 1500)\n  --help, -h         Show help\n  --version, -v      Show version\n`;
}

export function parseArgs(argv: string[], env = process.env): CliOptions {
  const command = argv[0] === 'doctor' || argv[0] === 'scan' ? argv.shift() as 'doctor' | 'scan' : argv.includes('--version') || argv.includes('-v') ? 'version' : 'help';
  const options: CliOptions = { command, configs: [], format: 'table', allowRun: false, timeoutMs: 1500, cwd: process.cwd(), home: env.MCPMAP_HOME ?? os.homedir(), includeDefaults: true };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--config' || arg === '-c') options.configs.push(requireValue(argv, ++i, arg));
    else if (arg === '--format' || arg === '-f') options.format = parseFormat(requireValue(argv, ++i, arg));
    else if (arg === '--allow-run') options.allowRun = true;
    else if (arg === '--timeout-ms') options.timeoutMs = parseTimeoutMs(requireValue(argv, ++i, arg));
    else if (arg === '--no-defaults') options.includeDefaults = false;
    else if (arg === '--help' || arg === '-h') options.command = 'help';
    else if (arg === '--version' || arg === '-v') options.command = 'version';
    else throw new Error(`Unknown option: ${arg}`);
  }
  return options;
}

function requireValue(argv: string[], index: number, flag: string): string {
  const value = argv[index];
  if (!value || isRecognizedOption(value)) throw new Error(`${flag} requires a value`);
  return value;
}

function isRecognizedOption(value: string): boolean {
  return ['--config', '-c', '--format', '-f', '--allow-run', '--timeout-ms', '--no-defaults', '--help', '-h', '--version', '-v'].includes(value);
}

function parseFormat(value: string): OutputFormat {
  if (value === 'table' || value === 'json' || value === 'markdown') return value;
  throw new Error(`Unsupported format: ${value}`);
}

function parseTimeoutMs(value: string): number {
  if (!/^\d+$/.test(value)) throw new Error('--timeout-ms must be a finite base-10 integer >= 100');
  const timeoutMs = Number(value);
  if (!Number.isFinite(timeoutMs) || !Number.isInteger(timeoutMs) || timeoutMs < 100) {
    throw new Error('--timeout-ms must be a finite base-10 integer >= 100');
  }
  return timeoutMs;
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  try {
    const options = parseArgs([...argv]);
    if (options.command === 'help') { process.stdout.write(help()); return 0; }
    if (options.command === 'version') { process.stdout.write(`${VERSION}\n`); return 0; }
    const result = await scan(options);
    process.stdout.write(options.command === 'doctor' ? renderDoctor(result, options.format) : renderScan(result, options.format));
    return options.command === 'doctor' && result.issues.some((issue) => issue.severity === 'error') ? 1 : 0;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

function isDirectEntry(): boolean {
  if (!process.argv[1]) return false;
  try {
    return fs.realpathSync(fileURLToPath(import.meta.url)) === fs.realpathSync(process.argv[1]);
  } catch {
    return false;
  }
}

if (isDirectEntry()) {
  main().then((code) => { process.exitCode = code; });
}
