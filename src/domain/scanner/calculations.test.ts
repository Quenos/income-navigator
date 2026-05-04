import { describe, expect, it } from 'vitest';
import {
  calculateBidExtrinsicValue,
  calculateCallIntrinsicValue,
  calculateMidPrice,
  calculatePullbackDistance,
  calculateWeeklyizedExtrinsicPercent,
  classifyWeeklyizedExtrinsic,
} from './calculations';
import { defaultScannerSettings } from './settings';

describe('scanner calculations', () => {
  it('calculates call intrinsic value', () => {
    expect(calculateCallIntrinsicValue({ stockPrice: 100, strike: 90 })).toBe(10);
    expect(calculateCallIntrinsicValue({ stockPrice: 100, strike: 105 })).toBe(0);
  });

  it('calculates mid price only from valid bid/ask', () => {
    expect(calculateMidPrice({ bid: 1, ask: 1.2 })).toBeCloseTo(1.1);
    expect(calculateMidPrice({ bid: undefined, ask: 1.2 })).toBeNull();
    expect(calculateMidPrice({ bid: 1.3, ask: 1.2 })).toBeNull();
  });

  it('uses bid-based extrinsic and ignores last price', () => {
    expect(
      calculateBidExtrinsicValue({ stockPrice: 100, strike: 105, bid: 0.8, last: 3 }),
    ).toBeCloseTo(0.8);
    expect(
      calculateBidExtrinsicValue({ stockPrice: 100, strike: 95, bid: 6, last: 10 }),
    ).toBeCloseTo(1);
  });

  it('calculates weeklyized extrinsic percent', () => {
    expect(
      calculateWeeklyizedExtrinsicPercent({ stockPrice: 100, extrinsic: 0.8, dte: 7 }),
    ).toBeCloseTo(0.008);
    expect(
      calculateWeeklyizedExtrinsicPercent({ stockPrice: 500, extrinsic: 10, dte: 30 }),
    ).toBeCloseTo(0.0046667);
  });

  it('classifies extrinsic thresholds', () => {
    expect(classifyWeeklyizedExtrinsic(0.0075, defaultScannerSettings)).toBe('pass');
    expect(classifyWeeklyizedExtrinsic(0.0065, defaultScannerSettings)).toBe('watch');
    expect(classifyWeeklyizedExtrinsic(0.005, defaultScannerSettings)).toBe('fail');
  });

  it('calculates pullback distance', () => {
    expect(calculatePullbackDistance({ price: 100, movingAverage: 96 })).toBeCloseTo(0.04);
    expect(calculatePullbackDistance({ price: 100, movingAverage: 94 })).toBeCloseTo(0.06);
  });
});
