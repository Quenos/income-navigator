import type { ScannerResult } from '@/domain/scanner';
import { DPMCC_ETF_UNIVERSE } from '@/features/scanner/dpmcc-universe';
import { MAX_SCAN_SYMBOLS } from '@/server/scanner/limits';

export interface CliWritable {
  write(chunk: string): void;
}

export interface IncomeNavigatorCliDeps {
  stdout: CliWritable;
  stderr: CliWritable;
  scanTicker(symbol: string): Promise<ScannerResult>;
}

interface ScanOptions {
  symbols: string[];
  passOnly: boolean;
  json: boolean;
}

const USAGE = `Income Navigator CLI

Usage:
  income-navigator scan <ticker...> [--pass-only] [--json]
  income-navigator scan --universe dpmcc [--pass-only] [--json]

Examples:
  income-navigator scan SPY QQQ
  income-navigator scan --universe dpmcc --pass-only
  SCANNER_PROVIDER=tastytrade income-navigator scan SPY --json
`;

function normalizeSymbol(symbol: string): string | undefined {
  const normalized = symbol.trim().toUpperCase();
  return /^[A-Z][A-Z0-9.-]{0,9}$/.test(normalized) ? normalized : undefined;
}

function parseScanArgs(args: readonly string[]): ScanOptions {
  const symbols: string[] = [];
  let passOnly = false;
  let json = false;
  let universe: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--pass-only') {
      passOnly = true;
      continue;
    }
    if (arg === '--json') {
      json = true;
      continue;
    }
    if (arg === '--universe') {
      universe = args[index + 1];
      index += 1;
      continue;
    }
    if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`);
    }
    const symbol = normalizeSymbol(arg);
    if (symbol) symbols.push(symbol);
  }

  if (universe) {
    if (universe !== 'dpmcc') throw new Error(`Unsupported universe: ${universe}`);
    symbols.push(...DPMCC_ETF_UNIVERSE);
  }

  const uniqueSymbols = [...new Set(symbols)];
  if (uniqueSymbols.length === 0) {
    throw new Error('Provide at least one ticker or --universe dpmcc.');
  }
  if (uniqueSymbols.length > MAX_SCAN_SYMBOLS) {
    throw new Error(`Provide ${MAX_SCAN_SYMBOLS} or fewer unique tickers.`);
  }

  return { symbols: uniqueSymbols, passOnly, json };
}

function formatPrice(price: number | undefined): string {
  return typeof price === 'number' ? price.toFixed(2) : '-';
}

function formatRows(results: readonly ScannerResult[]): string {
  const rows = [
    ['Symbol', 'Result', 'Trend', 'Price', 'Reasons'],
    ...results.map((result) => [
      result.symbol,
      result.primaryLabel,
      result.trendRegime ?? '-',
      formatPrice(result.currentPrice),
      result.reasons.length > 0 ? result.reasons.join('; ') : '-',
    ]),
  ];
  const widths = rows[0].map((_, columnIndex) =>
    Math.max(...rows.map((row) => row[columnIndex].length)),
  );
  return `${rows
    .map((row) => row.map((cell, columnIndex) => cell.padEnd(widths[columnIndex])).join('  '))
    .join('\n')}\n`;
}

async function runScan(options: ScanOptions, deps: IncomeNavigatorCliDeps): Promise<number> {
  const results: ScannerResult[] = [];

  for (const [index, symbol] of options.symbols.entries()) {
    deps.stderr.write(`Scanning ${symbol} (${index + 1} of ${options.symbols.length})…\n`);
    results.push(await deps.scanTicker(symbol));
  }
  deps.stderr.write(`Completed ${results.length} of ${options.symbols.length} tickers.\n`);

  const visibleResults = options.passOnly
    ? results.filter((result) => result.primaryLabel === 'Pass')
    : results;

  if (options.json) {
    deps.stdout.write(`${JSON.stringify(visibleResults, null, 2)}\n`);
    return 0;
  }

  if (visibleResults.length === 0) {
    deps.stdout.write(options.passOnly ? 'No pass results.\n' : 'No results.\n');
    return 0;
  }

  deps.stdout.write(formatRows(visibleResults));
  return 0;
}

export async function runIncomeNavigatorCli(
  argv: readonly string[],
  deps: IncomeNavigatorCliDeps,
): Promise<number> {
  const [command, ...args] = argv;

  if (!command || command === '--help' || command === '-h') {
    deps.stdout.write(USAGE);
    return 0;
  }

  if (command !== 'scan') {
    deps.stderr.write(`Unknown command: ${command}\n\n${USAGE}`);
    return 1;
  }

  try {
    return await runScan(parseScanArgs(args), deps);
  } catch (error) {
    deps.stderr.write(`${error instanceof Error ? error.message : 'CLI error'}\n\n${USAGE}`);
    return 1;
  }
}
