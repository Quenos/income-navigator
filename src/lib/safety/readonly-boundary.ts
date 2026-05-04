import { forbiddenMarketDataProviderMethods } from '@/server/market-data/market-data-provider';

export function findForbiddenReadOnlySurfaceMethods(value: object): string[] {
  return forbiddenMarketDataProviderMethods.filter((method) => method in value);
}

export function assertReadOnlyProviderSurface(value: object): void {
  const forbidden = findForbiddenReadOnlySurfaceMethods(value);
  if (forbidden.length > 0)
    throw new Error(`Forbidden provider methods exposed: ${forbidden.join(', ')}`);
}
