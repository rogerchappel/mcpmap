import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import type { ProbeResult, ServerRecord } from './types.js';

export function probeServer(server: ServerRecord, timeoutMs: number): Promise<ProbeResult> {
  const started = performance.now();
  if (!server.command) return Promise.resolve({ status: 'skipped', message: 'No command to probe.', elapsedMs: 0 });
  return new Promise((resolve) => {
    const child = spawn(server.command!, server.args, {
      cwd: server.cwd,
      env: { ...process.env, ...server.env },
      stdio: 'ignore',
      shell: process.platform === 'win32'
    });
    let done = false;
    const finish = (result: Omit<ProbeResult, 'elapsedMs'>) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (!child.killed) child.kill('SIGTERM');
      resolve({ ...result, elapsedMs: Math.round(performance.now() - started) });
    };
    const timer = setTimeout(() => finish({ status: 'started', message: `Process survived ${timeoutMs}ms startup window.` }), timeoutMs);
    child.once('error', (error) => finish({ status: 'error', message: error.message }));
    child.once('exit', (code, signal) => finish({ status: code === 0 ? 'started' : 'error', message: `Process exited during probe (code=${code ?? 'null'}, signal=${signal ?? 'null'}).` }));
  });
}
