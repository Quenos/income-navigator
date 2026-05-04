'use client';

import { useState } from 'react';
import type { ScannerResult } from '@/domain/scanner';
import { runScanner } from './scan-client';

export function useScanner() {
  const [results, setResults] = useState<ScannerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function scan(symbols: string[]) {
    setLoading(true);
    setError(null);
    try {
      const response = await runScanner(symbols);
      setResults(response.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setLoading(false);
    }
  }

  return { results, loading, error, scan };
}
