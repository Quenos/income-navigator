import { describe, expect, it } from 'vitest';
import { snapshot, technicals } from './fixtures/builders';
import { classifyTrendRegime } from './trend-regime';

describe('trend regimes', () => {
  it('uses provided trend regime when the provider supplies one explicitly', () => {
    expect(classifyTrendRegime(snapshot({ trendRegime: 'Downtrend' }))).toBe('Downtrend');
  });

  it('classifies strong uptrend only when EMA8 > EMA21 > SMA200 and EMA/SMA slopes are upward', () => {
    expect(
      classifyTrendRegime(
        snapshot({
          trendRegime: undefined,
          currentPrice: 102,
          technicals: technicals({
            weekly8Ema: 105,
            weekly8EmaSlopePercent: 2.1,
            weekly21Ema: 100,
            weekly21EmaSlopePercent: 0.7,
            daily200Sma: 90,
            daily200SmaSlopePercent: 1.4,
          }),
        }),
      ),
    ).toBe('Strong Uptrend');

    expect(
      classifyTrendRegime(
        snapshot({
          trendRegime: undefined,
          currentPrice: 99,
          technicals: technicals({
            weekly8Ema: 105,
            weekly8EmaSlopePercent: 2.1,
            weekly21Ema: 100,
            weekly21EmaSlopePercent: 0.7,
            daily200Sma: 90,
            daily200SmaSlopePercent: 1.4,
          }),
        }),
      ),
    ).toBe('Neutral / Sideways');

    expect(
      classifyTrendRegime(
        snapshot({
          trendRegime: undefined,
          technicals: technicals({
            weekly8Ema: 105,
            weekly8EmaSlopePercent: 2.1,
            weekly21Ema: 100,
            weekly21EmaSlopePercent: 0.7,
            daily200Sma: 101,
            daily200SmaSlopePercent: 1.4,
          }),
        }),
      ),
    ).toBe('Neutral / Sideways');

    expect(
      classifyTrendRegime(
        snapshot({
          trendRegime: undefined,
          technicals: technicals({
            weekly8Ema: 105,
            weekly8EmaSlopePercent: -0.1,
            weekly21Ema: 100,
            weekly21EmaSlopePercent: 0.7,
            daily200Sma: 90,
            daily200SmaSlopePercent: 1.4,
          }),
        }),
      ),
    ).toBe('Neutral / Sideways');

    expect(
      classifyTrendRegime(
        snapshot({
          trendRegime: undefined,
          technicals: technicals({
            weekly8Ema: 105,
            weekly8EmaSlopePercent: 2.1,
            weekly21Ema: 100,
            weekly21EmaSlopePercent: 0.7,
            daily200Sma: 90,
            daily200SmaSlopePercent: -0.2,
          }),
        }),
      ),
    ).toBe('Neutral / Sideways');
  });

  it('classifies downtrend only when EMA8 < EMA21 and both weekly EMA slopes are downward', () => {
    expect(
      classifyTrendRegime(
        snapshot({
          trendRegime: undefined,
          currentPrice: 94,
          technicals: technicals({
            weekly8Ema: 95,
            weekly8EmaSlopePercent: -1.2,
            weekly21Ema: 100,
            weekly21EmaSlopePercent: -0.4,
            daily200Sma: 102,
            daily200SmaSlopePercent: -0.2,
          }),
        }),
      ),
    ).toBe('Downtrend');

    expect(
      classifyTrendRegime(
        snapshot({
          trendRegime: undefined,
          currentPrice: 96,
          technicals: technicals({
            weekly8Ema: 95,
            weekly8EmaSlopePercent: -1.2,
            weekly21Ema: 100,
            weekly21EmaSlopePercent: -0.4,
            daily200Sma: 102,
            daily200SmaSlopePercent: -0.2,
          }),
        }),
      ),
    ).toBe('Neutral / Sideways');

    expect(
      classifyTrendRegime(
        snapshot({
          trendRegime: undefined,
          technicals: technicals({
            weekly8Ema: 95,
            weekly8EmaSlopePercent: 0.1,
            weekly21Ema: 100,
            weekly21EmaSlopePercent: -0.4,
            daily200Sma: 102,
            daily200SmaSlopePercent: -0.2,
          }),
        }),
      ),
    ).toBe('Neutral / Sideways');
  });

  it('classifies non-matching complete technical contexts as neutral sideways', () => {
    expect(
      classifyTrendRegime(
        snapshot({
          trendRegime: undefined,
          technicals: technicals({
            weekly8Ema: 101,
            weekly8EmaSlopePercent: 0,
            weekly21Ema: 100,
            weekly21EmaSlopePercent: 0,
            daily200Sma: 100,
            daily200SmaSlopePercent: 0,
          }),
        }),
      ),
    ).toBe('Neutral / Sideways');
  });

  it('classifies missing technical contexts as unclear', () => {
    expect(
      classifyTrendRegime(
        snapshot({
          trendRegime: undefined,
          technicals: technicals({ weekly21EmaSlopePercent: undefined }),
        }),
      ),
    ).toBe('Unclear');
  });
});
