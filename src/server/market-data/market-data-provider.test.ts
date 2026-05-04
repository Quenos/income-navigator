import { describe, expect, it } from 'vitest';
import { forbiddenMarketDataProviderMethods } from './market-data-provider';
import { FakeMarketDataProvider } from './fake-market-data-provider';

describe('read-only market data provider contract', () => {
  it('exposes the required read-only method only', () => {
    const provider = new FakeMarketDataProvider();
    expect(provider.getMarketDataForTicker).toBeTypeOf('function');
    for (const method of forbiddenMarketDataProviderMethods) {
      expect(method in provider).toBe(false);
    }
  });
});
