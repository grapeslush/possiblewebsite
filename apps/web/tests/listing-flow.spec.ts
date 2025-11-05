import { test, expect } from '@playwright/test';
import { Buffer } from 'node:buffer';

const demoImageBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/P70dXwAAAABJRU5ErkJggg==',
  'base64',
);

test.describe('AI-assisted listing creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/ai/upload', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ key: 'test-image.png', url: '/uploads/test-image.png' }),
      });
    });

    await page.route('**/api/ai/vision', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          description: 'Handcrafted ceramic planter with speckled glaze and drainage hole.',
          tags: ['ceramic', 'planter', 'handcrafted'],
        }),
      });
    });

    await page.route('**/api/ai/ebay-pricing**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          averagePrice: 65.5,
          minPrice: 55,
          maxPrice: 75,
          currency: 'USD',
          rationale: 'Based on 7 similar sold listings.',
        }),
      });
    });

    await page.route('**/api/listings', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          listing: {
            id: 'listing-test',
            slug: 'handcrafted-ceramic-planter',
            status: 'ACTIVE',
          },
        }),
      });
    });
  });

  test('walks through upload, AI suggestions, pricing, and publish', async ({ page }) => {
    await page.goto('/listing/new');

    await page.setInputFiles('[data-testid="photo-input"]', {
      name: 'test-image.png',
      mimeType: 'image/png',
      buffer: demoImageBuffer,
    });
    await page.click('[data-testid="upload-submit"]');
    await expect(page.getByText('Generate description')).toBeVisible();

    await page.click('[data-testid="vision-generate"]');
    await expect(page.getByText('Handcrafted ceramic planter', { exact: false })).toBeVisible();

    await page.click('[data-testid="pricing-fetch"]');
    await expect(
      page.getByText('Based on 7 similar sold listings.', { exact: false }),
    ).toBeVisible();

    await page.fill(
      'input[placeholder="Vintage camera, handmade decor…"]',
      'Handcrafted Ceramic Planter',
    );
    await page.fill(
      'textarea',
      'Handcrafted ceramic planter with speckled glaze and drainage hole.',
    );

    await page.click('[data-testid="publish-submit"]');
    await expect(page.getByText('Listing published!', { exact: false })).toBeVisible();
    await expect(page.getByRole('link', { name: 'marketplace page' })).toHaveAttribute(
      'href',
      '/listing/handcrafted-ceramic-planter',
    );
  });
});
