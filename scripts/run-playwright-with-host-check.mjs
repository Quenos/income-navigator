import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export function shouldSkipForMissingHostDeps({ status, output, ci = process.env.CI }) {
  if (ci || status !== 1) return false;
  return (
    output.includes('error while loading shared libraries') ||
    output.includes('Host system is missing dependencies') ||
    output.includes('libatk-1.0.so.0')
  );
}

export function runPlaywright(args = process.argv.slice(2)) {
  const result = spawnSync('npx', ['playwright', 'test', ...args], {
    encoding: 'utf8',
    shell: false,
  });
  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');

  if (result.status === 0) return 0;
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  if (shouldSkipForMissingHostDeps({ status: result.status, output })) {
    console.warn(
      '\n[playwright-skip] Browser system dependencies are unavailable on this host. CI runs the real Playwright suite with --with-deps.',
    );
    return 0;
  }
  return result.status ?? 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(runPlaywright());
}
