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

test('preset DPMCC universe scan sends all tickers and displays only pass results', async ({
  page,
}) => {
  let submittedSymbols: string[] = [];
  await page.route('**/api/scan', async (route) => {
    const requestBody = route.request().postDataJSON() as { symbols: string[] };
    submittedSymbols = requestBody.symbols;
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        results: [
          {
            symbol: 'SPY',
            assetType: 'preferred ETF',
            primaryLabel: 'Pass',
            trendRegime: 'Strong Uptrend',
            currentPrice: 100,
            notes: [],
            reasons: [],
            ruleOutcomes: [],
            scanTime: '2026-05-05T10:00:00.000Z',
            marketStatus: 'open',
          },
          {
            symbol: 'QQQ',
            assetType: 'preferred ETF',
            primaryLabel: 'Fail',
            trendRegime: 'Neutral / Sideways',
            currentPrice: 100,
            notes: [],
            reasons: ['No qualifying short call candidate'],
            ruleOutcomes: [],
            scanTime: '2026-05-05T10:00:00.000Z',
            marketStatus: 'open',
          },
        ],
      }),
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: /scan dpmcc etf universe/i }).click();

  expect(submittedSymbols).toHaveLength(41);
  expect(submittedSymbols).toEqual(expect.arrayContaining(['SPY', 'QQQ', 'IBIT']));
  await expect(page.getByText(/showing pass results only/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'SPY' })).toBeVisible();
  await expect(page.getByText('Criteria Match', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'QQQ' })).toHaveCount(0);
});
