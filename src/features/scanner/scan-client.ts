import type { ScannerResult } from '@/domain/scanner';

export interface ScanResponse {
  results: ScannerResult[];
}

function getScanApiPath() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  return `${basePath}/api/scan`;
}

function parseJsonBody(text: string): unknown {
  if (!text.trim()) return {};
  return JSON.parse(text) as unknown;
}

function scanFailureMessage(response: Response, body: unknown) {
  if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
    return body.error;
  }
  return `Scan request failed (${response.status})`;
}

export async function runScanner(symbols: string[]): Promise<ScanResponse> {
  const response = await fetch(getScanApiPath(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbols }),
  });

  const responseText = await response.text();
  let body: unknown;
  try {
    body = parseJsonBody(responseText);
  } catch {
    throw new Error(
      response.ok
        ? 'Scan API returned an invalid response'
        : `Scan request failed (${response.status})`,
    );
  }

  if (!response.ok) throw new Error(scanFailureMessage(response, body));
  return body as ScanResponse;
}
