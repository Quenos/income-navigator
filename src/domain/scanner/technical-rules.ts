import { calculatePullbackDistance } from './calculations';
import type { ResultCondition, TechnicalSnapshot } from './types';

export function evaluateWeeklyTrend(
  technicals: Pick<TechnicalSnapshot, 'weekly8Ema' | 'weekly21Ema'>,
): ResultCondition {
  return technicals.weekly8Ema !== undefined &&
    technicals.weekly21Ema !== undefined &&
    technicals.weekly8Ema > technicals.weekly21Ema
    ? 'pass'
    : 'fail';
}

export function evaluateRsiIdeal(
  technicals: Pick<TechnicalSnapshot, 'rsi14' | 'rsi14ThreeTradingDaysAgo'>,
): ResultCondition {
  return technicals.rsi14 !== undefined &&
    technicals.rsi14ThreeTradingDaysAgo !== undefined &&
    technicals.rsi14 < 50 &&
    technicals.rsi14 > technicals.rsi14ThreeTradingDaysAgo
    ? 'pass'
    : 'watch';
}

export function evaluatePullbackRule({
  price,
  movingAverages,
  threshold,
}: {
  price: number;
  movingAverages: number[];
  threshold: number;
}): ResultCondition {
  const valid = movingAverages.filter((value) => Number.isFinite(value));
  if (valid.length === 0) return 'fail';
  const nearestDistance = Math.min(
    ...valid.map((movingAverage) => calculatePullbackDistance({ price, movingAverage })),
  );
  return nearestDistance <= threshold ? 'pass' : 'watch';
}
