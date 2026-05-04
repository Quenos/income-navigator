import { NextResponse } from 'next/server';
import { createMarketDataProvider } from '@/server/market-data/provider-factory';
import { scanMany } from '@/server/scanner/scan-service';

interface ScanRequestBody {
  symbols?: unknown;
}

function parseSymbols(body: ScanRequestBody): string[] {
  if (!Array.isArray(body.symbols)) throw new Error('symbols must be a non-empty array');
  const symbols = [
    ...new Set(
      body.symbols
        .filter((symbol): symbol is string => typeof symbol === 'string')
        .map((symbol) => symbol.trim().toUpperCase())
        .filter(Boolean),
    ),
  ];
  if (symbols.length === 0) throw new Error('symbols must be a non-empty array');
  return symbols;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ScanRequestBody;
    const symbols = parseSymbols(body);
    const provider = createMarketDataProvider();
    const results = await scanMany(symbols, provider);
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid scan request' },
      { status: 400 },
    );
  }
}
