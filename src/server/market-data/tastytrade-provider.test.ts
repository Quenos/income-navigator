import { describe, expect, it } from 'vitest';
import { assertReadOnlyProviderSurface } from '@/lib/safety/readonly-boundary';
import { TastytradeMarketDataProvider } from './tastytrade-provider';

describe('TastyTrade read-only adapter shell', () => {
  it('implements MarketDataProvider without exposing trading or account surfaces', async () => {
    const provider = new TastytradeMarketDataProvider();
    expect(provider.getMarketDataForTicker).toBeTypeOf('function');
    expect(() => assertReadOnlyProviderSurface(provider)).not.toThrow();
    await expect(provider.getMarketDataForTicker('SPY')).resolves.toMatchObject({
      ok: false,
      error: { code: 'provider-unavailable' },
    });
  });

  it('throws a clear not-configured error for direct SDK calls without session config', async () => {
    const provider = new TastytradeMarketDataProvider();
    await expect(provider.getEquityMarketData(['SPY'])).rejects.toThrow(
      'read-only provider is not configured',
    );
    await expect(provider.getOptionChain('SPY')).rejects.toThrow(
      'read-only provider is not configured',
    );
  });
});
