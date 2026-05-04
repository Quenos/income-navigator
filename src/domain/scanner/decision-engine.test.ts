import { describe, expect, it } from 'vitest';
import { evaluateScannerSnapshot } from './decision-engine';
import { clearPassStrongUptrendFixture } from './fixtures';
import type { MarketDataSnapshot } from './types';

function fixture(overrides: Partial<MarketDataSnapshot> = {}): MarketDataSnapshot {
  return {
    ...clearPassStrongUptrendFixture,
    ...overrides,
    technicals: {
      ...clearPassStrongUptrendFixture.technicals,
      ...overrides.technicals,
    },
    calls: overrides.calls ?? clearPassStrongUptrendFixture.calls,
  };
}

describe('scanner decision engine', () => {
  it('downgrades otherwise valid setup to Watch when RSI is not ideal', () => {
    const result = evaluateScannerSnapshot(
      fixture({ technicals: { rsi14: 52, rsi14ThreeTradingDaysAgo: 45 } }),
    );
    expect(result.primaryLabel).toBe('Watch');
    expect(result.notes).toContain('RSI Not Ideal');
  });

  it('downgrades otherwise valid setup to Watch when no pullback is present', () => {
    const result = evaluateScannerSnapshot(
      fixture({ technicals: { daily50Ema: 90, daily150Sma: 88, daily200Sma: 87 } }),
    );
    expect(result.primaryLabel).toBe('Watch');
    expect(result.notes).toContain('No Pullback');
  });

  it('does not allow Pass when trend regime is missing', () => {
    const result = evaluateScannerSnapshot(fixture({ trendRegime: 'Unclear' }));
    expect(result.primaryLabel).toBe('Manual Review');
    expect(result.reasons).toContain('Trend regime unclear');
  });

  it('returns Insufficient Data when required daily technical data is missing', () => {
    const result = evaluateScannerSnapshot(fixture({ technicals: { daily200Sma: undefined } }));
    expect(result.primaryLabel).toBe('Insufficient Data');
    expect(result.reasons).toContain('Daily 200SMA is required');
  });

  it('returns Insufficient Data when option-chain data is unavailable', () => {
    const result = evaluateScannerSnapshot(fixture({ calls: [] }));
    expect(result.primaryLabel).toBe('Insufficient Data');
    expect(result.reasons).toContain('Options-chain data unavailable');
  });

  it('does not select a regime-dependent short-call candidate for unclear regimes', () => {
    const result = evaluateScannerSnapshot(fixture({ trendRegime: 'Unclear' }));
    expect(result.primaryLabel).toBe('Manual Review');
    expect(result.selectedShortCall).toBeUndefined();
  });

  it('includes detailed candidate calculation evidence', () => {
    const result = evaluateScannerSnapshot(fixture());
    expect(result.selectedShortCall).toMatchObject({
      midPrice: 1.65,
      intrinsicValue: 0,
      bidExtrinsicValue: 1.6,
    });
    expect(result.selectedShortCall?.rawExtrinsicPercent).toBeCloseTo(0.016);
  });
});
