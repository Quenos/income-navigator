import type { OptionCandidateEvidence } from '@/domain/scanner';

function formatCurrency(value?: number): string {
  return value === undefined ? 'n/a' : value.toFixed(2);
}

function formatPercent(value?: number): string {
  return value === undefined || Number.isNaN(value) ? 'n/a' : `${(value * 100).toFixed(2)}%`;
}

export function OptionCandidateCard({
  title,
  candidate,
}: {
  title: string;
  candidate?: OptionCandidateEvidence;
}) {
  if (!candidate) return null;
  return (
    <div className="rounded-xl border border-slate-200 p-3 text-sm">
      <h4 className="font-semibold text-slate-900">{title}</h4>
      <p className="mt-1 text-slate-600">
        {candidate.symbol} · {candidate.expiration} · {candidate.dte} DTE
      </p>
      <p className="text-slate-600">
        Strike {candidate.strike} · Delta {candidate.delta?.toFixed(2) ?? 'n/a'} · Bid{' '}
        {formatCurrency(candidate.bid)} / Ask {formatCurrency(candidate.ask)} · Mid{' '}
        {formatCurrency(candidate.midPrice)}
      </p>
      <dl className="mt-2 grid grid-cols-2 gap-2 text-slate-600">
        <div>
          <dt className="font-medium text-slate-700">Intrinsic value</dt>
          <dd>{formatCurrency(candidate.intrinsicValue)}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-700">Bid extrinsic</dt>
          <dd>{formatCurrency(candidate.bidExtrinsicValue)}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-700">Raw extrinsic %</dt>
          <dd>{formatPercent(candidate.rawExtrinsicPercent)}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-700">Weeklyized extrinsic</dt>
          <dd>{formatPercent(candidate.weeklyizedExtrinsic)}</dd>
        </div>
      </dl>
    </div>
  );
}
