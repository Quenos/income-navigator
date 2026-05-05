import { describe, expect, it } from 'vitest';
import { assertReadOnlyProviderSurface } from '@/lib/safety/readonly-boundary';
import type { MarketData, Option } from 'tastytrade-ts-sdk/read-only';
import { TastytradeMarketDataProvider, type TastytradeReadOnlyPort } from './tastytrade-provider';

const isoNow = '2026-05-04T20:00:00.000Z';

function marketData(overrides: Record<string, unknown>): MarketData {
  return overrides as unknown as MarketData;
}

function callOption(overrides: Record<string, unknown>): Option {
  return {
    option_type: 'C',
    active: true,
    symbol: 'SPY  260515C00105000',
    expiration_date: '2026-05-15',
    days_to_expiration: 14,
    strike_price: '105',
    ...overrides,
  } as unknown as Option;
}

class StubTastytradePort implements TastytradeReadOnlyPort {
  async getEquityMarketData() {
    return [
      marketData({
        symbol: 'SPY',
        updated_at: isoNow,
        mark: '100',
        bid: '99.95',
        ask: '100.05',
        instrument: { is_etf: true },
      }),
    ];
  }

  async getOptionChain(): Promise<Record<string, Option[]>> {
    return {
      '2026-05-15': [
        callOption({
          symbol: 'SPY  260515C00105000',
          days_to_expiration: 14,
          strike_price: '105',
        }),
      ],
      '2027-01-16': [
        callOption({
          symbol: 'SPY  270116C00080000',
          expiration_date: '2027-01-16',
          days_to_expiration: 257,
          strike_price: '80',
        }),
      ],
    };
  }

  async getOptionMarketData(symbols: readonly string[]) {
    return symbols.map((symbol) => {
      if (symbol.includes('270116'))
        return marketData({ symbol, bid: '21', ask: '21.5', updated_at: isoNow });
      return marketData({ symbol, bid: '1.6', ask: '1.7', updated_at: isoNow });
    });
  }

  async getOptionGreeks(symbols: readonly string[]) {
    return symbols.map((symbol) => ({ symbol, delta: symbol.includes('270116') ? 0.8 : 0.35 }));
  }

  async getDailyCandles() {
    return Array.from({ length: 220 }, (_, index) => ({
      time: Date.UTC(2025, 5, 1 + index),
      close: 90 + index * 0.05,
    }));
  }

  async getWeeklyCandles() {
    return Array.from({ length: 30 }, (_, index) => ({
      time: Date.UTC(2025, 9, 1 + index * 7),
      close: 95 + index * 0.5,
    }));
  }
}

class ChunkSensitiveTastytradePort extends StubTastytradePort {
  readonly optionMarketDataBatchSizes: number[] = [];
  readonly optionGreeksBatchSizes: number[] = [];

  async getOptionChain(): Promise<Record<string, Option[]>> {
    return {
      '2026-05-15': Array.from({ length: 205 }, (_, index) =>
        callOption({
          symbol: `SPY  260515C${String(90000 + index * 100).padStart(8, '0')}`,
          streamer_symbol: `SPY260515C${String(90000 + index * 100).padStart(8, '0')}`,
          days_to_expiration: 14,
          strike_price: String(90 + index),
        }),
      ),
      '2027-01-16': [
        callOption({
          symbol: 'SPY  270116C00080000',
          streamer_symbol: 'SPY270116C00080000',
          expiration_date: '2027-01-16',
          days_to_expiration: 257,
          strike_price: '80',
        }),
      ],
    };
  }

  async getOptionMarketData(symbols: readonly string[]) {
    this.optionMarketDataBatchSizes.push(symbols.length);
    if (symbols.length > 100) throw new Error('request URI would be too large');
    return symbols.map((symbol) =>
      marketData({ symbol, bid: '1.6', ask: '1.7', updated_at: isoNow }),
    );
  }

  async getOptionGreeks(symbols: readonly string[]) {
    this.optionGreeksBatchSizes.push(symbols.length);
    if (symbols.length > 100) throw new Error('subscription batch too large');
    return symbols.map((symbol) => ({ symbol, delta: symbol.includes('270116') ? 0.8 : 0.35 }));
  }
}

class StreamerUnavailableTastytradePort extends StubTastytradePort {
  async getOptionMarketData(symbols: readonly string[]) {
    return symbols.map((symbol) =>
      marketData({
        symbol,
        bid: symbol.includes('270116') ? '21' : '1.6',
        ask: symbol.includes('270116') ? '21.5' : '1.7',
        delta: symbol.includes('270116') ? '0.8' : '0.35',
        updated_at: isoNow,
      }),
    );
  }

  async getOptionGreeks(): Promise<never> {
    throw new Error('streamer unavailable');
  }

  async getDailyCandles(): Promise<never> {
    throw new Error('candle streamer unavailable');
  }

  async getWeeklyCandles(): Promise<never> {
    throw new Error('candle streamer unavailable');
  }
}

describe('TastyTrade read-only adapter', () => {
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
    await expect(provider.getOptionMarketData(['SPY  260515C00105000'])).rejects.toThrow(
      'read-only provider is not configured',
    );
  });

  it('normalizes live TastyTrade quote, option chain, option quote, greek, and candle data into a scanner snapshot', async () => {
    const provider = new TastytradeMarketDataProvider({
      readOnlyPort: new StubTastytradePort(),
      now: () => new Date(isoNow),
    });

    await expect(provider.getMarketDataForTicker('spy')).resolves.toMatchObject({
      ok: true,
      snapshot: {
        symbol: 'SPY',
        assetType: 'preferred ETF',
        currentPrice: 100,
        quoteTime: isoNow,
        optionChainTime: isoNow,
        marketStatus: 'open',
        technicals: {
          daily50Ema: expect.any(Number),
          daily150Sma: expect.any(Number),
          daily200Sma: expect.any(Number),
          weekly8Ema: expect.any(Number),
          weekly8EmaSlopePercent: expect.any(Number),
          weekly21Ema: expect.any(Number),
          weekly21EmaSlopePercent: expect.any(Number),
          daily200SmaSlopePercent: expect.any(Number),
          rsi14: expect.any(Number),
          rsi14ThreeTradingDaysAgo: expect.any(Number),
        },
        calls: expect.arrayContaining([
          expect.objectContaining({
            symbol: 'SPY  270116C00080000',
            expiration: '2027-01-16',
            dte: 257,
            strike: 80,
            bid: 21,
            ask: 21.5,
            delta: 0.8,
          }),
          expect.objectContaining({
            symbol: 'SPY  260515C00105000',
            expiration: '2026-05-15',
            dte: 14,
            strike: 105,
            bid: 1.6,
            ask: 1.7,
            delta: 0.35,
          }),
        ]),
      },
    });
  });

  it('falls back to REST option quote deltas when dxLink streamer data is unavailable', async () => {
    const provider = new TastytradeMarketDataProvider({
      readOnlyPort: new StreamerUnavailableTastytradePort(),
      now: () => new Date(isoNow),
    });

    await expect(provider.getMarketDataForTicker('spy')).resolves.toMatchObject({
      ok: true,
      snapshot: {
        calls: expect.arrayContaining([
          expect.objectContaining({ symbol: 'SPY  270116C00080000', delta: 0.8 }),
          expect.objectContaining({ symbol: 'SPY  260515C00105000', delta: 0.35 }),
        ]),
      },
    });
  });

  it('chunks large option quote and greek requests to avoid TastyTrade request-URI limits', async () => {
    const port = new ChunkSensitiveTastytradePort();
    const provider = new TastytradeMarketDataProvider({
      readOnlyPort: port,
      now: () => new Date(isoNow),
    });

    await expect(provider.getMarketDataForTicker('spy')).resolves.toMatchObject({ ok: true });
    expect(Math.max(...port.optionMarketDataBatchSizes)).toBeLessThanOrEqual(100);
    expect(Math.max(...port.optionGreeksBatchSizes)).toBeLessThanOrEqual(100);
    expect(port.optionMarketDataBatchSizes.length).toBeGreaterThan(1);
    expect(port.optionGreeksBatchSizes.length).toBeGreaterThan(1);
  });

  it('returns options-unavailable when TastyTrade confirms the underlying has no option chain', async () => {
    const port = new StubTastytradePort();
    port.getOptionChain = async () => ({});
    const provider = new TastytradeMarketDataProvider({ readOnlyPort: port });

    await expect(provider.getMarketDataForTicker('NOOPT')).resolves.toMatchObject({
      ok: false,
      symbol: 'NOOPT',
      error: { code: 'options-unavailable' },
    });
  });
});
