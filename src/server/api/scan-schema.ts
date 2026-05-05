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

export function parseScanRequestBody(body: unknown): NormalizedScanRequest {
  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const settings = record.settings
    ? { ...defaultScannerSettings, ...(record.settings as Partial<ScannerSettings>) }
    : defaultScannerSettings;
  const validation = validateScannerSettings(settings);
  if (!validation.ok) throw new Error(validation.errors.join('; '));
  return { symbols: normalizeSymbols(record.symbols), settings };
}
