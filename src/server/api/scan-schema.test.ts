import { describe, expect, it } from 'vitest';
import { defaultScannerSettings } from '@/domain/scanner/settings';
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
