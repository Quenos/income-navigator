import { describe, expect, it } from 'vitest';
import { scannerFixtures } from './index';

describe('scanner fixture registry', () => {
  it('contains all required FR-037 deterministic scenarios', () => {
    expect(Object.keys(scannerFixtures).sort()).toEqual([
      'after_hours_last_available_data_labeled',
      'clear_pass_strong_uptrend',
      'fail_confirmed_non_optionable',
      'fail_downtrend',
      'fail_extrinsic_below_060',
      'fail_no_qualifying_leaps',
      'fail_no_qualifying_short_call',
      'fail_weekly_trend',
      'insufficient_missing_bid_ask',
      'insufficient_missing_greeks',
      'insufficient_provider_unavailable',
      'insufficient_stale_quote',
      'long_candidate_ranking_closest_365',
      'long_candidate_ranking_lower_end_range',
      'manual_review_unclear_trend',
      'short_candidate_ranking_delta_midpoint',
      'watch_extrinsic_between_060_and_0749',
      'watch_neutral_sideways',
      'watch_no_pullback',
      'watch_rsi_not_ideal',
    ]);
  });
});
