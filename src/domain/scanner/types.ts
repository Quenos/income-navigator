export type PrimaryResultLabel = 'Pass' | 'Watch' | 'Fail' | 'Insufficient Data' | 'Manual Review';
export type ResultCondition = 'pass' | 'watch' | 'fail' | 'insufficient-data' | 'manual-review';
export type TrendRegime = 'Strong Uptrend' | 'Neutral / Sideways' | 'Downtrend' | 'Unclear';
export type AssetType = 'stock' | 'ETF' | 'preferred ETF' | 'unknown';

export interface RuleOutcome {
  id: string;
  label: string;
  condition: ResultCondition;
  message: string;
}

export interface ScannerResult {
  symbol: string;
  assetType: AssetType;
  primaryLabel: PrimaryResultLabel;
  trendRegime?: TrendRegime;
  currentPrice?: number;
  notes: string[];
  reasons: string[];
  ruleOutcomes: RuleOutcome[];
  scanTime: string;
  quoteTime?: string;
  optionChainTime?: string;
  candleDataTime?: string;
  marketStatus: 'open' | 'closed' | 'unknown';
}

export interface OptionContractSnapshot {
  symbol: string;
  expiration: string;
  dte: number;
  strike: number;
  bid?: number;
  ask?: number;
  last?: number;
  delta?: number;
  quoteTime?: string;
}

export interface TechnicalSnapshot {
  weekly8Ema?: number;
  weekly21Ema?: number;
  daily50Ema?: number;
  daily150Sma?: number;
  daily200Sma?: number;
  rsi14?: number;
  rsi14ThreeTradingDaysAgo?: number;
  candleDataTime?: string;
}

export interface MarketDataSnapshot {
  symbol: string;
  assetType: AssetType;
  currentPrice?: number;
  quoteTime?: string;
  optionChainTime?: string;
  marketStatus: 'open' | 'closed';
  isLastAvailableData?: boolean;
  confirmedNonOptionable?: boolean;
  trendRegime?: TrendRegime;
  technicals: TechnicalSnapshot;
  calls: OptionContractSnapshot[];
}
