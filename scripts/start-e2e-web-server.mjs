#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { resolvePlaywrightEnv } from './run-playwright-with-host-check.mjs';

const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev'], {
  env: resolvePlaywrightEnv(),
  shell: false,
  stdio: ['ignore', 'pipe', 'pipe'],
});

child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stderr);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    child.kill(signal);
  });
}

child.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exitCode = code ?? 1;
});
