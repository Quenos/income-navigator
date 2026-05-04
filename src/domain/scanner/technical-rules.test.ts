import { describe, expect, it } from 'vitest';
import { evaluatePullbackRule, evaluateRsiIdeal, evaluateWeeklyTrend } from './technical-rules';

describe('technical rules', () => {
  it('passes weekly trend only when 8EMA is greater than 21EMA', () => {
    expect(evaluateWeeklyTrend({ weekly8Ema: 101, weekly21Ema: 100 })).toBe('pass');
    expect(evaluateWeeklyTrend({ weekly8Ema: 100, weekly21Ema: 100 })).toBe('fail');
    expect(evaluateWeeklyTrend({ weekly8Ema: 99, weekly21Ema: 100 })).toBe('fail');
  });

  it('marks RSI ideal only when under 50 and rising', () => {
    expect(evaluateRsiIdeal({ rsi14: 47, rsi14ThreeTradingDaysAgo: 42 })).toBe('pass');
    expect(evaluateRsiIdeal({ rsi14: 52, rsi14ThreeTradingDaysAgo: 45 })).toBe('watch');
    expect(evaluateRsiIdeal({ rsi14: 44, rsi14ThreeTradingDaysAgo: 48 })).toBe('watch');
  });

  it('passes pullback when price is near a watched moving average', () => {
    expect(evaluatePullbackRule({ price: 100, movingAverages: [96], threshold: 0.05 })).toBe(
      'pass',
    );
    expect(evaluatePullbackRule({ price: 100, movingAverages: [94], threshold: 0.05 })).toBe(
      'watch',
    );
    expect(evaluatePullbackRule({ price: 100, movingAverages: [96], threshold: 0.03 })).toBe(
      'watch',
    );
  });
});
