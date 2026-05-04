export interface DeltaRange {
  min: number;
  max: number;
}

export interface ScannerSettings {
  longCall: {
    minDte: number;
    preferredDte: number;
    delta: DeltaRange & { ideal: number };
  };
  shortCall: {
    dte: { min: number; max: number };
    strongUptrendDelta: DeltaRange;
    neutralTargetDelta: number;
    downtrendDelta: DeltaRange;
  };
  extrinsic: {
    passThreshold: number;
    watchLowerBound: number;
  };
  pullbackThreshold: number;
  rsi: {
    period: number;
    risingLookbackTradingDays: number;
  };
}

export const defaultScannerSettings: ScannerSettings = {
  longCall: {
    minDte: 180,
    preferredDte: 365,
    delta: { min: 0.7, max: 0.9, ideal: 0.8 },
  },
  shortCall: {
    dte: { min: 7, max: 30 },
    strongUptrendDelta: { min: 0.3, max: 0.4 },
    neutralTargetDelta: 0.5,
    downtrendDelta: { min: 0.6, max: 0.7 },
  },
  extrinsic: {
    passThreshold: 0.0075,
    watchLowerBound: 0.006,
  },
  pullbackThreshold: 0.05,
  rsi: {
    period: 14,
    risingLookbackTradingDays: 3,
  },
};

export type ValidationResult = { ok: true } | { ok: false; errors: string[] };

function validateRange(name: string, min: number, max: number, errors: string[]): void {
  if (min > max) errors.push(`${name} min must be <= max`);
  if (min < 0 || max < 0) errors.push(`${name} cannot be negative`);
}

export function validateScannerSettings(settings: ScannerSettings): ValidationResult {
  const errors: string[] = [];
  validateRange(
    'long call delta',
    settings.longCall.delta.min,
    settings.longCall.delta.max,
    errors,
  );
  validateRange('short call DTE', settings.shortCall.dte.min, settings.shortCall.dte.max, errors);
  validateRange(
    'strong uptrend delta',
    settings.shortCall.strongUptrendDelta.min,
    settings.shortCall.strongUptrendDelta.max,
    errors,
  );
  validateRange(
    'downtrend delta',
    settings.shortCall.downtrendDelta.min,
    settings.shortCall.downtrendDelta.max,
    errors,
  );
  if (settings.longCall.minDte <= 0 || settings.longCall.preferredDte <= 0)
    errors.push('long call DTE values must be positive');
  if (settings.shortCall.dte.min <= 0 || settings.shortCall.dte.max <= 0)
    errors.push('short call DTE values must be positive');
  if (settings.extrinsic.watchLowerBound > settings.extrinsic.passThreshold)
    errors.push('extrinsic watch lower bound must be <= pass threshold');
  if (
    settings.extrinsic.watchLowerBound < 0 ||
    settings.extrinsic.passThreshold < 0 ||
    settings.pullbackThreshold < 0
  )
    errors.push('thresholds cannot be negative');
  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}
