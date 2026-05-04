import { describe, expect, it } from 'vitest';
import { FakeMarketDataProvider } from './fake-market-data-provider';

describe('fake market data provider', () => {
  it('returns fixtures by ticker and simulates failures without network', async () => {
    const provider = new FakeMarketDataProvider({ failingSymbols: ['BAD'] });
    await expect(provider.getMarketDataForTicker('SPY')).resolves.toMatchObject({ ok: true });
    await expect(provider.getMarketDataForTicker('BAD')).resolves.toMatchObject({
      ok: false,
      error: { code: 'provider-unavailable' },
    });
  });
});
