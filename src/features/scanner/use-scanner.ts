'use client';

import { useState } from 'react';
import type { ScannerResult } from '@/domain/scanner';
import { runScanner } from './scan-client';

export interface ScanOptions {
  passOnly?: boolean;
}

export function useScanner() {
  const [results, setResults] = useState<ScannerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passOnly, setPassOnly] = useState(false);

  async function scan(symbols: string[], options: ScanOptions = {}) {
    setLoading(true);
    setError(null);
    setPassOnly(Boolean(options.passOnly));
    try {
      const response = await runScanner(symbols);
      const nextResults = options.passOnly
        ? response.results.filter((result) => result.primaryLabel === 'Pass')
        : response.results;
      setResults(nextResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setLoading(false);
    }
  }

  return { results, loading, error, passOnly, scan };
}
