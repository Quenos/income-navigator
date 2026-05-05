'use client';

import { useState } from 'react';
import type { ScannerResult } from '@/domain/scanner';
import { runScanner } from './scan-client';

export interface ScanOptions {
  passOnly?: boolean;
  perTicker?: boolean;
}

export interface ScanProgress {
  completed: number;
  total: number;
  currentSymbol?: string;
}

function filterResults(results: ScannerResult[], passOnly: boolean) {
  return passOnly ? results.filter((result) => result.primaryLabel === 'Pass') : results;
}

function scanErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Scan failed';
}

function summarizeTickerFailures(failures: string[]) {
  const examples = failures.slice(0, 3).join('; ');
  const suffix = failures.length > 3 ? '; …' : '';
  return `Some tickers could not be scanned (${failures.length}): ${examples}${suffix}`;
}

export function useScanner() {
  const [results, setResults] = useState<ScannerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passOnly, setPassOnly] = useState(false);
  const [progress, setProgress] = useState<ScanProgress | null>(null);

  async function scan(symbols: string[], options: ScanOptions = {}) {
    const uniqueSymbols = Array.from(
      new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)),
    );

    setLoading(true);
    setError(null);
    setPassOnly(Boolean(options.passOnly));
    setResults([]);
    setProgress({ completed: 0, total: uniqueSymbols.length });

    try {
      if (options.perTicker) {
        const failures: string[] = [];
        for (const [index, symbol] of uniqueSymbols.entries()) {
          setProgress({ completed: index, total: uniqueSymbols.length, currentSymbol: symbol });
          try {
            const response = await runScanner([symbol]);
            const nextResults = filterResults(response.results, Boolean(options.passOnly));
            setResults((existing) => [...existing, ...nextResults]);
          } catch (err) {
            failures.push(`${symbol}: ${scanErrorMessage(err)}`);
          }
          setProgress({ completed: index + 1, total: uniqueSymbols.length });
        }
        if (failures.length > 0) setError(summarizeTickerFailures(failures));
        return;
      }

      const response = await runScanner(uniqueSymbols);
      setResults(filterResults(response.results, Boolean(options.passOnly)));
      setProgress({ completed: uniqueSymbols.length, total: uniqueSymbols.length });
    } catch (err) {
      setError(scanErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return { results, loading, error, passOnly, progress, scan };
}
