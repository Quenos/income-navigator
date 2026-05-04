import type { MarketDataSnapshot } from '../types';

const now = '2026-05-04T20:00:00.000Z';

export const clearPassStrongUptrendFixture: MarketDataSnapshot = {
  symbol: 'SPY',
  assetType: 'preferred ETF',
  currentPrice: 100,
  quoteTime: now,
  optionChainTime: now,
  marketStatus: 'open',
  trendRegime: 'Strong Uptrend',
  technicals: {
    weekly8Ema: 105,
    weekly21Ema: 100,
    daily50Ema: 96,
    daily150Sma: 95,
    daily200Sma: 90,
    rsi14: 47,
    rsi14ThreeTradingDaysAgo: 42,
    candleDataTime: now,
  },
  calls: [
    {
      symbol: 'SPY260116C00080000',
      expiration: '2026-01-16',
      dte: 256,
      strike: 80,
      bid: 21,
      ask: 21.5,
      delta: 0.8,
      quoteTime: now,
    },
    {
      symbol: 'SPY260515C00105000',
      expiration: '2026-05-15',
      dte: 7,
      strike: 105,
      bid: 0.8,
      ask: 0.9,
      delta: 0.35,
      quoteTime: now,
    },
  ],
};

export function getFixtureForSymbol(symbol: string): MarketDataSnapshot | undefined {
  if (symbol.toUpperCase() === 'SPY')
    return { ...clearPassStrongUptrendFixture, symbol: symbol.toUpperCase() };
  return undefined;
}
