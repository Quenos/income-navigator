import { describe, expect, it } from 'vitest';
import { defaultScannerSettings, type ScannerSettings } from '@/domain/scanner/settings';
import { FakeMarketDataProvider } from '../market-data/fake-market-data-provider';
import type {
  MarketDataProvider,
  MarketDataProviderResult,
} from '../market-data/market-data-provider';
import { MAX_SCAN_CONCURRENCY } from './limits';
import { scanMany, scanTicker } from './scan-service';

class TrackingProvider implements MarketDataProvider {
  active = 0;
  maxActive = 0;
  readonly calls: string[] = [];
  readonly settings: ScannerSettings[] = [];

  async getMarketDataForTicker(
    symbol: string,
    settings: ScannerSettings = defaultScannerSettings,
  ): Promise<MarketDataProviderResult> {
    this.calls.push(symbol);
    this.settings.push(settings);
    this.active += 1;
    this.maxActive = Math.max(this.maxActive, this.active);
    await new Promise((resolve) => setTimeout(resolve, 1));
    this.active -= 1;
    return {
      ok: false,
      symbol,
      error: { code: 'ticker-not-found', message: `internal provider detail for ${symbol}` },
    };
  }
}

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

  it('does not expose provider error details in scanner results', async () => {
    const result = await scanTicker('BAD', {
      async getMarketDataForTicker(symbol) {
        return {
          ok: false,
          symbol,
          error: {
            code: 'provider-unavailable',
            message: 'upstream timeout with internal request id secret-detail',
          },
        };
      },
    });

    expect(result.reasons).toEqual(['Market data provider unavailable']);
    expect(result.ruleOutcomes[0]?.message).toBe('Market data provider unavailable');
  });

  it('constrains scanMany provider concurrency and preserves result order', async () => {
    const provider = new TrackingProvider();
    const symbols = Array.from(
      { length: MAX_SCAN_CONCURRENCY + 3 },
      (_value, index) => `T${index}`,
    );

    const results = await scanMany(symbols, provider);

    expect(provider.maxActive).toBeLessThanOrEqual(MAX_SCAN_CONCURRENCY);
    expect(provider.calls).toEqual(symbols);
    expect(results.map((result) => result.symbol)).toEqual(symbols);
  });

  it('passes custom scanner settings into provider loading before evaluation', async () => {
    const provider = new TrackingProvider();
    const settings: ScannerSettings = {
      ...defaultScannerSettings,
      longCall: {
        ...defaultScannerSettings.longCall,
        delta: { min: 0.88, max: 0.95, ideal: 0.92 },
        minDte: 500,
        preferredDte: 540,
      },
      shortCall: {
        ...defaultScannerSettings.shortCall,
        dte: { min: 45, max: 60 },
      },
    };

    await scanMany(['spy'], provider, settings);

    expect(provider.settings).toEqual([settings]);
  });
});
