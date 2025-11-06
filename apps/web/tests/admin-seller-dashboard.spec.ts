import { test, expect } from '@playwright/test';
import { Buffer } from 'node:buffer';

test.describe('seller dashboards and management tooling', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      document.cookie = 'x-playwright-role=SELLER; path=/';
      document.cookie = 'x-playwright-user=test-seller; path=/';
    });
  });

  test('renders KPIs and AI suggestions on seller dashboard', async ({ page }) => {
    await page.goto('/dashboard/seller');
    await expect(page.getByTestId('seller-dashboard')).toBeVisible();
    await expect(page.getByText('Gross merchandise value')).toBeVisible();
    await expect(page.getByTestId('suggestion-bundles')).toBeVisible();
    await expect(page.getByTestId('payout-total')).toContainText('$');
  });

  test('supports bulk actions and csv import for listings', async ({ page }) => {
    await page.goto('/dashboard/seller/listings');
    await page.getByTestId('select-all').check();
    await page.selectOption('[data-testid="bulk-action-select"]', 'pause');
    await page.getByTestId('bulk-apply').click();
    await expect(page.getByTestId('table-message')).toHaveText(/Paused 4 listings/);

    const csv =
      'id,title,status,price,views,stock,lastSale\nlisting-9999,Pop art print,DRAFT,$45,120,5,2024-03-10';
    await page.setInputFiles('[data-testid="csv-import"]', {
      name: 'import.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv),
    });
    await expect(page.getByTestId('table-message')).toHaveText(/Imported 1 records/);
  });
});

test.describe('admin dashboard controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      document.cookie = 'x-playwright-role=ADMIN; path=/';
      document.cookie = 'x-playwright-user=test-admin; path=/';
    });
  });

  test('enforces impersonation safeguards and logs action', async ({ page }) => {
    await page.goto('/dashboard/admin');
    await expect(page.getByTestId('admin-dashboard')).toBeVisible();
    await page.fill('[data-testid="admin-user-search"]', 'Avery');
    await page.getByTestId('admin-impersonate-user-1101');
    await page.getByTestId('admin-impersonate-user-1101').click();

    await expect(page.getByTestId('impersonation-modal')).toBeVisible();
    await page.fill('[data-testid="impersonation-reason"]', 'Short');
    await page.getByTestId('impersonation-confirm').click();
    await expect(page.getByTestId('admin-error')).toHaveText(/Provide a detailed reason/);

    await page.fill(
      '[data-testid="impersonation-reason"]',
      'Reviewing suspicious payout trajectory',
    );
    await page.getByTestId('impersonation-confirm').click();
    await expect(page.getByTestId('admin-toast')).toHaveText(/Impersonation session initialised/);
  });

  test('processes moderation decisions and feature toggles', async ({ page }) => {
    await page.goto('/dashboard/admin');
    await page.getByRole('tab', { name: 'Moderation queue' }).click();
    await page.selectOption('[data-testid="moderation-decision-listing-501"]', 'approve');
    await page.fill(
      '[data-testid="moderation-rationale-listing-501"]',
      'Documentation verified. Approving for relist.',
    );
    await page.getByTestId('moderation-submit-listing-501').click();
    await expect(page.getByTestId('admin-toast')).toHaveText(/Moderation event captured/);

    await page.getByRole('tab', { name: 'Feature flags' }).click();
    const toggle = page.getByTestId('feature-flag-instant_payouts');
    const initialState = await toggle.isChecked();
    await toggle.setChecked(!initialState);
    await expect(page.getByTestId('admin-toast')).toHaveText(/Instant payouts/);
  });
});
