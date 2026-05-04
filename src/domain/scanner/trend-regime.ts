import type { MarketDataSnapshot, TrendRegime } from './types';

export function classifyTrendRegime(snapshot: MarketDataSnapshot): TrendRegime {
  if (snapshot.trendRegime) return snapshot.trendRegime;
  const { weekly8Ema, weekly21Ema, daily200Sma } = snapshot.technicals;
  if (
    weekly8Ema === undefined ||
    weekly21Ema === undefined ||
    snapshot.currentPrice === undefined
  ) {
    return 'Unclear';
  }
  if (weekly8Ema < weekly21Ema) return 'Downtrend';
  if (
    weekly8Ema > weekly21Ema &&
    daily200Sma !== undefined &&
    snapshot.currentPrice >= daily200Sma * 0.98
  ) {
    return 'Strong Uptrend';
  }
  if (Math.abs(weekly8Ema - weekly21Ema) / Math.max(weekly21Ema, 1) <= 0.02) {
    return 'Neutral / Sideways';
  }
  return 'Unclear';
}
