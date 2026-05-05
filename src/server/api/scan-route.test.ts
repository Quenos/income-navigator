import { afterEach, describe, expect, it } from 'vitest';
import { POST } from '@/app/api/scan/route';

describe('scan API route', () => {
  const originalProvider = process.env.SCANNER_PROVIDER;

  afterEach(() => {
    if (originalProvider === undefined) delete process.env.SCANNER_PROVIDER;
    else process.env.SCANNER_PROVIDER = originalProvider;
  });

  it('returns scanner results for posted tickers', async () => {
    process.env.SCANNER_PROVIDER = 'fake';

    const response = await POST(
      new Request('http://localhost/api/scan', {
        method: 'POST',
        body: JSON.stringify({ symbols: ['spy', 'bad'] }),
      }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      results: Array<{ symbol: string; primaryLabel: string }>;
    };
    expect(body.results).toEqual([
      expect.objectContaining({ symbol: 'SPY', primaryLabel: 'Pass' }),
      expect.objectContaining({ symbol: 'BAD', primaryLabel: 'Insufficient Data' }),
    ]);
  });

  it('returns a generic error when scan setup fails', async () => {
    process.env.SCANNER_PROVIDER = 'unsupported-internal-provider-name';

    const response = await POST(
      new Request('http://localhost/api/scan', {
        method: 'POST',
        body: JSON.stringify({ symbols: ['SPY'] }),
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Scan request failed' });
  });
});
