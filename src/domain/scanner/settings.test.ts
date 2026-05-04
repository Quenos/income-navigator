import { describe, expect, it } from 'vitest';
import { defaultScannerSettings, validateScannerSettings } from './settings';

describe('scanner settings', () => {
  it('provides MVP defaults from FR-032', () => {
    expect(defaultScannerSettings.longCall.minDte).toBe(180);
    expect(defaultScannerSettings.longCall.preferredDte).toBe(365);
    expect(defaultScannerSettings.longCall.delta).toEqual({ min: 0.7, max: 0.9, ideal: 0.8 });
    expect(defaultScannerSettings.shortCall.dte).toEqual({ min: 7, max: 30 });
    expect(defaultScannerSettings.shortCall.strongUptrendDelta).toEqual({ min: 0.3, max: 0.4 });
    expect(defaultScannerSettings.shortCall.neutralTargetDelta).toBe(0.5);
    expect(defaultScannerSettings.shortCall.downtrendDelta).toEqual({ min: 0.6, max: 0.7 });
    expect(defaultScannerSettings.extrinsic.passThreshold).toBe(0.0075);
    expect(defaultScannerSettings.extrinsic.watchLowerBound).toBe(0.006);
    expect(defaultScannerSettings.pullbackThreshold).toBe(0.05);
    expect(defaultScannerSettings.rsi.period).toBe(14);
    expect(defaultScannerSettings.rsi.risingLookbackTradingDays).toBe(3);
  });

  it('rejects invalid setting ranges', () => {
    const invalid = structuredClone(defaultScannerSettings);
    invalid.longCall.delta.min = 0.91;
    invalid.longCall.delta.max = 0.7;
    expect(validateScannerSettings(invalid).ok).toBe(false);
  });

  it('rejects watch thresholds greater than pass thresholds', () => {
    const invalid = structuredClone(defaultScannerSettings);
    invalid.extrinsic.watchLowerBound = 0.008;
    expect(validateScannerSettings(invalid).ok).toBe(false);
  });
});
