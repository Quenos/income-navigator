import type { MarketDataSnapshot } from '@/domain/scanner';
import type { ScannerSettings } from '@/domain/scanner/settings';

export type MarketDataProviderErrorCode =
  | 'ticker-not-found'
  | 'provider-unavailable'
  | 'options-unavailable';

export interface MarketDataProviderError {
  code: MarketDataProviderErrorCode;
  message: string;
}

export type MarketDataProviderResult =
  | { ok: true; snapshot: MarketDataSnapshot }
  | { ok: false; symbol: string; error: MarketDataProviderError };

export interface MarketDataProvider {
  getMarketDataForTicker(
    symbol: string,
    settings?: ScannerSettings,
  ): Promise<MarketDataProviderResult>;
}

export const forbiddenMarketDataProviderMethods = [
  'placeOrder',
  'previewOrder',
  'submitOrder',
  'modifyOrder',
  'cancelOrder',
  'routeOrder',
  'getBalances',
  'getPositions',
] as const;
