import type { ScannerResult } from '@/domain/scanner';

export function DataFreshness({ result }: { result: ScannerResult }) {
  return (
    <p className="text-xs text-slate-500">
      Quote {result.quoteTime ?? 'n/a'} · Options {result.optionChainTime ?? 'n/a'} · Candles{' '}
      {result.candleDataTime ?? 'n/a'} · Market {result.marketStatus}
    </p>
  );
}
