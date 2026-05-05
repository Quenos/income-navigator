import {
  defaultScannerSettings,
  validateScannerSettings,
  type ScannerSettings,
} from '@/domain/scanner/settings';
import { MAX_SCAN_SYMBOLS } from '@/server/scanner/limits';

export interface NormalizedScanRequest {
  symbols: string[];
  settings: ScannerSettings;
}

function normalizeSymbols(value: unknown): string[] {
  if (!Array.isArray(value)) throw new Error('symbols must be a non-empty array');
  if (value.length > MAX_SCAN_SYMBOLS) {
    throw new Error(`symbols must include ${MAX_SCAN_SYMBOLS} or fewer submitted tickers`);
  }
  const symbols = [
    ...new Set(
      value
        .filter((symbol): symbol is string => typeof symbol === 'string')
        .map((symbol) => symbol.trim().toUpperCase())
        .filter((symbol) => /^[A-Z][A-Z0-9.\-]{0,9}$/.test(symbol)),
    ),
  ];
  if (symbols.length === 0) throw new Error('symbols must be a non-empty array');
  return symbols;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function mergeSettingsWithDefaults<T>(defaults: T, overrides: unknown, path = 'settings'): T {
  if (!isRecord(defaults)) return (overrides === undefined ? defaults : overrides) as T;
  if (overrides === undefined) return { ...(defaults as Record<string, unknown>) } as T;
  if (!isRecord(overrides)) throw new Error(`${path} must be an object`);

  const merged: Record<string, unknown> = { ...(defaults as Record<string, unknown>) };
  for (const [key, value] of Object.entries(overrides)) {
    const defaultValue = (defaults as Record<string, unknown>)[key];
    merged[key] = isRecord(defaultValue)
      ? mergeSettingsWithDefaults(defaultValue, value, `${path}.${key}`)
      : value;
  }
  return merged as T;
}

export function parseScanRequestBody(body: unknown): NormalizedScanRequest {
  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const settings = mergeSettingsWithDefaults<ScannerSettings>(
    defaultScannerSettings,
    record.settings,
  );
  const validation = validateScannerSettings(settings);
  if (!validation.ok) throw new Error(validation.errors.join('; '));
  return { symbols: normalizeSymbols(record.symbols), settings };
}
