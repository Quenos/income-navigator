import type { ScannerResult } from '@/domain/scanner';
import { ResultBadge } from './result-badge';
import { ScanResultDetail } from './scan-result-detail';

export function ScanResultsTable({ results }: { results: ScannerResult[] }) {
  if (results.length === 0) return null;
  return (
    <div className="space-y-4" aria-label="Scan results">
      {results.map((result) => (
        <article
          key={result.symbol}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-slate-950">{result.symbol}</h3>
              <p className="text-sm text-slate-600">
                {result.trendRegime ?? 'Trend unavailable'} ·{' '}
                {result.currentPrice ?? 'Price unavailable'}
              </p>
            </div>
            <ResultBadge label={result.primaryLabel} />
          </div>
          {(result.notes.length > 0 || result.reasons.length > 0) && (
            <div className="mt-3 grid gap-1 text-sm text-slate-700">
              {result.notes.map((note) => (
                <p key={note}>Note: {note}</p>
              ))}
              {result.reasons.map((reason) => (
                <p key={reason}>Reason: {reason}</p>
              ))}
            </div>
          )}
          <div className="mt-4">
            <ScanResultDetail result={result} />
          </div>
        </article>
      ))}
    </div>
  );
}
