import { evaluateScannerSnapshot, type ScannerResult } from '@/domain/scanner';
import { defaultScannerSettings, type ScannerSettings } from '@/domain/scanner/settings';
import type {
  MarketDataProvider,
  MarketDataProviderError,
} from '../market-data/market-data-provider';

function resultFromProviderError(symbol: string, error: MarketDataProviderError): ScannerResult {
  return {
    symbol,
    assetType: 'unknown',
    primaryLabel: 'Insufficient Data',
    notes: [],
    reasons: [error.message],
    ruleOutcomes: [
      { id: error.code, label: error.code, condition: 'insufficient-data', message: error.message },
    ],
    scanTime: new Date().toISOString(),
    marketStatus: 'unknown',
  };
}

export async function scanTicker(
  symbol: string,
  provider: MarketDataProvider,
  settings: ScannerSettings = defaultScannerSettings,
): Promise<ScannerResult> {
  const normalized = symbol.trim().toUpperCase();
  const providerResult = await provider.getMarketDataForTicker(normalized);
  if (!providerResult.ok)
    return resultFromProviderError(providerResult.symbol, providerResult.error);
  return evaluateScannerSnapshot(providerResult.snapshot, settings);
}

export async function scanMany(
  symbols: readonly string[],
  provider: MarketDataProvider,
  settings: ScannerSettings = defaultScannerSettings,
): Promise<ScannerResult[]> {
  const uniqueSymbols = [
    ...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)),
  ];
  return Promise.all(uniqueSymbols.map((symbol) => scanTicker(symbol, provider, settings)));
}
