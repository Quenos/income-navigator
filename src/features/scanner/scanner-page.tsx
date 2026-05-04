'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Disclaimer } from './components/disclaimer';
import { ScanResultsTable } from './components/scan-results-table';
import { TickerChipList } from './components/ticker-chip-list';
import { TickerInput } from './components/ticker-input';
import { useScanner } from './use-scanner';

export function ScannerPage() {
  const [symbols, setSymbols] = useState<string[]>(['SPY']);
  const { results, loading, error, scan } = useScanner();

  function addSymbol(symbol: string) {
    setSymbols((existing) => Array.from(new Set([...existing, symbol])));
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
        <Button disabled={symbols.length === 0 || loading} onClick={() => scan(symbols)}>
          {loading ? 'Scanning…' : 'Run Scan'}
        </Button>
        {error && <p className="text-sm text-rose-700">{error}</p>}
      </Card>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-950">Criteria Match Results</h2>
        <ScanResultsTable results={results} />
      </section>
    </main>
  );
}
