import { describe, expect, it } from 'vitest';
import { FakeMarketDataProvider } from '@/server/market-data/fake-market-data-provider';
import { TastytradeMarketDataProvider } from '@/server/market-data/tastytrade-provider';
import {
  assertReadOnlyProviderSurface,
  findForbiddenReadOnlySurfaceMethods,
} from './readonly-boundary';

describe('read-only provider boundary', () => {
  it('passes for fake and tastytrade scanner providers', () => {
    expect(() => assertReadOnlyProviderSurface(new FakeMarketDataProvider())).not.toThrow();
    expect(() => assertReadOnlyProviderSurface(new TastytradeMarketDataProvider())).not.toThrow();
  });

  it('detects forbidden trading/account methods', () => {
    expect(
      findForbiddenReadOnlySurfaceMethods({
        getMarketDataForTicker: () => null,
        placeOrder: () => null,
        getBalances: () => null,
      }),
    ).toEqual(['placeOrder', 'getBalances']);
  });
});
