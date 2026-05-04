import { describe, expect, it } from 'vitest';
import { FakeMarketDataProvider } from '../market-data/fake-market-data-provider';
import { scanMany, scanTicker } from './scan-service';

describe('scan service', () => {
  it('returns a deterministic Pass fixture result', async () => {
    const result = await scanTicker('SPY', new FakeMarketDataProvider());
    expect(result.symbol).toBe('SPY');
    expect(result.primaryLabel).toBe('Pass');
    expect(result.notes).toContain('All clean-entry rules passed');
  });

  it('isolates one ticker provider failure from another ticker result', async () => {
    const results = await scanMany(
      ['SPY', 'BAD'],
      new FakeMarketDataProvider({ failingSymbols: ['BAD'] }),
    );
    expect(results.map((result) => [result.symbol, result.primaryLabel])).toEqual([
      ['SPY', 'Pass'],
      ['BAD', 'Insufficient Data'],
    ]);
  });
});
