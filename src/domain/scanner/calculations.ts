import type { ScannerSettings } from './settings';
import type { ResultCondition } from './types';

export function calculateCallIntrinsicValue({
  stockPrice,
  strike,
}: {
  stockPrice: number;
  strike: number;
}): number {
  return Math.max(0, stockPrice - strike);
}

export function calculateMidPrice({ bid, ask }: { bid?: number; ask?: number }): number | null {
  if (bid === undefined || ask === undefined || bid < 0 || ask < 0 || bid > ask) return null;
  return (bid + ask) / 2;
}

export function calculateBidExtrinsicValue({
  stockPrice,
  strike,
  bid,
}: {
  stockPrice: number;
  strike: number;
  bid: number;
  last?: number;
}): number {
  return bid - calculateCallIntrinsicValue({ stockPrice, strike });
}

export function calculateWeeklyizedExtrinsicPercent({
  stockPrice,
  extrinsic,
  dte,
}: {
  stockPrice: number;
  extrinsic: number;
  dte: number;
}): number {
  if (stockPrice <= 0 || dte <= 0) return Number.NaN;
  return (extrinsic / stockPrice) * (7 / dte);
}

export function classifyWeeklyizedExtrinsic(
  value: number,
  settings: ScannerSettings,
): ResultCondition {
  if (value >= settings.extrinsic.passThreshold) return 'pass';
  if (value >= settings.extrinsic.watchLowerBound) return 'watch';
  return 'fail';
}

export function calculatePullbackDistance({
  price,
  movingAverage,
}: {
  price: number;
  movingAverage: number;
}): number {
  return Math.abs(price - movingAverage) / price;
}
