import { evaluateScannerSnapshot, type ScannerResult } from '@/domain/scanner';
import { defaultScannerSettings, type ScannerSettings } from '@/domain/scanner/settings';
import type {
  MarketDataProvider,
  MarketDataProviderError,
} from '../market-data/market-data-provider';
import { MAX_SCAN_CONCURRENCY, MAX_SCAN_SYMBOLS } from './limits';

function publicProviderErrorMessage(error: MarketDataProviderError): string {
  switch (error.code) {
    case 'ticker-not-found':
      return 'Ticker not found';
    case 'options-unavailable':
      return 'Options data unavailable';
    case 'provider-unavailable':
      return 'Market data provider unavailable';
  }
}

function resultFromProviderError(symbol: string, error: MarketDataProviderError): ScannerResult {
  const message = publicProviderErrorMessage(error);
  return {
    symbol,
    assetType: 'unknown',
    primaryLabel: 'Insufficient Data',
    notes: [],
    reasons: [message],
    ruleOutcomes: [{ id: error.code, label: error.code, condition: 'insufficient-data', message }],
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
  try {
    const providerResult = await provider.getMarketDataForTicker(normalized);
    if (!providerResult.ok)
      return resultFromProviderError(providerResult.symbol, providerResult.error);
    return evaluateScannerSnapshot(providerResult.snapshot, settings);
  } catch {
    return resultFromProviderError(normalized, {
      code: 'provider-unavailable',
      message: 'Market data provider unavailable',
    });
  }
}

export async function scanMany(
  symbols: readonly string[],
  provider: MarketDataProvider,
  settings: ScannerSettings = defaultScannerSettings,
): Promise<ScannerResult[]> {
  const uniqueSymbols = [
    ...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)),
  ];
  if (uniqueSymbols.length > MAX_SCAN_SYMBOLS) {
    throw new Error(`symbols must include ${MAX_SCAN_SYMBOLS} or fewer unique tickers`);
  }

  const results = new Array<ScannerResult>(uniqueSymbols.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < uniqueSymbols.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await scanTicker(uniqueSymbols[currentIndex], provider, settings);
    }
  }

  const workerCount = Math.min(MAX_SCAN_CONCURRENCY, uniqueSymbols.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
