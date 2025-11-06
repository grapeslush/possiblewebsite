import { test, expect } from '@playwright/test';

test.describe('help center experience', () => {
  test('lists curated help articles', async ({ page }) => {
    await page.goto('/help-center');

    await expect(page.getByRole('heading', { name: 'How can we help today?' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Selling basics' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Launch your first listing' })).toBeVisible();
  });

  test('renders markdown content safely', async ({ page }) => {
    await page.goto('/help-center/launch-your-first-listing');

    await expect(page.getByRole('heading', { name: 'Launch your first listing' })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: '1. Capture the essentials', level: 2 }),
    ).toBeVisible();
    await expect(page.getByText('Allow offers')).toBeVisible();
  });
});
