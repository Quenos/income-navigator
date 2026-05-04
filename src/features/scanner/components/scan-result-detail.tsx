import type { ScannerResult } from '@/domain/scanner';
import { DataFreshness } from './data-freshness';
import { OptionCandidateCard } from './option-candidate-card';

export function ScanResultDetail({ result }: { result: ScannerResult }) {
  return (
    <div className="space-y-3 rounded-xl bg-slate-50 p-4">
      <DataFreshness result={result} />
      <div className="grid gap-3 md:grid-cols-2">
        <OptionCandidateCard title="Long call candidate" candidate={result.selectedLongCall} />
        <OptionCandidateCard title="Short call candidate" candidate={result.selectedShortCall} />
      </div>
      <ul className="grid gap-1 text-sm text-slate-700">
        {result.ruleOutcomes.map((rule) => (
          <li key={rule.id}>
            <strong>{rule.label}:</strong> {rule.condition} — {rule.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
