import type { MarketDataSnapshot, OptionContractSnapshot, TechnicalSnapshot } from '../types';

export const fixtureNow = '2026-05-04T20:00:00.000Z';

export function option(overrides: Partial<OptionContractSnapshot> = {}): OptionContractSnapshot {
  return {
    symbol: 'SPY260515C00105000',
    expiration: '2026-05-15',
    dte: 14,
    strike: 105,
    bid: 1.6,
    ask: 1.7,
    delta: 0.35,
    quoteTime: fixtureNow,
    ...overrides,
  };
}

export function technicals(overrides: Partial<TechnicalSnapshot> = {}): TechnicalSnapshot {
  return {
    weekly8Ema: 105,
    weekly21Ema: 100,
    daily50Ema: 96,
    daily150Sma: 95,
    daily200Sma: 90,
    rsi14: 47,
    rsi14ThreeTradingDaysAgo: 42,
    candleDataTime: fixtureNow,
    supportReversalKnown: true,
    ...overrides,
  };
}

export function snapshot(overrides: Partial<MarketDataSnapshot> = {}): MarketDataSnapshot {
  return {
    symbol: 'SPY',
    assetType: 'preferred ETF',
    currentPrice: 100,
    quoteTime: fixtureNow,
    optionChainTime: fixtureNow,
    marketStatus: 'open',
    trendRegime: 'Strong Uptrend',
    technicals: technicals(),
    calls: [
      option({
        symbol: 'SPY270116C00080000',
        expiration: '2027-01-16',
        dte: 256,
        strike: 80,
        bid: 21,
        ask: 21.5,
        delta: 0.8,
      }),
      option(),
    ],
    ...overrides,
  };
}
