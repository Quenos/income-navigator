import type { MarketDataSnapshot, TrendRegime } from './types';

export function classifyTrendRegime(snapshot: MarketDataSnapshot): TrendRegime {
  if (snapshot.trendRegime) return snapshot.trendRegime;

  const {
    weekly8Ema,
    weekly8EmaSlopePercent,
    weekly21Ema,
    weekly21EmaSlopePercent,
    daily200Sma,
    daily200SmaSlopePercent,
  } = snapshot.technicals;
  const { currentPrice } = snapshot;

  if (
    currentPrice === undefined ||
    weekly8Ema === undefined ||
    weekly8EmaSlopePercent === undefined ||
    weekly21Ema === undefined ||
    weekly21EmaSlopePercent === undefined ||
    daily200Sma === undefined ||
    daily200SmaSlopePercent === undefined
  ) {
    return 'Unclear';
  }

  if (
    weekly8Ema > weekly21Ema &&
    weekly21Ema > daily200Sma &&
    currentPrice > weekly21Ema &&
    weekly8EmaSlopePercent > 0 &&
    weekly21EmaSlopePercent > 0 &&
    daily200SmaSlopePercent > 0
  ) {
    return 'Strong Uptrend';
  }

  if (
    weekly8Ema < weekly21Ema &&
    currentPrice < weekly8Ema &&
    weekly8EmaSlopePercent < 0 &&
    weekly21EmaSlopePercent < 0
  ) {
    return 'Downtrend';
  }

  return 'Neutral / Sideways';
}
