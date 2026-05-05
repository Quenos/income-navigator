import { afterEach, describe, expect, it, vi } from 'vitest';
import { runScanner } from './scan-client';

describe('runScanner', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_BASE_PATH;
  });

  it('posts to the app-relative scan API by default', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await runScanner(['SPY']);

    expect(fetchMock).toHaveBeenCalledWith('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols: ['SPY'] }),
    });
  });

  it('posts through the configured Next.js base path when mounted below a subpath', async () => {
    process.env.NEXT_PUBLIC_BASE_PATH = '/income-navigator';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await runScanner(['SPY']);

    expect(fetchMock).toHaveBeenCalledWith('/income-navigator/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols: ['SPY'] }),
    });
  });
});
