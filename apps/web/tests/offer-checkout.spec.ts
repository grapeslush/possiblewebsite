import { test, expect } from '@playwright/test';
import { prisma } from '../../../packages/db/src/index.js';

test('offer acceptance through payout release', async ({ request }) => {
  let health;

  try {
    health = await request.get('/api/health');
  } catch (error) {
    test.skip(true, `API server not running: ${(error as Error).message}`);
  }

  if (!health || health.status() !== 200) {
    test.skip(true, 'API server not running');
  }

  const buyer = await prisma.user.create({
    data: {
      email: `buyer-${Date.now()}@example.com`,
      passwordHash: 'hash',
      displayName: 'Buyer Test',
    },
  });

  const seller = await prisma.user.create({
    data: {
      email: `seller-${Date.now()}@example.com`,
      passwordHash: 'hash',
      displayName: 'Seller Test',
      role: 'SELLER',
      stripeConnectId: 'acct_mock_123',
    },
  });

  const listing = await prisma.listing.create({
    data: {
      sellerId: seller.id,
      title: 'Test Listing',
      slug: `test-listing-${Date.now()}`,
      description: 'A test listing',
      price: 100,
      currency: 'USD',
      status: 'ACTIVE',
    },
  });

  const offerResponse = await request.post('/api/offers', {
    data: {
      listingId: listing.id,
      buyerId: buyer.id,
      amount: 90,
      message: 'Can you do 90?',
    },
  });

  expect(offerResponse.ok()).toBeTruthy();
  const offer = await offerResponse.json();

  const acceptResponse = await request.post(`/api/offers/${offer.id}/accept`, {
    data: {},
  });

  expect(acceptResponse.ok()).toBeTruthy();
  const order = await acceptResponse.json();

  const checkoutResponse = await request.post('/api/payments/checkout', {
    data: {
      orderId: order.id,
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
    },
  });

  expect(checkoutResponse.ok()).toBeTruthy();
  const checkout = await checkoutResponse.json();
  expect(checkout.paymentIntentId).toBeTruthy();

  const shipmentResponse = await request.post(`/api/shipments/${order.id}/status`, {
    data: { status: 'DELIVERED' },
  });

  expect(shipmentResponse.ok()).toBeTruthy();

  const payout = await prisma.payout.findUnique({ where: { orderId: order.id } });
  expect(payout?.transferId).toBeTruthy();

  await prisma.order.delete({ where: { id: order.id } }).catch(() => {});
  await prisma.offer.delete({ where: { id: offer.id } }).catch(() => {});
  await prisma.listing.delete({ where: { id: listing.id } }).catch(() => {});
  await prisma.user.deleteMany({ where: { id: { in: [buyer.id, seller.id] } } });
});
