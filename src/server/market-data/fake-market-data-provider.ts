import { getFixtureForSymbol } from '@/domain/scanner/fixtures';
import type { MarketDataProvider, MarketDataProviderResult } from './market-data-provider';

export interface FakeMarketDataProviderOptions {
  failingSymbols?: readonly string[];
}

export class FakeMarketDataProvider implements MarketDataProvider {
  readonly #failingSymbols: Set<string>;

  constructor(options: FakeMarketDataProviderOptions = {}) {
    this.#failingSymbols = new Set(
      options.failingSymbols?.map((symbol) => symbol.toUpperCase()) ?? [],
    );
  }

  async getMarketDataForTicker(symbol: string): Promise<MarketDataProviderResult> {
    const normalized = symbol.toUpperCase();
    if (this.#failingSymbols.has(normalized)) {
      return {
        ok: false,
        symbol: normalized,
        error: { code: 'provider-unavailable', message: 'Market data provider unavailable' },
      };
    }
    const snapshot = getFixtureForSymbol(normalized);
    if (!snapshot) {
      return {
        ok: false,
        symbol: normalized,
        error: { code: 'ticker-not-found', message: 'Ticker not found' },
      };
    }
    return { ok: true, snapshot };
  }
}
