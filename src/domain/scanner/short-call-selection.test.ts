import { describe, expect, it } from 'vitest';
import { option } from './fixtures/builders';
import { defaultScannerSettings } from './settings';
import {
  classifyCallMoneyness,
  isQualifyingShortCall,
  selectShortCallCandidate,
} from './short-call-selection';

describe('short call candidate selection', () => {
  it('classifies call moneyness', () => {
    expect(classifyCallMoneyness(100, 105)).toBe('OTM');
    expect(classifyCallMoneyness(100, 100)).toBe('ATM');
    expect(classifyCallMoneyness(100, 95)).toBe('ITM');
  });

  it('filters strong uptrend candidates', () => {
    expect(
      isQualifyingShortCall({
        contract: option({ strike: 105, delta: 0.35, dte: 14 }),
        stockPrice: 100,
        regime: 'Strong Uptrend',
        settings: defaultScannerSettings,
      }),
    ).toBe(true);
    expect(
      isQualifyingShortCall({
        contract: option({ strike: 105, delta: 0.45, dte: 14 }),
        stockPrice: 100,
        regime: 'Strong Uptrend',
        settings: defaultScannerSettings,
      }),
    ).toBe(false);
    expect(
      isQualifyingShortCall({
        contract: option({ strike: 95, delta: 0.35, dte: 14 }),
        stockPrice: 100,
        regime: 'Strong Uptrend',
        settings: defaultScannerSettings,
      }),
    ).toBe(false);
    expect(
      isQualifyingShortCall({
        contract: option({ strike: 105, delta: 0.35, dte: 31 }),
        stockPrice: 100,
        regime: 'Strong Uptrend',
        settings: defaultScannerSettings,
      }),
    ).toBe(false);
  });

  it('selects ATM neutral candidates and ITM downtrend context candidates', () => {
    expect(
      selectShortCallCandidate({
        calls: [option({ strike: 100, delta: 0.5 })],
        stockPrice: 100,
        regime: 'Neutral / Sideways',
        settings: defaultScannerSettings,
      })?.symbol,
    ).toBeDefined();
    expect(
      selectShortCallCandidate({
        calls: [option({ strike: 95, delta: 0.65 })],
        stockPrice: 100,
        regime: 'Downtrend',
        settings: defaultScannerSettings,
      })?.symbol,
    ).toBeDefined();
  });

  it('prefers extrinsic target, then delta midpoint, then higher extrinsic', () => {
    const selected = selectShortCallCandidate({
      calls: [
        option({ symbol: 'LOW', strike: 105, delta: 0.35, bid: 0.5 }),
        option({ symbol: 'MID', strike: 105, delta: 0.35, bid: 1.5 }),
        option({ symbol: 'EDGE', strike: 105, delta: 0.3, bid: 1.7 }),
      ],
      stockPrice: 100,
      regime: 'Strong Uptrend',
      settings: defaultScannerSettings,
    });
    expect(selected?.symbol).toBe('MID');
  });

  it('uses nearest available strike as ATM for neutral regimes when price is between strikes', () => {
    const selected = selectShortCallCandidate({
      calls: [
        option({ symbol: 'NEAR', strike: 100, delta: 0.5, bid: 1.1, ask: 1.2 }),
        option({ symbol: 'FAR', strike: 105, delta: 0.5, bid: 2.1, ask: 2.2 }),
      ],
      stockPrice: 101,
      regime: 'Neutral / Sideways',
      settings: defaultScannerSettings,
    });
    expect(selected?.symbol).toBe('NEAR');
  });

  it('does not select a short call for unclear regimes', () => {
    const selected = selectShortCallCandidate({
      calls: [option({ symbol: 'UNCLEAR', strike: 105, delta: 0.35 })],
      stockPrice: 100,
      regime: 'Unclear',
      settings: defaultScannerSettings,
    });
    expect(selected).toBeUndefined();
  });
});
