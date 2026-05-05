import { expect, test } from '@playwright/test';

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

test('preset DPMCC universe scan runs tickers individually and displays current progress', async ({
  page,
}) => {
  const submittedBatches: string[][] = [];
  let releaseFirstRequest!: () => void;
  const firstRequestCanFinish = new Promise<void>((resolve) => {
    releaseFirstRequest = resolve;
  });

  await page.route('**/api/scan', async (route) => {
    const requestBody = route.request().postDataJSON() as { symbols: string[] };
    submittedBatches.push(requestBody.symbols);
    const symbol = requestBody.symbols[0] ?? 'UNKNOWN';

    if (submittedBatches.length === 1) await firstRequestCanFinish;

    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        results: [scannerResult(symbol, symbol === 'SPY' ? 'Pass' : 'Fail')],
      }),
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: /scan dpmcc etf universe/i }).click();

  await expect(page.getByText('Scanning SPY (1 of 41)…')).toBeVisible();
  expect(submittedBatches).toEqual([['SPY']]);

  releaseFirstRequest();

  await expect(page.getByText('Completed 41 of 41 tickers.')).toBeVisible();
  expect(submittedBatches).toHaveLength(41);
  expect(submittedBatches.every((batch) => batch.length === 1)).toBe(true);
  expect(submittedBatches.flat()).toEqual(expect.arrayContaining(['SPY', 'QQQ', 'IBIT']));
  await expect(page.getByText(/showing pass results only/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'SPY' })).toBeVisible();
  await expect(page.getByText('Criteria Match', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'QQQ' })).toHaveCount(0);
});

test('preset DPMCC universe scan continues when one ticker returns non-JSON HTML', async ({
  page,
}) => {
  const submittedBatches: string[][] = [];

  await page.route('**/api/scan', async (route) => {
    const requestBody = route.request().postDataJSON() as { symbols: string[] };
    submittedBatches.push(requestBody.symbols);
    const symbol = requestBody.symbols[0] ?? 'UNKNOWN';

    if (symbol === 'SPY') {
      await route.fulfill({
        status: 504,
        contentType: 'text/html',
        body: '<html> <h1>Gateway Timeout</h1></html>',
      });
      return;
    }

    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        results: [scannerResult(symbol, symbol === 'QQQ' ? 'Pass' : 'Fail')],
      }),
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: /scan dpmcc etf universe/i }).click();

  await expect(page.getByText('Completed 41 of 41 tickers.')).toBeVisible();
  expect(submittedBatches).toHaveLength(41);
  await expect(
    page.getByText(/Some tickers could not be scanned \(1\): SPY: Scan request failed \(504\)/),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'QQQ' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'SPY' })).toHaveCount(0);
});
