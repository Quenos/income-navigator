import { afterEach, describe, expect, it, vi } from 'vitest';
import { runScanner } from './scan-client';

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

describe('runScanner', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_BASE_PATH;
  });

  it('posts to the app-relative scan API by default', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ results: [] }));
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
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ results: [] }));
    vi.stubGlobal('fetch', fetchMock);

    await runScanner(['SPY']);

    expect(fetchMock).toHaveBeenCalledWith('/income-navigator/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols: ['SPY'] }),
    });
  });

  it('surfaces JSON API errors without leaking parser failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(jsonResponse({ error: 'Scan request limit exceeded' }, { status: 429 })),
    );

    await expect(runScanner(['SPY'])).rejects.toThrow('Scan request limit exceeded');
  });

  it('surfaces non-JSON upstream failures as scan request failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('<html> <h1>Gateway Timeout</h1></html>', {
          status: 504,
          headers: { 'Content-Type': 'text/html' },
        }),
      ),
    );

    await expect(runScanner(['SPY'])).rejects.toThrow('Scan request failed (504)');
  });
});
