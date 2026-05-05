import { NextResponse } from 'next/server';
import { parseScanRequestBody, type NormalizedScanRequest } from '@/server/api/scan-schema';
import { createMarketDataProvider } from '@/server/market-data/provider-factory';
import { scanMany } from '@/server/scanner/scan-service';

const DEFAULT_MAX_SCAN_BODY_BYTES = 32_768;
const DEFAULT_SCAN_MAX_ACTIVE_REQUESTS = 2;
const DEFAULT_SCAN_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_SCAN_MAX_REQUESTS_PER_WINDOW = 20;

let activeScanRequests = 0;
const scanRequestWindows = new Map<string, { count: number; resetAt: number }>();

function positiveIntegerFromEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function scanClientKey(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwardedFor || request.headers.get('x-real-ip') || 'anonymous';
}

function contentLengthExceedsLimit(request: Request): boolean {
  const contentLength = request.headers.get('content-length');
  if (!contentLength) return false;
  const parsed = Number(contentLength);
  return (
    Number.isFinite(parsed) &&
    parsed > positiveIntegerFromEnv('SCAN_MAX_BODY_BYTES', DEFAULT_MAX_SCAN_BODY_BYTES)
  );
}

function tryAcquireScanRequestSlot(request: Request): boolean {
  const maxActive = positiveIntegerFromEnv(
    'SCAN_MAX_ACTIVE_REQUESTS',
    DEFAULT_SCAN_MAX_ACTIVE_REQUESTS,
  );
  if (activeScanRequests >= maxActive) return false;

  const now = Date.now();
  const key = scanClientKey(request);
  const windowMs = positiveIntegerFromEnv(
    'SCAN_RATE_LIMIT_WINDOW_MS',
    DEFAULT_SCAN_RATE_LIMIT_WINDOW_MS,
  );
  const maxRequests = positiveIntegerFromEnv(
    'SCAN_MAX_REQUESTS_PER_WINDOW',
    DEFAULT_SCAN_MAX_REQUESTS_PER_WINDOW,
  );
  const current = scanRequestWindows.get(key);
  const window = current && current.resetAt > now ? current : { count: 0, resetAt: now + windowMs };

  if (window.count >= maxRequests) return false;
  window.count += 1;
  scanRequestWindows.set(key, window);
  activeScanRequests += 1;
  return true;
}

function releaseScanRequestSlot() {
  activeScanRequests = Math.max(0, activeScanRequests - 1);
}

export function resetScanRequestGateForTests() {
  activeScanRequests = 0;
  scanRequestWindows.clear();
}

export async function POST(request: Request) {
  if (contentLengthExceedsLimit(request)) {
    return NextResponse.json({ error: 'Scan request is too large' }, { status: 413 });
  }

  let parsed: NormalizedScanRequest;
  try {
    parsed = parseScanRequestBody(await request.json());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid scan request' },
      { status: 400 },
    );
  }

  if (!tryAcquireScanRequestSlot(request)) {
    return NextResponse.json({ error: 'Scan request limit exceeded' }, { status: 429 });
  }

  try {
    const provider = createMarketDataProvider();
    const results = await scanMany(parsed.symbols, provider, parsed.settings);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: 'Scan request failed' }, { status: 500 });
  } finally {
    releaseScanRequestSlot();
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Dynamic PMCC scanner API accepts POST requests.',
  });
}
