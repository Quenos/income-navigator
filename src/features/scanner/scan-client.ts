import type { ScannerResult } from '@/domain/scanner';

export interface ScanResponse {
  results: ScannerResult[];
}

function getScanApiPath() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  return `${basePath}/api/scan`;
}

export async function runScanner(symbols: string[]): Promise<ScanResponse> {
  const response = await fetch(getScanApiPath(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbols }),
  });
  const body = (await response.json()) as ScanResponse | { error: string };
  if (!response.ok) throw new Error('error' in body ? body.error : 'Scan request failed');
  return body as ScanResponse;
}
