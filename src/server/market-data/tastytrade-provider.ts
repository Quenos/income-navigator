import {
  ReadOnlySession,
  getMarketDataByType,
  getOptionChain,
  type MarketData,
  type Option,
} from 'tastytrade-ts-sdk/read-only';
import type { MarketDataProvider, MarketDataProviderResult } from './market-data-provider';

export interface TastytradeMarketDataProviderConfig {
  providerSecret?: string;
  refreshToken?: string;
  isTest?: boolean;
}

export interface TastytradeReadOnlyPort {
  getEquityMarketData(symbols: readonly string[]): Promise<MarketData[]>;
  getOptionChain(symbol: string): Promise<Record<string, Option[]>>;
}

export class TastytradeMarketDataProvider implements MarketDataProvider, TastytradeReadOnlyPort {
  readonly #session: ReadOnlySession | null;

  constructor(config: TastytradeMarketDataProviderConfig = {}) {
    this.#session = config.providerSecret
      ? new ReadOnlySession({
          providerSecret: config.providerSecret,
          refreshToken: config.refreshToken,
          isTest: config.isTest ?? true,
        })
      : null;
  }

  async getEquityMarketData(symbols: readonly string[]): Promise<MarketData[]> {
    if (!this.#session) throw new Error('TastyTrade read-only provider is not configured');
    return getMarketDataByType(this.#session, { equities: [...symbols] });
  }

  async getOptionChain(symbol: string): Promise<Record<string, Option[]>> {
    if (!this.#session) throw new Error('TastyTrade read-only provider is not configured');
    return getOptionChain(this.#session, symbol.toUpperCase());
  }

  async getMarketDataForTicker(symbol: string): Promise<MarketDataProviderResult> {
    return {
      ok: false,
      symbol: symbol.toUpperCase(),
      error: {
        code: 'provider-unavailable',
        message:
          'TastyTrade read-only provider shell is installed but snapshot normalization is not implemented. Use SCANNER_PROVIDER=fake for tests.',
      },
    };
  }
}
