import { expect, test } from '@playwright/test';
import { DPMCC_ETF_UNIVERSE } from '../src/features/scanner/dpmcc-universe';

const LIVE_PROVIDER_ENABLED = process.env.SCANNER_PROVIDER === 'tastytrade';

test.setTimeout(420_000);

test('ticker entry normalizes, deduplicates, and removes symbols', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel(/ticker symbol/i).fill('spy');
  await page.getByRole('button', { name: /add ticker/i }).click();
  await page.getByLabel(/ticker symbol/i).fill('qqq');
  await page.getByRole('button', { name: /add ticker/i }).click();
  await expect(page.getByLabel(/selected tickers/i).getByText('SPY')).toHaveCount(1);
  await expect(page.getByLabel(/selected tickers/i).getByText('QQQ')).toBeVisible();
  await page.getByRole('button', { name: /remove qqq/i }).click();
  await expect(page.getByLabel(/selected tickers/i).getByText('QQQ')).toHaveCount(0);
});

test('E2E uses the live TastyTrade provider when credentials are available', async ({ page }) => {
  test.skip(!LIVE_PROVIDER_ENABLED, 'Live TastyTrade credentials are not configured.');

  await page.goto('/');
  expect(process.env.SCANNER_PROVIDER).toBe('tastytrade');
  await expect(page.getByRole('heading', { name: 'Dynamic PMCC Scanner' })).toBeVisible();
});

test('run scan displays criteria match result from API', async ({ page }) => {
  test.skip(
    LIVE_PROVIDER_ENABLED,
    'Deterministic result assertions only run without live credentials.',
  );

  await page.goto('/');
  await page.getByRole('button', { name: /run scan/i }).click();
  await expect(page.getByText(/scanning/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'SPY' })).toBeVisible();
  await expect(page.getByText('Criteria Match', { exact: true })).toBeVisible();
  await expect(page.getByText(/Long call candidate/i)).toBeVisible();
});

test('partial provider failure does not block another ticker', async ({ page }) => {
  test.skip(
    LIVE_PROVIDER_ENABLED,
    'Deterministic provider-failure assertions only run without live credentials.',
  );

  await page.goto('/');
  await page.getByLabel(/ticker symbol/i).fill('bad');
  await page.getByRole('button', { name: /add ticker/i }).click();
  await page.getByRole('button', { name: /run scan/i }).click();
  await expect(page.getByRole('heading', { name: 'SPY' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'BAD' })).toBeVisible();
  await expect(page.getByText('Insufficient Data')).toBeVisible();
});

function scannerResult(symbol: string, primaryLabel: 'Pass' | 'Fail' = 'Fail') {
  return {
    symbol,
    assetType: 'preferred ETF',
    primaryLabel,
    trendRegime: primaryLabel === 'Pass' ? 'Strong Uptrend' : 'Neutral / Sideways',
    currentPrice: 100,
    notes: [],
    reasons: primaryLabel === 'Pass' ? [] : ['No qualifying short call candidate'],
    ruleOutcomes: [],
    scanTime: '2026-05-05T10:00:00.000Z',
    marketStatus: 'open',
  };
}

test('preset DPMCC universe scan submits one batched request and displays progress', async ({
  page,
}) => {
  const submittedBatches: string[][] = [];
  let releaseRequest!: () => void;
  const requestCanFinish = new Promise<void>((resolve) => {
    releaseRequest = resolve;
  });

  await page.route('**/api/scan', async (route) => {
    const requestBody = route.request().postDataJSON() as { symbols: string[] };
    submittedBatches.push(requestBody.symbols);

    await requestCanFinish;

    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        results: requestBody.symbols.map((symbol) =>
          scannerResult(symbol, symbol === 'SPY' ? 'Pass' : 'Fail'),
        ),
      }),
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: /scan dpmcc etf universe/i }).click();

  await expect(page.getByText('Scanning DPMCC ETF universe…')).toBeVisible();
  expect(submittedBatches).toEqual([[...DPMCC_ETF_UNIVERSE]]);

  releaseRequest();

  await expect(page.getByText('Completed 41 of 41 tickers.')).toBeVisible();
  expect(submittedBatches).toHaveLength(1);
  await expect(page.getByText(/showing pass results only/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'SPY' })).toBeVisible();
  await expect(page.getByText('Criteria Match', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'QQQ' })).toHaveCount(0);
});

test('preset DPMCC universe scan uses one real API request under default route limits', async ({
  page,
}) => {
  test.skip(
    LIVE_PROVIDER_ENABLED,
    'Deterministic route-limit assertions only run with the fake provider.',
  );

  const apiResponses: Array<{ status: number; url: string }> = [];
  page.on('response', (response) => {
    if (response.url().includes('/api/scan')) {
      apiResponses.push({ status: response.status(), url: response.url() });
    }
  });

  await page.goto('/');
  await page.getByRole('button', { name: /scan dpmcc etf universe/i }).click();

  await expect(page.getByText('Completed 41 of 41 tickers.')).toBeVisible({ timeout: 60_000 });
  expect(apiResponses).toHaveLength(1);
  expect(apiResponses[0]?.status).toBe(200);
  expect(apiResponses.some((response) => response.status === 429)).toBe(false);
  await expect(page.getByText(/showing pass results only/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'SPY' })).toBeVisible();
});

test('preset DPMCC universe scan reports a batched request failure', async ({ page }) => {
  const submittedBatches: string[][] = [];

  await page.route('**/api/scan', async (route) => {
    const requestBody = route.request().postDataJSON() as { symbols: string[] };
    submittedBatches.push(requestBody.symbols);
    await route.fulfill({
      status: 504,
      contentType: 'text/html',
      body: '<html> <h1>Gateway Timeout</h1></html>',
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: /scan dpmcc etf universe/i }).click();

  await expect(page.getByText(/Scan request failed \(504\)/)).toBeVisible();
  expect(submittedBatches).toEqual([[...DPMCC_ETF_UNIVERSE]]);
  await expect(page.getByRole('heading', { name: 'SPY' })).toHaveCount(0);
});
