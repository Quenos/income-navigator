import { describe, expect, it } from 'vitest';
import { defaultScannerSettings } from '@/domain/scanner/settings';
import { MAX_SCAN_SYMBOLS } from '@/server/scanner/limits';
import { parseScanRequestBody } from './scan-schema';

describe('scan request schema', () => {
  it('requires a non-empty ticker list', () => {
    expect(() => parseScanRequestBody({ symbols: [] })).toThrow('symbols');
  });

  it('normalizes lowercase tickers and removes duplicates', () => {
    expect(parseScanRequestBody({ symbols: ['spy', 'SPY', ' qqq '] }).symbols).toEqual([
      'SPY',
      'QQQ',
    ]);
  });

  it('rejects more than the server-side raw ticker cap', () => {
    const symbols = Array.from({ length: MAX_SCAN_SYMBOLS + 1 }, (_value, index) => `T${index}`);

    expect(() => parseScanRequestBody({ symbols })).toThrow(`${MAX_SCAN_SYMBOLS} or fewer`);
  });

  it('rejects over-cap raw arrays even when duplicates would normalize under the cap', () => {
    const symbols = Array.from({ length: MAX_SCAN_SYMBOLS + 1 }, () => 'SPY');

    expect(() => parseScanRequestBody({ symbols })).toThrow(`${MAX_SCAN_SYMBOLS} or fewer`);
  });

  it('rejects invalid settings', () => {
    expect(() =>
      parseScanRequestBody({
        symbols: ['SPY'],
        settings: {
          ...defaultScannerSettings,
          extrinsic: { passThreshold: 0.001, watchLowerBound: 0.006 },
        },
      }),
    ).toThrow('extrinsic');
  });
});
