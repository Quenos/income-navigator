import { expect, test } from '@playwright/test';

test('home page presents scanner as read-only rule-based screening', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/rule-based screening/i)).toBeVisible();
  await expect(page.getByText(/not financial advice/i)).toBeVisible();
  await expect(page.getByText(/recommended trade/i)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^buy$/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^sell$/i })).toHaveCount(0);
});
