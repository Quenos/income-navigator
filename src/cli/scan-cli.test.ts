import { describe, expect, it } from 'vitest';
import type { ScannerResult } from '@/domain/scanner';
import { DPMCC_ETF_UNIVERSE } from '@/features/scanner/dpmcc-universe';
import { runIncomeNavigatorCli } from './scan-cli';

function resultFor(symbol: string, primaryLabel: ScannerResult['primaryLabel']): ScannerResult {
  return {
    symbol,
    assetType: 'ETF',
    primaryLabel,
    trendRegime: 'Strong Uptrend',
    currentPrice: 123.45,
    notes: [],
    reasons: primaryLabel === 'Pass' ? [] : ['Example blocker'],
    ruleOutcomes: [],
    scanTime: '2026-05-05T10:00:00.000Z',
    marketStatus: 'open',
  };
}

function createWritableBuffer() {
  let text = '';
  return {
    write(chunk: string) {
      text += chunk;
    },
    text() {
      return text;
    },
  };
}

describe('runIncomeNavigatorCli', () => {
  it('scans explicit ticker symbols sequentially and reports current progress', async () => {
    const calls: string[] = [];
    const stdout = createWritableBuffer();
    const stderr = createWritableBuffer();

    const exitCode = await runIncomeNavigatorCli(['scan', 'spy', 'qqq'], {
      stdout,
      stderr,
      scanTicker: async (symbol) => {
        calls.push(symbol);
        return resultFor(symbol, symbol === 'SPY' ? 'Pass' : 'Fail');
      },
    });

    expect(exitCode).toBe(0);
    expect(calls).toEqual(['SPY', 'QQQ']);
    expect(stderr.text()).toContain('Scanning SPY (1 of 2)…');
    expect(stderr.text()).toContain('Scanning QQQ (2 of 2)…');
    expect(stderr.text()).toContain('Completed 2 of 2 tickers.');
    expect(stdout.text()).toContain('SPY');
    expect(stdout.text()).toContain('Pass');
    expect(stdout.text()).toContain('QQQ');
    expect(stdout.text()).toContain('Fail');
  });

  it('supports a DPMCC universe scan with pass-only output', async () => {
    const calls: string[] = [];
    const stdout = createWritableBuffer();
    const stderr = createWritableBuffer();

    const exitCode = await runIncomeNavigatorCli(['scan', '--universe', 'dpmcc', '--pass-only'], {
      stdout,
      stderr,
      scanTicker: async (symbol) => {
        calls.push(symbol);
        return resultFor(symbol, symbol === 'SPY' ? 'Pass' : 'Fail');
      },
    });

    expect(exitCode).toBe(0);
    expect(calls).toEqual([...DPMCC_ETF_UNIVERSE]);
    expect(stderr.text()).toContain(
      `Scanning ${DPMCC_ETF_UNIVERSE[0]} (1 of ${DPMCC_ETF_UNIVERSE.length})…`,
    );
    expect(stderr.text()).toContain(
      `Completed ${DPMCC_ETF_UNIVERSE.length} of ${DPMCC_ETF_UNIVERSE.length} tickers.`,
    );
    expect(stdout.text()).toContain('SPY');
    expect(stdout.text()).not.toContain('QQQ');
  });

  it('can emit machine-readable JSON', async () => {
    const stdout = createWritableBuffer();
    const stderr = createWritableBuffer();

    const exitCode = await runIncomeNavigatorCli(['scan', 'spy', '--json'], {
      stdout,
      stderr,
      scanTicker: async (symbol) => resultFor(symbol, 'Pass'),
    });

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.text())).toEqual([expect.objectContaining({ symbol: 'SPY' })]);
  });

  it('returns a usage error when no scan symbols are provided', async () => {
    const stdout = createWritableBuffer();
    const stderr = createWritableBuffer();

    const exitCode = await runIncomeNavigatorCli(['scan'], {
      stdout,
      stderr,
      scanTicker: async (symbol) => resultFor(symbol, 'Pass'),
    });

    expect(exitCode).toBe(1);
    expect(stderr.text()).toContain('Provide at least one ticker or --universe dpmcc.');
  });
});
