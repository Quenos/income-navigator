import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  readDotenvFiles,
  resolvePlaywrightEnv,
  shouldSkipForMissingHostDeps,
} from './run-playwright-with-host-check.mjs';

describe('Playwright host dependency wrapper', () => {
  it('skips only known non-CI host dependency failures', () => {
    expect(
      shouldSkipForMissingHostDeps({
        status: 1,
        output: 'error while loading shared libraries: libatk-1.0.so.0',
      }),
    ).toBe(true);
    expect(
      shouldSkipForMissingHostDeps({
        status: 1,
        output: 'Expected visible element but got hidden',
      }),
    ).toBe(false);
    expect(shouldSkipForMissingHostDeps({ status: 1, output: 'libatk-1.0.so.0', ci: 'true' })).toBe(
      false,
    );
  });

  it('uses the TastyTrade provider for E2E when credentials are available', () => {
    const env = resolvePlaywrightEnv({
      baseEnv: {
        SCANNER_PROVIDER: 'fake',
        TASTYTRADE_PROVIDER_SECRET: 'provider-secret',
        TASTYTRADE_REFRESH_TOKEN: 'refresh-token',
        TASTYTRADE_IS_TEST: 'true',
      },
      dotenvEnv: {},
    });

    expect(env.SCANNER_PROVIDER).toBe('tastytrade');
  });

  it('keeps the fake provider for E2E when credentials are unavailable', () => {
    const env = resolvePlaywrightEnv({ baseEnv: {}, dotenvEnv: {} });

    expect(env.SCANNER_PROVIDER).toBe('fake');
  });

  it('detects TastyTrade credentials loaded from dotenv files', () => {
    const env = resolvePlaywrightEnv({
      baseEnv: {},
      dotenvEnv: {
        TASTYTRADE_PROVIDER_SECRET: 'provider-secret',
        TASTYTRADE_REFRESH_TOKEN: 'refresh-token',
      },
    });

    expect(env.SCANNER_PROVIDER).toBe('tastytrade');
  });

  it('keeps the first dotenv value when multiple files provide the same key', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'income-navigator-env-'));
    try {
      writeFileSync(join(cwd, '.env.local'), 'TASTYTRADE_PROVIDER_SECRET=local-secret\n');
      writeFileSync(join(cwd, '.env'), 'TASTYTRADE_PROVIDER_SECRET=base-secret\n');

      expect(readDotenvFiles({ cwd }).TASTYTRADE_PROVIDER_SECRET).toBe('local-secret');
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
