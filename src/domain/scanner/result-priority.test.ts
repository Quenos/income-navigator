import { describe, expect, it } from 'vitest';
import { allowedPrimaryResultLabels, resolvePrimaryResult } from './result-priority';

describe('scanner result priority', () => {
  it('allows exactly the five primary labels', () => {
    expect(allowedPrimaryResultLabels).toEqual([
      'Pass',
      'Watch',
      'Fail',
      'Insufficient Data',
      'Manual Review',
    ]);
  });

  it('resolves Insufficient Data above otherwise passing outcomes', () => {
    expect(resolvePrimaryResult(['pass', 'insufficient-data'])).toBe('Insufficient Data');
  });

  it('resolves Fail above Watch and Manual Review', () => {
    expect(resolvePrimaryResult(['watch', 'manual-review', 'fail'])).toBe('Fail');
  });

  it('returns Pass only when no higher priority condition exists', () => {
    expect(resolvePrimaryResult(['pass'])).toBe('Pass');
  });
});
