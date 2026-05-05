'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Disclaimer } from './components/disclaimer';
import { ScanResultsTable } from './components/scan-results-table';
import { TickerChipList } from './components/ticker-chip-list';
import { TickerInput } from './components/ticker-input';
import { DPMCC_ETF_UNIVERSE } from './dpmcc-universe';
import { useScanner } from './use-scanner';

type ActiveScan = 'custom' | 'universe' | null;

export function ScannerPage() {
  const [symbols, setSymbols] = useState<string[]>(['SPY']);
  const [activeScan, setActiveScan] = useState<ActiveScan>(null);
  const { results, loading, error, passOnly, progress, scan } = useScanner();

  function addSymbol(symbol: string) {
    setSymbols((existing) => Array.from(new Set([...existing, symbol])));
  }

  async function runCustomScan() {
    setActiveScan('custom');
    await scan(symbols);
    setActiveScan(null);
  }

  async function runUniverseScan() {
    setActiveScan('universe');
    await scan([...DPMCC_ETF_UNIVERSE], { passOnly: true });
    setActiveScan(null);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-12">
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Income Navigator
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
          Dynamic PMCC Scanner
        </h1>
        <p className="mt-4 max-w-3xl text-lg text-slate-700">
          Read-only, rule-based screening for Dynamic PMCC criteria matches.
        </p>
      </section>

      <Disclaimer />

      <Card className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-950">Scanner input</h2>
        <TickerInput onAdd={addSymbol} />
        <TickerChipList
          symbols={symbols}
          onRemove={(symbol) =>
            setSymbols((existing) => existing.filter((item) => item !== symbol))
          }
        />
        <div className="flex flex-wrap gap-3">
          <Button disabled={symbols.length === 0 || loading} onClick={runCustomScan}>
            {activeScan === 'custom' ? 'Scanning…' : 'Run Scan'}
          </Button>
          <Button className="bg-emerald-700" disabled={loading} onClick={runUniverseScan}>
            {activeScan === 'universe' ? 'Scanning DPMCC ETF universe…' : 'Scan DPMCC ETF universe'}
          </Button>
        </div>
        <p className="text-sm text-slate-600">
          Universe scan checks {DPMCC_ETF_UNIVERSE.length} deduplicated liquid ETFs and displays
          pass results only. The universe is submitted in one batched request so public scan-route
          rate limits count it as one scan.
        </p>
        {progress && progress.total > 0 && (
          <p aria-live="polite" className="text-sm font-medium text-slate-700">
            {progress.currentSymbol
              ? `Scanning ${progress.currentSymbol} (${progress.completed + 1} of ${progress.total})…`
              : `Completed ${progress.completed} of ${progress.total} tickers.`}
          </p>
        )}
        {error && <p className="text-sm text-rose-700">{error}</p>}
      </Card>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Criteria Match Results</h2>
          {passOnly && (
            <p className="mt-1 text-sm text-slate-600">
              Showing pass results only from the DPMCC ETF universe scan.
            </p>
          )}
        </div>
        <ScanResultsTable results={results} />
      </section>
    </main>
  );
}
