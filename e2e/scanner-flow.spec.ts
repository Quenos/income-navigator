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
  await expect(page.getByText('Criteria Match')).toBeVisible();
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
