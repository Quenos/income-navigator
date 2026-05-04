import { NextResponse } from 'next/server';
import { parseScanRequestBody } from '@/server/api/scan-schema';
import { createMarketDataProvider } from '@/server/market-data/provider-factory';
import { scanMany } from '@/server/scanner/scan-service';

export async function POST(request: Request) {
  try {
    const parsed = parseScanRequestBody(await request.json());
    const provider = createMarketDataProvider();
    const results = await scanMany(parsed.symbols, provider, parsed.settings);
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid scan request' },
      { status: 400 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Dynamic PMCC scanner API accepts POST requests.',
  });
}
