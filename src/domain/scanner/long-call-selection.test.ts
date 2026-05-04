import { describe, expect, it } from 'vitest';
import { option } from './fixtures/builders';
import { isQualifyingLongCall, selectLongCallCandidate } from './long-call-selection';
import { defaultScannerSettings } from './settings';

describe('long LEAPS candidate selection', () => {
  it('filters by DTE and delta boundaries', () => {
    expect(isQualifyingLongCall(option({ dte: 180, delta: 0.7 }), defaultScannerSettings)).toBe(
      true,
    );
    expect(isQualifyingLongCall(option({ dte: 179, delta: 0.7 }), defaultScannerSettings)).toBe(
      false,
    );
    expect(isQualifyingLongCall(option({ dte: 180, delta: 0.69 }), defaultScannerSettings)).toBe(
      false,
    );
    expect(isQualifyingLongCall(option({ dte: 180, delta: 0.9 }), defaultScannerSettings)).toBe(
      true,
    );
    expect(isQualifyingLongCall(option({ dte: 180, delta: 0.91 }), defaultScannerSettings)).toBe(
      false,
    );
  });

  it('ranks closest preferred DTE then ideal delta', () => {
    const selected = selectLongCallCandidate(
      [
        option({ symbol: 'A', dte: 210, delta: 0.8 }),
        option({ symbol: 'B', dte: 370, delta: 0.75 }),
      ],
      defaultScannerSettings,
    );
    expect(selected?.symbol).toBe('B');
  });

  it('can prefer lower-end-of-range 12-24 month candidate', () => {
    const selected = selectLongCallCandidate(
      [
        option({ symbol: 'FAR', dte: 900, delta: 0.8 }),
        option({ symbol: 'LOWER', dte: 730, delta: 0.78 }),
      ],
      defaultScannerSettings,
      { preferLowerEndOfRange: true },
    );
    expect(selected?.symbol).toBe('LOWER');
  });
});
