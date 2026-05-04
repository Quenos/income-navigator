import { describe, expect, it } from 'vitest';
import { evaluateScannerSnapshot } from './decision-engine';
import { scannerFixtures } from './fixtures';

describe('decision engine fixture acceptance coverage', () => {
  it.each([
    ['clear_pass_strong_uptrend', 'Pass'],
    ['watch_rsi_not_ideal', 'Watch'],
    ['watch_no_pullback', 'Watch'],
    ['watch_neutral_sideways', 'Watch'],
    ['watch_extrinsic_between_060_and_0749', 'Watch'],
    ['fail_weekly_trend', 'Fail'],
    ['fail_downtrend', 'Fail'],
    ['fail_no_qualifying_leaps', 'Fail'],
    ['fail_no_qualifying_short_call', 'Fail'],
    ['fail_extrinsic_below_060', 'Fail'],
    ['fail_confirmed_non_optionable', 'Fail'],
    ['insufficient_missing_greeks', 'Insufficient Data'],
    ['insufficient_missing_bid_ask', 'Insufficient Data'],
    ['insufficient_stale_quote', 'Insufficient Data'],
    ['manual_review_unclear_trend', 'Manual Review'],
  ] as const)('%s resolves to %s', (fixtureId, label) => {
    expect(evaluateScannerSnapshot(scannerFixtures[fixtureId]).primaryLabel).toBe(label);
  });

  it('labels after-hours last available data', () => {
    expect(
      evaluateScannerSnapshot(scannerFixtures.after_hours_last_available_data_labeled).notes,
    ).toContain('After-hours: showing last available market data');
  });
});
