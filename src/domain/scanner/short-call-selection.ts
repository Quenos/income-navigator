import { calculateBidExtrinsicValue, calculateWeeklyizedExtrinsicPercent } from './calculations';
import type { ScannerSettings } from './settings';
import type { Moneyness, OptionContractSnapshot, TrendRegime } from './types';

export function classifyCallMoneyness(stockPrice: number, strike: number): Moneyness {
  if (strike > stockPrice) return 'OTM';
  if (strike < stockPrice) return 'ITM';
  return 'ATM';
}

function deltaTargetForRegime(
  regime: TrendRegime,
  settings: ScannerSettings,
): { min: number; max: number; target: number; moneyness?: Moneyness } {
  if (regime === 'Neutral / Sideways')
    return {
      min: 0.45,
      max: 0.55,
      target: settings.shortCall.neutralTargetDelta,
      moneyness: 'ATM',
    };
  if (regime === 'Downtrend')
    return { ...settings.shortCall.downtrendDelta, target: 0.65, moneyness: 'ITM' };
  return { ...settings.shortCall.strongUptrendDelta, target: 0.35, moneyness: 'OTM' };
}

function nearestAtmStrikes(calls: OptionContractSnapshot[], stockPrice: number): Set<number> {
  if (calls.length === 0) return new Set();
  const nearestDistance = Math.min(
    ...calls.map((contract) => Math.abs(contract.strike - stockPrice)),
  );
  return new Set(
    calls
      .filter((contract) => Math.abs(contract.strike - stockPrice) === nearestDistance)
      .map((contract) => contract.strike),
  );
}

export function isQualifyingShortCall({
  contract,
  stockPrice,
  regime,
  settings,
  atmStrikes,
}: {
  contract: OptionContractSnapshot;
  stockPrice: number;
  regime: TrendRegime;
  settings: ScannerSettings;
  atmStrikes?: Set<number>;
}): boolean {
  const target = deltaTargetForRegime(regime, settings);
  const moneyness = classifyCallMoneyness(stockPrice, contract.strike);
  const neutralAtm =
    regime === 'Neutral / Sideways'
      ? (atmStrikes ?? new Set([stockPrice])).has(contract.strike)
      : true;
  return (
    contract.dte >= settings.shortCall.dte.min &&
    contract.dte <= settings.shortCall.dte.max &&
    contract.delta !== undefined &&
    contract.delta >= target.min &&
    contract.delta <= target.max &&
    neutralAtm &&
    (target.moneyness !== 'OTM' || moneyness === 'OTM') &&
    (target.moneyness !== 'ITM' || moneyness === 'ITM')
  );
}

export function weeklyizedExtrinsicForShortCall(
  contract: OptionContractSnapshot,
  stockPrice: number,
): number {
  if (contract.bid === undefined) return Number.NEGATIVE_INFINITY;
  const extrinsic = calculateBidExtrinsicValue({
    stockPrice,
    strike: contract.strike,
    bid: contract.bid,
  });
  return calculateWeeklyizedExtrinsicPercent({ stockPrice, extrinsic, dte: contract.dte });
}

export function selectShortCallCandidate({
  calls,
  stockPrice,
  regime,
  settings,
}: {
  calls: OptionContractSnapshot[];
  stockPrice: number;
  regime: TrendRegime;
  settings: ScannerSettings;
}): OptionContractSnapshot | undefined {
  if (regime === 'Unclear') return undefined;
  const target = deltaTargetForRegime(regime, settings);
  const dteFiltered = calls.filter(
    (contract) =>
      contract.dte >= settings.shortCall.dte.min && contract.dte <= settings.shortCall.dte.max,
  );
  const atmStrikes = nearestAtmStrikes(dteFiltered, stockPrice);
  const candidates = dteFiltered.filter((contract) =>
    isQualifyingShortCall({ contract, stockPrice, regime, settings, atmStrikes }),
  );
  return candidates.sort((a, b) => {
    const aWeeklyized = weeklyizedExtrinsicForShortCall(a, stockPrice);
    const bWeeklyized = weeklyizedExtrinsicForShortCall(b, stockPrice);
    const aMeets = aWeeklyized >= settings.extrinsic.passThreshold ? 0 : 1;
    const bMeets = bWeeklyized >= settings.extrinsic.passThreshold ? 0 : 1;
    if (aMeets !== bMeets) return aMeets - bMeets;
    const deltaDistance =
      Math.abs((a.delta ?? 0) - target.target) - Math.abs((b.delta ?? 0) - target.target);
    if (deltaDistance !== 0) return deltaDistance;
    return bWeeklyized - aWeeklyized;
  })[0];
}
