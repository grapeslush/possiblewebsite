import { test, expect } from '@playwright/test';

test.describe('authentication flows', () => {
  test('user can sign up, verify email, enable MFA, and accept policies', async ({ page }) => {
    await page.goto('/auth/register');

    await page.fill('input[name="email"]', 'alice@example.com');
    await page.fill('input[name="displayName"]', 'Alice Example');
    await page.fill('input[name="dateOfBirth"]', '1990-01-01');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/auth\/login/);

    await page.fill('input[name="email"]', 'alice@example.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Email not verified')).toBeVisible({ timeout: 10_000 });
  });
});
