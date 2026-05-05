export type PrimaryResultLabel = 'Pass' | 'Watch' | 'Fail' | 'Insufficient Data' | 'Manual Review';
export type ResultCondition = 'pass' | 'watch' | 'fail' | 'insufficient-data' | 'manual-review';
export type TrendRegime = 'Strong Uptrend' | 'Neutral / Sideways' | 'Downtrend' | 'Unclear';
export type AssetType = 'stock' | 'ETF' | 'preferred ETF' | 'unknown';
export type MarketStatus = 'open' | 'closed' | 'unknown';
export type Moneyness = 'OTM' | 'ATM' | 'ITM';

export interface RuleOutcome {
  id: string;
  label: string;
  condition: ResultCondition;
  message: string;
}

export interface OptionCandidateEvidence {
  symbol: string;
  expiration: string;
  dte: number;
  strike: number;
  delta?: number;
  bid?: number;
  ask?: number;
  midPrice?: number;
  intrinsicValue?: number;
  bidExtrinsicValue?: number;
  rawExtrinsicPercent?: number;
  weeklyizedExtrinsic?: number;
  moneyness?: Moneyness;
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
  selectedLongCall?: OptionCandidateEvidence;
  selectedShortCall?: OptionCandidateEvidence;
  scanTime: string;
  quoteTime?: string;
  optionChainTime?: string;
  candleDataTime?: string;
  marketStatus: MarketStatus;
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
  weekly8EmaSlopePercent?: number;
  weekly21Ema?: number;
  weekly21EmaSlopePercent?: number;
  daily50Ema?: number;
  daily150Sma?: number;
  daily200Sma?: number;
  daily200SmaSlopePercent?: number;
  rsi14?: number;
  rsi14ThreeTradingDaysAgo?: number;
  candleDataTime?: string;
  supportReversalKnown?: boolean;
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
