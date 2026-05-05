import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const DOTENV_FILES = ['.env.local', '.env.test.local', '.env'];

export function shouldSkipForMissingHostDeps({ status, output, ci = process.env.CI }) {
  if (ci || status !== 1) return false;
  return (
    output.includes('error while loading shared libraries') ||
    output.includes('Host system is missing dependencies') ||
    output.includes('libatk-1.0.so.0')
  );
}

function unquoteDotenvValue(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function readDotenvFiles({ cwd = process.cwd(), files = DOTENV_FILES } = {}) {
  const parsed = {};
  for (const file of files) {
    const path = `${cwd}/${file}`;
    if (!existsSync(path)) continue;
    const content = readFileSync(path, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (key in parsed) continue;
      parsed[key] = unquoteDotenvValue(rawValue.replace(/\s+#.*$/, ''));
    }
  }
  return parsed;
}

function hasTastyTradeCredentials(env) {
  return Boolean(env.TASTYTRADE_PROVIDER_SECRET && env.TASTYTRADE_REFRESH_TOKEN);
}

export function resolvePlaywrightEnv({
  baseEnv = process.env,
  dotenvEnv = readDotenvFiles(),
} = {}) {
  const env = { ...dotenvEnv, ...baseEnv };
  env.SCANNER_PROVIDER = hasTastyTradeCredentials(env)
    ? 'tastytrade'
    : (env.SCANNER_PROVIDER ?? 'fake');
  return env;
}

export function runPlaywright(args = process.argv.slice(2)) {
  const env = resolvePlaywrightEnv();
  if (env.SCANNER_PROVIDER === 'tastytrade') {
    console.warn(
      '[playwright] TastyTrade credentials detected; running E2E with live read-only provider.',
    );
  } else {
    console.warn(
      '[playwright] TastyTrade credentials not detected; running E2E with fake provider.',
    );
  }

  const result = spawnSync('npx', ['playwright', 'test', ...args], {
    encoding: 'utf8',
    shell: false,
    env,
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
