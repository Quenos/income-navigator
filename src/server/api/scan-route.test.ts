import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_SCAN_SYMBOLS } from '@/server/scanner/limits';

const createMarketDataProvider = vi.fn(() => ({ provider: 'mock' }));
let releaseScan: (() => void) | undefined;
const scanMany = vi.fn(async (symbols: string[]) =>
  symbols.map((symbol) => ({
    symbol,
    primaryLabel: symbol === 'BAD' ? 'Insufficient Data' : 'Pass',
  })),
);

vi.mock('@/server/market-data/provider-factory', () => ({ createMarketDataProvider }));
vi.mock('@/server/scanner/scan-service', () => ({ scanMany }));

const { POST, resetScanRequestGateForTests, scanRequestWindowCountForTests } =
  await import('@/app/api/scan/route');

describe('scan API route', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    vi.useRealTimers();
    process.env = { ...originalEnv };
    releaseScan?.();
    releaseScan = undefined;
    resetScanRequestGateForTests();
    createMarketDataProvider.mockClear();
    scanMany.mockReset();
    scanMany.mockImplementation(async (symbols: string[]) =>
      symbols.map((symbol) => ({
        symbol,
        primaryLabel: symbol === 'BAD' ? 'Insufficient Data' : 'Pass',
      })),
    );
  });

  it('returns scanner results for posted tickers', async () => {
    process.env.SCANNER_PROVIDER = 'fake';
    process.env.SCAN_TRUSTED_CLIENT_IP_HEADER = 'x-test-client-ip';

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

  it('rejects oversized content-length before parsing JSON or creating a provider', async () => {
    const response = await POST(
      new Request('http://localhost/api/scan', {
        method: 'POST',
        headers: { 'content-length': '32769' },
        body: '{not-json',
      }),
    );

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({ error: 'Scan request is too large' });
    expect(createMarketDataProvider).not.toHaveBeenCalled();
    expect(scanMany).not.toHaveBeenCalled();
  });

  it('rejects oversized bodies without content-length before JSON parsing or provider setup', async () => {
    process.env.SCAN_MAX_BODY_BYTES = '32';
    const request = new Request('http://localhost/api/scan', {
      method: 'POST',
      body: JSON.stringify({ symbols: ['SPY'], padding: 'x'.repeat(64) }),
    });
    expect(request.headers.get('content-length')).toBeNull();

    const response = await POST(request);

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({ error: 'Scan request is too large' });
    expect(createMarketDataProvider).not.toHaveBeenCalled();
    expect(scanMany).not.toHaveBeenCalled();
  });

  it('applies the rate gate before parsing invalid JSON and releases the active slot', async () => {
    process.env.SCAN_MAX_REQUESTS_PER_WINDOW = '1';
    process.env.SCAN_RATE_LIMIT_WINDOW_MS = '60000';
    process.env.SCAN_MAX_ACTIVE_REQUESTS = '1';
    process.env.SCAN_TRUSTED_CLIENT_IP_HEADER = 'x-test-client-ip';

    const invalid = await POST(
      new Request('http://localhost/api/scan', {
        method: 'POST',
        headers: { 'x-test-client-ip': '203.0.113.30' },
        body: '{not-json',
      }),
    );
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toEqual({ error: 'Invalid scan request' });
    expect(createMarketDataProvider).not.toHaveBeenCalled();
    expect(scanMany).not.toHaveBeenCalled();

    const rateLimited = await POST(
      new Request('http://localhost/api/scan', {
        method: 'POST',
        headers: { 'x-test-client-ip': '203.0.113.30' },
        body: JSON.stringify({ symbols: ['SPY'] }),
      }),
    );
    expect(rateLimited.status).toBe(429);

    const differentClient = await POST(
      new Request('http://localhost/api/scan', {
        method: 'POST',
        headers: { 'x-test-client-ip': '203.0.113.31' },
        body: JSON.stringify({ symbols: ['SPY'] }),
      }),
    );
    expect(differentClient.status).toBe(200);
  });

  it('rejects repeated scan requests beyond the configured rate gate before provider setup', async () => {
    process.env.SCAN_MAX_REQUESTS_PER_WINDOW = '1';
    process.env.SCAN_RATE_LIMIT_WINDOW_MS = '60000';
    process.env.SCAN_TRUSTED_CLIENT_IP_HEADER = 'x-test-client-ip';

    const first = await POST(
      new Request('http://localhost/api/scan', {
        method: 'POST',
        headers: { 'x-test-client-ip': '203.0.113.10' },
        body: JSON.stringify({ symbols: ['SPY'] }),
      }),
    );
    expect(first.status).toBe(200);
    createMarketDataProvider.mockClear();
    scanMany.mockClear();

    const second = await POST(
      new Request('http://localhost/api/scan', {
        method: 'POST',
        headers: { 'x-test-client-ip': '203.0.113.10' },
        body: JSON.stringify({ symbols: ['SPY'] }),
      }),
    );

    expect(second.status).toBe(429);
    await expect(second.json()).resolves.toEqual({ error: 'Scan request limit exceeded' });
    expect(createMarketDataProvider).not.toHaveBeenCalled();
    expect(scanMany).not.toHaveBeenCalled();
  });

  it('rejects client-supplied forwarding header rotation as distinct public rate-limit keys', async () => {
    process.env.SCAN_MAX_REQUESTS_PER_WINDOW = '1';
    process.env.SCAN_RATE_LIMIT_WINDOW_MS = '60000';

    const first = await POST(
      new Request('http://localhost/api/scan', {
        method: 'POST',
        headers: { 'x-forwarded-for': '203.0.113.40', 'x-real-ip': '203.0.113.41' },
        body: JSON.stringify({ symbols: ['SPY'] }),
      }),
    );
    expect(first.status).toBe(200);
    expect(scanRequestWindowCountForTests()).toBe(1);
    createMarketDataProvider.mockClear();
    scanMany.mockClear();

    const spoofed = await POST(
      new Request('http://localhost/api/scan', {
        method: 'POST',
        headers: { 'x-forwarded-for': '203.0.113.42', 'x-real-ip': '203.0.113.43' },
        body: JSON.stringify({ symbols: ['QQQ'] }),
      }),
    );

    expect(spoofed.status).toBe(429);
    expect(scanRequestWindowCountForTests()).toBe(1);
    expect(createMarketDataProvider).not.toHaveBeenCalled();
    expect(scanMany).not.toHaveBeenCalled();
  });

  it('prunes expired scan rate-limit windows before storing new client keys', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-05T00:00:00.000Z'));
    process.env.SCAN_MAX_REQUESTS_PER_WINDOW = '2';
    process.env.SCAN_RATE_LIMIT_WINDOW_MS = '1000';
    process.env.SCAN_TRUSTED_CLIENT_IP_HEADER = 'x-test-client-ip';

    const first = await POST(
      new Request('http://localhost/api/scan', {
        method: 'POST',
        headers: { 'x-test-client-ip': '203.0.113.50' },
        body: JSON.stringify({ symbols: ['SPY'] }),
      }),
    );
    expect(first.status).toBe(200);
    expect(scanRequestWindowCountForTests()).toBe(1);

    vi.setSystemTime(new Date('2026-05-05T00:00:02.000Z'));
    const second = await POST(
      new Request('http://localhost/api/scan', {
        method: 'POST',
        headers: { 'x-test-client-ip': '203.0.113.51' },
        body: JSON.stringify({ symbols: ['QQQ'] }),
      }),
    );

    expect(second.status).toBe(200);
    expect(scanRequestWindowCountForTests()).toBe(1);
  });

  it('caps scan rate-limit windows with oldest-key eviction', async () => {
    process.env.SCAN_MAX_REQUESTS_PER_WINDOW = '2';
    process.env.SCAN_RATE_LIMIT_WINDOW_MS = '60000';
    process.env.SCAN_MAX_RATE_LIMIT_KEYS = '2';
    process.env.SCAN_TRUSTED_CLIENT_IP_HEADER = 'x-test-client-ip';

    for (const ip of ['203.0.113.60', '203.0.113.61', '203.0.113.62']) {
      const response = await POST(
        new Request('http://localhost/api/scan', {
          method: 'POST',
          headers: { 'x-test-client-ip': ip },
          body: JSON.stringify({ symbols: ['SPY'] }),
        }),
      );
      expect(response.status).toBe(200);
    }

    expect(scanRequestWindowCountForTests()).toBe(2);
  });

  it('rejects concurrent scan requests beyond the configured active gate before provider setup', async () => {
    process.env.SCAN_MAX_ACTIVE_REQUESTS = '1';
    scanMany.mockImplementation(
      () =>
        new Promise((resolve) => {
          releaseScan = () => resolve([{ symbol: 'SPY', primaryLabel: 'Pass' }]);
        }),
    );

    const first = POST(
      new Request('http://localhost/api/scan', {
        method: 'POST',
        headers: { 'x-test-client-ip': '203.0.113.20' },
        body: JSON.stringify({ symbols: ['SPY'] }),
      }),
    );
    await vi.waitFor(() => expect(scanMany).toHaveBeenCalledTimes(1));
    createMarketDataProvider.mockClear();
    scanMany.mockClear();

    const second = await POST(
      new Request('http://localhost/api/scan', {
        method: 'POST',
        headers: { 'x-test-client-ip': '203.0.113.21' },
        body: JSON.stringify({ symbols: ['QQQ'] }),
      }),
    );

    expect(second.status).toBe(429);
    await expect(second.json()).resolves.toEqual({ error: 'Scan request limit exceeded' });
    expect(createMarketDataProvider).not.toHaveBeenCalled();
    expect(scanMany).not.toHaveBeenCalled();
    releaseScan?.();
    await expect(first).resolves.toHaveProperty('status', 200);
  });

  it('returns a generic error when scan setup fails', async () => {
    createMarketDataProvider.mockImplementationOnce(() => {
      throw new Error('unsupported-internal-provider-name');
    });

    const response = await POST(
      new Request('http://localhost/api/scan', {
        method: 'POST',
        body: JSON.stringify({ symbols: ['SPY'] }),
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Scan request failed' });
  });

  it('rejects raw symbol arrays above the cap before filtering duplicates and invalid values', async () => {
    const symbols = Array.from({ length: MAX_SCAN_SYMBOLS + 1 }, () => 'SPY');

    const response = await POST(
      new Request('http://localhost/api/scan', {
        method: 'POST',
        body: JSON.stringify({ symbols }),
      }),
    );

    expect(response.status).toBe(400);
    expect(createMarketDataProvider).not.toHaveBeenCalled();
    expect(scanMany).not.toHaveBeenCalled();
  });
});
