import type { PrimaryResultLabel, ResultCondition } from './types';

export const allowedPrimaryResultLabels: PrimaryResultLabel[] = [
  'Pass',
  'Watch',
  'Fail',
  'Insufficient Data',
  'Manual Review',
];

const priority: Array<{ condition: ResultCondition; label: PrimaryResultLabel }> = [
  { condition: 'insufficient-data', label: 'Insufficient Data' },
  { condition: 'fail', label: 'Fail' },
  { condition: 'manual-review', label: 'Manual Review' },
  { condition: 'watch', label: 'Watch' },
  { condition: 'pass', label: 'Pass' },
];

export function resolvePrimaryResult(conditions: ResultCondition[]): PrimaryResultLabel {
  const conditionSet = new Set(conditions);
  return priority.find((entry) => conditionSet.has(entry.condition))?.label ?? 'Insufficient Data';
}
