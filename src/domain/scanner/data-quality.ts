import type { MarketDataProviderErrorCode } from '@/server/market-data/market-data-provider';
import type { MarketDataSnapshot } from './types';

export type DataQualityIssueCode =
  | 'ticker-not-found'
  | 'non-optionable'
  | 'options-unavailable'
  | 'missing-candles'
  | 'missing-daily-200sma'
  | 'missing-option-chain'
  | 'missing-delta'
  | 'missing-bid-ask'
  | 'provider-unavailable'
  | 'stale-quote'
  | 'unclear-trend';

export interface DataQualityIssue {
  code: DataQualityIssueCode;
  message: string;
}

const messages: Record<DataQualityIssueCode, string> = {
  'ticker-not-found': 'Ticker not found',
  'non-optionable': 'No options available for this ticker',
  'options-unavailable': 'Options-chain data unavailable',
  'missing-candles': 'Candle data is required',
  'missing-daily-200sma': 'Daily 200SMA is required',
  'missing-option-chain': 'Options-chain data unavailable',
  'missing-delta': 'Option delta is required',
  'missing-bid-ask': 'Option quote is incomplete',
  'provider-unavailable': 'Market data provider unavailable',
  'stale-quote': 'Required quote data is stale',
  'unclear-trend': 'Trend regime unclear',
};

export function mapProviderErrorCode(code: MarketDataProviderErrorCode): DataQualityIssue {
  if (code === 'ticker-not-found') return { code, message: messages[code] };
  if (code === 'options-unavailable') return { code, message: messages['options-unavailable'] };
  return { code: 'provider-unavailable', message: messages['provider-unavailable'] };
}

function issue(code: DataQualityIssueCode): DataQualityIssue {
  return { code, message: messages[code] };
}

export function evaluateDataQuality(
  snapshot: MarketDataSnapshot,
  now = new Date(),
): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];
  if (
    !snapshot.technicals.candleDataTime ||
    snapshot.technicals.weekly8Ema === undefined ||
    snapshot.technicals.weekly21Ema === undefined
  ) {
    issues.push(issue('missing-candles'));
  }
  if (snapshot.technicals.daily200Sma === undefined) issues.push(issue('missing-daily-200sma'));
  if (snapshot.confirmedNonOptionable) issues.push(issue('non-optionable'));
  if (
    !snapshot.confirmedNonOptionable &&
    (snapshot.calls.length === 0 || !snapshot.optionChainTime)
  ) {
    issues.push(issue('missing-option-chain'));
  }
  if (snapshot.calls.some((contract) => contract.delta === undefined))
    issues.push(issue('missing-delta'));
  if (snapshot.calls.some((contract) => contract.bid === undefined || contract.ask === undefined))
    issues.push(issue('missing-bid-ask'));
  if (snapshot.marketStatus === 'open' && snapshot.quoteTime) {
    const quoteAgeMs = now.getTime() - new Date(snapshot.quoteTime).getTime();
    if (quoteAgeMs > 15 * 60 * 1000) issues.push(issue('stale-quote'));
  }
  if (snapshot.marketStatus === 'closed' && snapshot.isLastAvailableData) {
    // Explicitly allowed; the decision engine adds the after-hours label.
  }
  if (snapshot.trendRegime === 'Unclear') issues.push(issue('unclear-trend'));
  return issues;
}
