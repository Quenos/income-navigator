#!/usr/bin/env tsx
import { createMarketDataProvider } from '@/server/market-data/provider-factory';
import { scanTicker } from '@/server/scanner/scan-service';
import { runIncomeNavigatorCli } from './scan-cli';

const provider = createMarketDataProvider();
const exitCode = await runIncomeNavigatorCli(process.argv.slice(2), {
  stdout: process.stdout,
  stderr: process.stderr,
  scanTicker: (symbol) => scanTicker(symbol, provider),
});

process.exitCode = exitCode;
