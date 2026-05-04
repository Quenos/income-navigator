import type { MarketDataSnapshot } from '../types';
import { fixtureNow, option, snapshot, technicals } from './builders';

export const clearPassStrongUptrendFixture = snapshot();

export const scannerFixtures: Record<string, MarketDataSnapshot> = {
  clear_pass_strong_uptrend: clearPassStrongUptrendFixture,
  watch_rsi_not_ideal: snapshot({
    symbol: 'RSI',
    technicals: technicals({ rsi14: 52, rsi14ThreeTradingDaysAgo: 45 }),
  }),
  watch_no_pullback: snapshot({
    symbol: 'PULL',
    technicals: technicals({ daily50Ema: 90, daily150Sma: 88, daily200Sma: 86 }),
  }),
  watch_neutral_sideways: snapshot({
    symbol: 'NEUT',
    trendRegime: 'Neutral / Sideways',
    calls: [
      option({
        symbol: 'NEUT270116C00080000',
        dte: 256,
        strike: 80,
        delta: 0.8,
        bid: 21,
        ask: 21.4,
      }),
      option({ symbol: 'NEUT260515C00100000', strike: 100, delta: 0.5, bid: 1.2, ask: 1.3 }),
    ],
  }),
  watch_extrinsic_between_060_and_0749: snapshot({
    symbol: 'WXTR',
    calls: [
      option({ dte: 256, strike: 80, delta: 0.8, bid: 21, ask: 21.4 }),
      option({ dte: 7, bid: 0.65, ask: 0.7 }),
    ],
  }),
  fail_weekly_trend: snapshot({
    symbol: 'WTRD',
    technicals: technicals({ weekly8Ema: 100, weekly21Ema: 100 }),
  }),
  fail_downtrend: snapshot({
    symbol: 'DOWN',
    trendRegime: 'Downtrend',
    technicals: technicals({ weekly8Ema: 95, weekly21Ema: 100 }),
  }),
  fail_no_qualifying_leaps: snapshot({
    symbol: 'NLEAP',
    calls: [option({ dte: 90, delta: 0.8 }), option()],
  }),
  fail_no_qualifying_short_call: snapshot({
    symbol: 'NSHORT',
    calls: [
      option({ dte: 256, strike: 80, delta: 0.8, bid: 21, ask: 21.5 }),
      option({ dte: 40, strike: 105, delta: 0.35 }),
    ],
  }),
  fail_extrinsic_below_060: snapshot({
    symbol: 'FXTR',
    calls: [
      option({ dte: 256, strike: 80, delta: 0.8, bid: 21, ask: 21.5 }),
      option({ bid: 0.5, ask: 0.55 }),
    ],
  }),
  fail_confirmed_non_optionable: snapshot({
    symbol: 'NOOPT',
    confirmedNonOptionable: true,
    optionChainTime: undefined,
    calls: [],
  }),
  insufficient_missing_greeks: snapshot({
    symbol: 'MGREK',
    calls: [option({ dte: 256, strike: 80, delta: 0.8, bid: 21 }), option({ delta: undefined })],
  }),
  insufficient_missing_bid_ask: snapshot({
    symbol: 'MBID',
    calls: [option({ dte: 256, strike: 80, delta: 0.8, bid: 21 }), option({ bid: undefined })],
  }),
  insufficient_stale_quote: snapshot({ symbol: 'STALE', quoteTime: '2026-05-04T19:00:00.000Z' }),
  insufficient_provider_unavailable: snapshot({ symbol: 'UNAVL' }),
  manual_review_unclear_trend: snapshot({ symbol: 'UNCLEAR', trendRegime: 'Unclear' }),
  long_candidate_ranking_closest_365: snapshot({
    symbol: 'LRANK',
    calls: [
      option({ dte: 210, strike: 80, delta: 0.8, bid: 21 }),
      option({
        symbol: 'LRANK270504C00080000',
        expiration: '2027-05-04',
        dte: 365,
        strike: 80,
        delta: 0.79,
        bid: 22,
      }),
      option(),
    ],
  }),
  long_candidate_ranking_lower_end_range: snapshot({
    symbol: 'LLOW',
    calls: [
      option({ dte: 900, strike: 80, delta: 0.8, bid: 23 }),
      option({
        symbol: 'LLOW270504C00080000',
        expiration: '2027-05-04',
        dte: 365,
        strike: 80,
        delta: 0.78,
        bid: 22,
      }),
      option(),
    ],
  }),
  short_candidate_ranking_delta_midpoint: snapshot({
    symbol: 'SRANK',
    calls: [
      option({ dte: 256, strike: 80, delta: 0.8, bid: 21 }),
      option({ symbol: 'SRANKA', delta: 0.3, bid: 1.7 }),
      option({ symbol: 'SRANKB', delta: 0.35, bid: 1.6 }),
    ],
  }),
  after_hours_last_available_data_labeled: snapshot({
    symbol: 'AFTER',
    marketStatus: 'closed',
    isLastAvailableData: true,
    quoteTime: fixtureNow,
  }),
};

export function getFixtureForSymbol(symbol: string): MarketDataSnapshot | undefined {
  const normalized = symbol.toUpperCase();
  const byKey = scannerFixtures[normalized.toLowerCase()];
  if (byKey) return { ...byKey, symbol: normalized };
  const bySymbol = Object.values(scannerFixtures).find((fixture) => fixture.symbol === normalized);
  if (bySymbol) return { ...bySymbol, symbol: normalized };
  if (normalized === 'SPY') return { ...clearPassStrongUptrendFixture, symbol: normalized };
  if (normalized === 'BAD' || normalized === 'UNAVL')
    return scannerFixtures.insufficient_provider_unavailable;
  return undefined;
}
