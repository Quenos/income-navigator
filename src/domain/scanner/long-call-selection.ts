import type { ScannerSettings } from './settings';
import type { OptionContractSnapshot } from './types';

export function isQualifyingLongCall(
  contract: OptionContractSnapshot,
  settings: ScannerSettings,
): boolean {
  return (
    contract.dte >= settings.longCall.minDte &&
    contract.delta !== undefined &&
    contract.delta >= settings.longCall.delta.min &&
    contract.delta <= settings.longCall.delta.max
  );
}

export function selectLongCallCandidate(
  calls: OptionContractSnapshot[],
  settings: ScannerSettings,
  options: { preferLowerEndOfRange?: boolean } = {},
): OptionContractSnapshot | undefined {
  const candidates = calls.filter((contract) => isQualifyingLongCall(contract, settings));
  return candidates.sort((a, b) => {
    if (options.preferLowerEndOfRange) {
      const aLower = a.dte >= 365 && a.dte <= 730 ? 0 : 1;
      const bLower = b.dte >= 365 && b.dte <= 730 ? 0 : 1;
      if (aLower !== bLower) return aLower - bLower;
    }
    const dteDistance =
      Math.abs(a.dte - settings.longCall.preferredDte) -
      Math.abs(b.dte - settings.longCall.preferredDte);
    if (dteDistance !== 0) return dteDistance;
    return (
      Math.abs((a.delta ?? 0) - settings.longCall.delta.ideal) -
      Math.abs((b.delta ?? 0) - settings.longCall.delta.ideal)
    );
  })[0];
}
