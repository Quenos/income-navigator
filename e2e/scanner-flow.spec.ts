import { expect, test } from '@playwright/test';

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

test('run scan displays criteria match result from API', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /run scan/i }).click();
  await expect(page.getByText(/scanning/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'SPY' })).toBeVisible();
  await expect(page.getByText('Criteria Match', { exact: true })).toBeVisible();
  await expect(page.getByText(/Long call candidate/i)).toBeVisible();
});

test('partial provider failure does not block another ticker', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel(/ticker symbol/i).fill('bad');
  await page.getByRole('button', { name: /add ticker/i }).click();
  await page.getByRole('button', { name: /run scan/i }).click();
  await expect(page.getByRole('heading', { name: 'SPY' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'BAD' })).toBeVisible();
  await expect(page.getByText('Insufficient Data')).toBeVisible();
});

test('preset DPMCC universe scan submits one batched request and displays progress', async ({
  page,
}) => {
  const submittedBatches: string[][] = [];
  let releaseUniverseRequest!: () => void;
  const universeRequestCanFinish = new Promise<void>((resolve) => {
    releaseUniverseRequest = resolve;
  });

  await page.route('**/api/scan', async (route) => {
    const requestBody = route.request().postDataJSON() as { symbols: string[] };
    submittedBatches.push(requestBody.symbols);

    await universeRequestCanFinish;

    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        results: requestBody.symbols.map((symbol) => ({
          symbol,
          assetType: 'preferred ETF',
          primaryLabel: symbol === 'SPY' ? 'Pass' : 'Fail',
          trendRegime: symbol === 'SPY' ? 'Strong Uptrend' : 'Neutral / Sideways',
          currentPrice: 100,
          notes: [],
          reasons: symbol === 'SPY' ? [] : ['No qualifying short call candidate'],
          ruleOutcomes: [],
          scanTime: '2026-05-05T10:00:00.000Z',
          marketStatus: 'open',
        })),
      }),
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: /scan dpmcc etf universe/i }).click();

  await expect(page.getByText('Completed 0 of 41 tickers.')).toBeVisible();
  await expect(page.getByRole('button', { name: /scanning dpmcc etf universe/i })).toBeVisible();
  await expect.poll(() => submittedBatches.length).toBe(1);
  expect(submittedBatches[0]).toHaveLength(41);
  expect(submittedBatches[0]).toEqual(expect.arrayContaining(['SPY', 'QQQ', 'IBIT']));

  releaseUniverseRequest();

  await expect(page.getByText('Completed 41 of 41 tickers.')).toBeVisible();
  expect(submittedBatches).toHaveLength(1);
  await expect(page.getByText(/showing pass results only/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'SPY' })).toBeVisible();
  await expect(page.getByText('Criteria Match', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'QQQ' })).toHaveCount(0);
});
