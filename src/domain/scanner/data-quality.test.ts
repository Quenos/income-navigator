import { describe, expect, it } from 'vitest';
import { option, snapshot, technicals } from './fixtures/builders';
import { evaluateDataQuality, mapProviderErrorCode } from './data-quality';

const now = new Date('2026-05-04T20:05:00.000Z');

describe('data quality and error mapping', () => {
  it('detects missing required market data', () => {
    const issues = evaluateDataQuality(
      snapshot({
        technicals: technicals({ candleDataTime: undefined, daily200Sma: undefined }),
        calls: [],
      }),
      now,
    ).map((issue) => issue.code);
    expect(issues).toContain('missing-candles');
    expect(issues).toContain('missing-daily-200sma');
    expect(issues).toContain('missing-option-chain');
  });

  it('detects missing option delta and bid ask', () => {
    const issues = evaluateDataQuality(
      snapshot({ calls: [option({ delta: undefined, bid: undefined })] }),
      now,
    ).map((issue) => issue.message);
    expect(issues).toContain('Option delta is required');
    expect(issues).toContain('Option quote is incomplete');
  });

  it('flags stale quotes during market hours but permits after-hours last available data', () => {
    expect(
      evaluateDataQuality(snapshot({ quoteTime: '2026-05-04T19:00:00.000Z' }), now).map(
        (issue) => issue.message,
      ),
    ).toContain('Required quote data is stale');
    expect(
      evaluateDataQuality(
        snapshot({
          marketStatus: 'closed',
          isLastAvailableData: true,
          quoteTime: '2026-05-04T19:00:00.000Z',
        }),
        now,
      ).map((issue) => issue.code),
    ).not.toContain('stale-quote');
  });

  it('maps provider errors to user-facing reasons', () => {
    expect(mapProviderErrorCode('ticker-not-found').message).toBe('Ticker not found');
    expect(mapProviderErrorCode('options-unavailable').message).toBe(
      'Options-chain data unavailable',
    );
    expect(mapProviderErrorCode('provider-unavailable').message).toBe(
      'Market data provider unavailable',
    );
  });
});
