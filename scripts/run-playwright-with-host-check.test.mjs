import { describe, expect, it } from 'vitest';
import { shouldSkipForMissingHostDeps } from './run-playwright-with-host-check.mjs';

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
});
