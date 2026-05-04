import {
  calculateBidExtrinsicValue,
  calculatePullbackDistance,
  calculateWeeklyizedExtrinsicPercent,
  classifyWeeklyizedExtrinsic,
} from './calculations';
import { resolvePrimaryResult } from './result-priority';
import { defaultScannerSettings, type ScannerSettings } from './settings';
import type { MarketDataSnapshot, ResultCondition, RuleOutcome, ScannerResult } from './types';

function missingRequiredData(snapshot: MarketDataSnapshot): string[] {
  const missing: string[] = [];
  if (snapshot.currentPrice === undefined) missing.push('Current price is required');
  if (!snapshot.quoteTime) missing.push('Quote timestamp is required');
  if (!snapshot.optionChainTime && !snapshot.confirmedNonOptionable) {
    missing.push('Options-chain timestamp is required');
  }
  if (!snapshot.technicals.candleDataTime) missing.push('Candle data timestamp is required');
  if (
    snapshot.technicals.weekly8Ema === undefined ||
    snapshot.technicals.weekly21Ema === undefined
  ) {
    missing.push('Weekly moving averages are required');
  }
  if (snapshot.technicals.daily50Ema === undefined) missing.push('Daily 50EMA is required');
  if (snapshot.technicals.daily150Sma === undefined) missing.push('Daily 150SMA is required');
  if (snapshot.technicals.daily200Sma === undefined) missing.push('Daily 200SMA is required');
  if (snapshot.technicals.rsi14 === undefined) missing.push('Daily RSI(14) is required');
  if (snapshot.technicals.rsi14ThreeTradingDaysAgo === undefined) {
    missing.push('Daily RSI(14) from 3 trading days ago is required');
  }
  if (!snapshot.confirmedNonOptionable && snapshot.calls.length === 0) {
    missing.push('Options-chain data unavailable');
  }
  if (snapshot.calls.some((contract) => contract.delta === undefined)) {
    missing.push('Option delta is required');
  }
  if (snapshot.calls.some((contract) => contract.bid === undefined || contract.ask === undefined)) {
    missing.push('Option quote is incomplete');
  }
  return missing;
}

function evaluateRsi(snapshot: MarketDataSnapshot): ResultCondition | undefined {
  const { rsi14, rsi14ThreeTradingDaysAgo } = snapshot.technicals;
  if (rsi14 === undefined || rsi14ThreeTradingDaysAgo === undefined) return undefined;
  return rsi14 < 50 && rsi14 > rsi14ThreeTradingDaysAgo ? 'pass' : 'watch';
}

function evaluatePullback(
  snapshot: MarketDataSnapshot,
  settings: ScannerSettings,
): ResultCondition | undefined {
  if (snapshot.currentPrice === undefined) return undefined;
  const movingAverages = [
    snapshot.technicals.daily50Ema,
    snapshot.technicals.daily150Sma,
    snapshot.technicals.daily200Sma,
  ];
  if (movingAverages.some((value) => value === undefined)) return undefined;
  const nearestDistance = Math.min(
    ...movingAverages.map((movingAverage) =>
      calculatePullbackDistance({ price: snapshot.currentPrice!, movingAverage: movingAverage! }),
    ),
  );
  return nearestDistance <= settings.pullbackThreshold ? 'pass' : 'watch';
}

export function evaluateScannerSnapshot(
  snapshot: MarketDataSnapshot,
  settings: ScannerSettings = defaultScannerSettings,
): ScannerResult {
  const conditions: ResultCondition[] = [];
  const notes: string[] = [];
  const reasons: string[] = [];
  const ruleOutcomes: RuleOutcome[] = [];

  if (snapshot.confirmedNonOptionable) {
    conditions.push('fail');
    reasons.push('No options available for this ticker');
  }

  const missing = missingRequiredData(snapshot);
  if (missing.length > 0) {
    conditions.push('insufficient-data');
    reasons.push(...missing);
  }

  if (!snapshot.trendRegime || snapshot.trendRegime === 'Unclear') {
    conditions.push('manual-review');
    reasons.push('Trend regime unclear');
  } else if (snapshot.trendRegime === 'Downtrend') {
    conditions.push('fail');
    reasons.push('Clear downtrend is not a valid new-entry setup');
  } else if (snapshot.trendRegime === 'Neutral / Sideways') {
    conditions.push('watch');
    notes.push('Neutral / Sideways regime is Watch-only for MVP new entries');
  }

  if (
    snapshot.technicals.weekly8Ema !== undefined &&
    snapshot.technicals.weekly21Ema !== undefined
  ) {
    const weeklyTrendPasses = snapshot.technicals.weekly8Ema > snapshot.technicals.weekly21Ema;
    ruleOutcomes.push({
      id: 'weekly-trend',
      label: 'Weekly 8EMA > Weekly 21EMA',
      condition: weeklyTrendPasses ? 'pass' : 'fail',
      message: `${snapshot.technicals.weekly8Ema} > ${snapshot.technicals.weekly21Ema}`,
    });
    if (!weeklyTrendPasses) {
      conditions.push('fail');
      reasons.push('Weekly 8EMA must be greater than weekly 21EMA');
    }
  }

  const rsiCondition = evaluateRsi(snapshot);
  if (rsiCondition) {
    conditions.push(rsiCondition);
    ruleOutcomes.push({
      id: 'rsi',
      label: 'Daily RSI(14) under 50 and rising',
      condition: rsiCondition,
      message: `${snapshot.technicals.rsi14} vs ${snapshot.technicals.rsi14ThreeTradingDaysAgo}`,
    });
    if (rsiCondition === 'watch') notes.push('RSI Not Ideal');
  }

  const pullbackCondition = evaluatePullback(snapshot, settings);
  if (pullbackCondition) {
    conditions.push(pullbackCondition);
    ruleOutcomes.push({
      id: 'pullback',
      label: 'Price near daily 50EMA / 150SMA / 200SMA',
      condition: pullbackCondition,
      message: `Threshold ${(settings.pullbackThreshold * 100).toFixed(1)}%`,
    });
    if (pullbackCondition === 'watch') notes.push('No Pullback');
  }

  const longCandidate = snapshot.calls.find(
    (contract) =>
      contract.dte >= settings.longCall.minDte &&
      contract.delta !== undefined &&
      contract.delta >= settings.longCall.delta.min &&
      contract.delta <= settings.longCall.delta.max,
  );
  if (!longCandidate && missing.length === 0) {
    conditions.push('fail');
    reasons.push('No qualifying long LEAPS candidate');
  }

  const shortCandidate = snapshot.calls.find(
    (contract) =>
      contract.dte >= settings.shortCall.dte.min &&
      contract.dte <= settings.shortCall.dte.max &&
      contract.delta !== undefined &&
      contract.delta >= settings.shortCall.strongUptrendDelta.min &&
      contract.delta <= settings.shortCall.strongUptrendDelta.max &&
      snapshot.currentPrice !== undefined &&
      contract.strike > snapshot.currentPrice,
  );
  if (!shortCandidate && missing.length === 0 && snapshot.trendRegime !== 'Unclear') {
    conditions.push('fail');
    reasons.push('No qualifying short call candidate');
  }

  if (snapshot.currentPrice !== undefined && shortCandidate?.bid !== undefined) {
    const extrinsic = calculateBidExtrinsicValue({
      stockPrice: snapshot.currentPrice,
      strike: shortCandidate.strike,
      bid: shortCandidate.bid,
    });
    const weeklyized = calculateWeeklyizedExtrinsicPercent({
      stockPrice: snapshot.currentPrice,
      extrinsic,
      dte: shortCandidate.dte,
    });
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
    notes.push('All clean-entry rules passed');
  }

  const primaryLabel = resolvePrimaryResult(conditions);
  if (primaryLabel === 'Pass' && !notes.includes('All clean-entry rules passed')) {
    notes.push('All clean-entry rules passed');
  }

  return {
    symbol: snapshot.symbol,
    assetType: snapshot.assetType,
    primaryLabel,
    trendRegime: snapshot.trendRegime,
    currentPrice: snapshot.currentPrice,
    notes,
    reasons,
    ruleOutcomes,
    scanTime: new Date().toISOString(),
    quoteTime: snapshot.quoteTime,
    optionChainTime: snapshot.optionChainTime,
    candleDataTime: snapshot.technicals.candleDataTime,
    marketStatus: snapshot.marketStatus,
  };
}
