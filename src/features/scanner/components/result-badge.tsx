import { Badge } from '@/components/ui/badge';
import type { PrimaryResultLabel } from '@/domain/scanner';

const styles: Record<PrimaryResultLabel, string> = {
  Pass: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  Watch: 'border-amber-200 bg-amber-50 text-amber-800',
  Fail: 'border-rose-200 bg-rose-50 text-rose-800',
  'Insufficient Data': 'border-slate-200 bg-slate-50 text-slate-700',
  'Manual Review': 'border-violet-200 bg-violet-50 text-violet-800',
};

export function ResultBadge({ label }: { label: PrimaryResultLabel }) {
  return <Badge className={styles[label]}>{label === 'Pass' ? 'Criteria Match' : label}</Badge>;
}
