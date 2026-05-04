import { describe, expect, it } from 'vitest';
import { snapshot, technicals } from './fixtures/builders';
import { classifyTrendRegime } from './trend-regime';

describe('trend regimes', () => {
  it('classifies strong uptrend, downtrend, neutral, and unclear contexts', () => {
    expect(classifyTrendRegime(snapshot({ trendRegime: undefined }))).toBe('Strong Uptrend');
    expect(
      classifyTrendRegime(
        snapshot({
          trendRegime: undefined,
          technicals: technicals({ weekly8Ema: 95, weekly21Ema: 100 }),
        }),
      ),
    ).toBe('Downtrend');
    expect(
      classifyTrendRegime(
        snapshot({
          trendRegime: undefined,
          currentPrice: 80,
          technicals: technicals({ weekly8Ema: 101, weekly21Ema: 100, daily200Sma: 100 }),
        }),
      ),
    ).toBe('Neutral / Sideways');
    expect(classifyTrendRegime(snapshot({ trendRegime: undefined, currentPrice: undefined }))).toBe(
      'Unclear',
    );
  });
});
