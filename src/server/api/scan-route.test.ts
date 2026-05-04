import { describe, expect, it } from 'vitest';
import { POST } from '@/app/api/scan/route';

describe('scan API route', () => {
  it('returns scanner results for posted tickers', async () => {
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
});
