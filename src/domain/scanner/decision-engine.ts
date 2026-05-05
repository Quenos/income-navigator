import {
  calculateBidExtrinsicValue,
  calculateCallIntrinsicValue,
  calculateMidPrice,
  calculatePullbackDistance,
  calculateWeeklyizedExtrinsicPercent,
  classifyWeeklyizedExtrinsic,
} from './calculations';
import { evaluateDataQuality } from './data-quality';
import { selectLongCallCandidate } from './long-call-selection';
import { resolvePrimaryResult } from './result-priority';
import { defaultScannerSettings, type ScannerSettings } from './settings';
import {
  classifyCallMoneyness,
  selectShortCallCandidate,
  weeklyizedExtrinsicForShortCall,
} from './short-call-selection';
import {
  compareIndicatorDirection,
  evaluatePullbackRule,
  evaluateRsiIdeal,
  evaluateWeeklyTrend,
} from './technical-rules';
import { classifyTrendRegime } from './trend-regime';
import type {
  MarketDataSnapshot,
  OptionCandidateEvidence,
  ResultCondition,
  RuleOutcome,
  ScannerResult,
} from './types';

function evidenceFromCandidate(
  candidate: NonNullable<MarketDataSnapshot['calls'][number]>,
  currentPrice: number,
): OptionCandidateEvidence {
  const intrinsicValue = calculateCallIntrinsicValue({
    stockPrice: currentPrice,
    strike: candidate.strike,
  });
  const bidExtrinsicValue =
    candidate.bid === undefined
      ? undefined
      : calculateBidExtrinsicValue({
          stockPrice: currentPrice,
          strike: candidate.strike,
          bid: candidate.bid,
        });
  const midPrice = calculateMidPrice({ bid: candidate.bid, ask: candidate.ask }) ?? undefined;
  return {
    symbol: candidate.symbol,
    expiration: candidate.expiration,
    dte: candidate.dte,
    strike: candidate.strike,
    delta: candidate.delta,
    bid: candidate.bid,
    ask: candidate.ask,
    midPrice,
    intrinsicValue,
    bidExtrinsicValue,
    rawExtrinsicPercent:
      bidExtrinsicValue === undefined || currentPrice <= 0
        ? undefined
        : bidExtrinsicValue / currentPrice,
    weeklyizedExtrinsic:
      bidExtrinsicValue === undefined
        ? undefined
        : calculateWeeklyizedExtrinsicPercent({
            stockPrice: currentPrice,
            extrinsic: bidExtrinsicValue,
            dte: candidate.dte,
          }),
    moneyness: classifyCallMoneyness(currentPrice, candidate.strike),
  };
}

export function evaluateScannerSnapshot(
  snapshot: MarketDataSnapshot,
  settings: ScannerSettings = defaultScannerSettings,
  now = new Date('2026-05-04T20:05:00.000Z'),
): ScannerResult {
  const conditions: ResultCondition[] = [];
  const notes: string[] = [];
  const reasons: string[] = [];
  const ruleOutcomes: RuleOutcome[] = [];
  const regime = classifyTrendRegime(snapshot);

  const dataIssues = evaluateDataQuality({ ...snapshot, trendRegime: regime }, now);
  for (const issue of dataIssues) {
    if (issue.code === 'non-optionable') conditions.push('fail');
    else if (issue.code === 'unclear-trend') conditions.push('manual-review');
    else conditions.push('insufficient-data');
    reasons.push(issue.message);
  }

  if (snapshot.marketStatus === 'closed' && snapshot.isLastAvailableData) {
    notes.push('After-hours: showing last available market data');
  }
  if (snapshot.technicals.supportReversalKnown === false) {
    conditions.push('manual-review');
    notes.push('Support reversal requires manual review');
  }

  const weeklyTrend = evaluateWeeklyTrend(snapshot.technicals);
  ruleOutcomes.push({
    id: 'weekly-trend',
    label: 'Weekly 8EMA > Weekly 21EMA',
    condition: weeklyTrend,
    message: `${snapshot.technicals.weekly8Ema ?? 'missing'} vs ${snapshot.technicals.weekly21Ema ?? 'missing'}`,
  });
  if (
    weeklyTrend === 'fail' &&
    snapshot.technicals.weekly8Ema !== undefined &&
    snapshot.technicals.weekly21Ema !== undefined
  ) {
    conditions.push('fail');
    reasons.push('Weekly 8EMA must be greater than weekly 21EMA');
  }

  if (regime === 'Downtrend') {
    conditions.push('fail');
    reasons.push('Clear downtrend is not a valid new-entry setup');
  } else if (regime === 'Neutral / Sideways') {
    conditions.push('watch');
    notes.push('Neutral / Sideways regime is Watch-only for MVP new entries');
  } else if (regime === 'Unclear') {
    conditions.push('manual-review');
    reasons.push('Trend regime unclear');
  }

  const rsi = evaluateRsiIdeal(snapshot.technicals);
  const rsiDirection = compareIndicatorDirection(
    snapshot.technicals.rsi14,
    snapshot.technicals.rsi14ThreeTradingDaysAgo,
  );
  conditions.push(rsi);
  ruleOutcomes.push({
    id: 'rsi',
    label: 'Daily RSI(14) under 50; direction vs 3 trading days ago',
    condition: rsi,
    message: `${snapshot.technicals.rsi14 ?? 'missing'} vs ${snapshot.technicals.rsi14ThreeTradingDaysAgo ?? 'missing'} (${rsiDirection})`,
  });
  if (rsi === 'watch') notes.push('RSI Not Ideal');

  if (
    snapshot.currentPrice !== undefined &&
    snapshot.technicals.daily50Ema !== undefined &&
    snapshot.technicals.daily150Sma !== undefined &&
    snapshot.technicals.daily200Sma !== undefined
  ) {
    const pullback = evaluatePullbackRule({
      price: snapshot.currentPrice,
      movingAverages: [
        snapshot.technicals.daily50Ema,
        snapshot.technicals.daily150Sma,
        snapshot.technicals.daily200Sma,
      ],
      threshold: settings.pullbackThreshold,
    });
    conditions.push(pullback);
    ruleOutcomes.push({
      id: 'pullback',
      label: 'Price near daily 50EMA / 150SMA / 200SMA',
      condition: pullback,
      message: `Nearest MA distance ${(Math.min(...[snapshot.technicals.daily50Ema, snapshot.technicals.daily150Sma, snapshot.technicals.daily200Sma].map((ma) => calculatePullbackDistance({ price: snapshot.currentPrice!, movingAverage: ma! }))) * 100).toFixed(2)}%; threshold ${(settings.pullbackThreshold * 100).toFixed(1)}%`,
    });
    if (pullback === 'watch') notes.push('No Pullback');
  }

  const longCandidate = selectLongCallCandidate(snapshot.calls, settings);
  if (!longCandidate && !snapshot.confirmedNonOptionable && dataIssues.length === 0) {
    conditions.push('fail');
    reasons.push('No qualifying long LEAPS candidate');
  }

  const shortCandidate =
    snapshot.currentPrice === undefined
      ? undefined
      : selectShortCallCandidate({
          calls: snapshot.calls,
          stockPrice: snapshot.currentPrice,
          regime,
          settings,
        });
  if (
    !shortCandidate &&
    !snapshot.confirmedNonOptionable &&
    dataIssues.length === 0 &&
    regime !== 'Unclear'
  ) {
    conditions.push('fail');
    reasons.push('No qualifying short call candidate');
  }

  if (snapshot.currentPrice !== undefined && shortCandidate) {
    const weeklyized = weeklyizedExtrinsicForShortCall(shortCandidate, snapshot.currentPrice);
    const extrinsicCondition = classifyWeeklyizedExtrinsic(weeklyized, settings);
    conditions.push(extrinsicCondition);
    ruleOutcomes.push({
      id: 'weeklyized-extrinsic',
      label: 'Bid-based weeklyized extrinsic',
      condition: extrinsicCondition,
      message: `${(weeklyized * 100).toFixed(2)}%`,
    });
  }

  if (conditions.length === 0 || conditions.every((condition) => condition === 'pass')) {
    conditions.push('pass');
  }

  const primaryLabel = resolvePrimaryResult(conditions);
  if (primaryLabel === 'Pass') notes.push('All clean-entry rules passed');

  return {
    symbol: snapshot.symbol,
    assetType: snapshot.assetType,
    primaryLabel,
    trendRegime: regime,
    currentPrice: snapshot.currentPrice,
    notes: Array.from(new Set(notes)),
    reasons: Array.from(new Set(reasons)),
    ruleOutcomes,
    selectedLongCall:
      longCandidate && snapshot.currentPrice !== undefined
        ? evidenceFromCandidate(longCandidate, snapshot.currentPrice)
        : undefined,
    selectedShortCall:
      shortCandidate && snapshot.currentPrice !== undefined
        ? evidenceFromCandidate(shortCandidate, snapshot.currentPrice)
        : undefined,
    scanTime: new Date().toISOString(),
    quoteTime: snapshot.quoteTime,
    optionChainTime: snapshot.optionChainTime,
    candleDataTime: snapshot.technicals.candleDataTime,
    marketStatus: snapshot.marketStatus,
  };
}
