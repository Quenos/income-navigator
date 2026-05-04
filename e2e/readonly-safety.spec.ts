import { expect, test } from '@playwright/test';

test('scanner UI exposes no trading controls or recommendation labels', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /^buy$/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^sell$/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /submit order/i })).toHaveCount(0);
  await expect(page.getByText(/recommended trade/i)).toHaveCount(0);
  await expect(page.getByText(/route order/i)).toHaveCount(0);
});
