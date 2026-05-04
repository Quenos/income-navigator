import { describe, expect, it } from 'vitest';
import { FakeMarketDataProvider } from './fake-market-data-provider';
import { createMarketDataProvider } from './provider-factory';
import { TastytradeMarketDataProvider } from './tastytrade-provider';

describe('provider factory', () => {
  it('returns the fake provider by default or when configured', () => {
    expect(createMarketDataProvider({ SCANNER_PROVIDER: 'fake' })).toBeInstanceOf(
      FakeMarketDataProvider,
    );
    expect(createMarketDataProvider({})).toBeInstanceOf(FakeMarketDataProvider);
  });

  it('fails safely for unknown providers and unconfigured tastytrade', () => {
    expect(() => createMarketDataProvider({ SCANNER_PROVIDER: 'other' })).toThrow('Unsupported');
    expect(() => createMarketDataProvider({ SCANNER_PROVIDER: 'tastytrade' })).toThrow(
      'not configured',
    );
  });

  it('passes read-only tastytrade configuration into the provider', () => {
    const provider = createMarketDataProvider({
      SCANNER_PROVIDER: 'tastytrade',
      TASTYTRADE_PROVIDER_SECRET: 'test-provider-secret',
      TASTYTRADE_REFRESH_TOKEN: 'test-refresh-token',
      TASTYTRADE_IS_TEST: 'true',
    });
    expect(provider).toBeInstanceOf(TastytradeMarketDataProvider);
    expect((provider as TastytradeMarketDataProvider).configured).toBe(true);
    expect((provider as TastytradeMarketDataProvider).isTest).toBe(true);
  });
});
