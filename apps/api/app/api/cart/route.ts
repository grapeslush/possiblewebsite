import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { CartRepository, prisma } from '@possiblewebsite/db';

import { instrumentRoute, incrementMetric, logger } from '../../../lib/observability';
import { marketplace } from '../../../lib/services.js';

const addToCartSchema = z.object({
  buyerId: z.string(),
  listingId: z.string(),
  unitPrice: z.number(),
  quantity: z.number().optional(),
  offerId: z.string().optional(),
});

export const runtime = 'nodejs';

async function handleGet(request: NextRequest) {
  const buyerId = request.nextUrl.searchParams.get('buyerId');

  if (!buyerId) {
    incrementMetric('cart.list.validation_error');
    return NextResponse.json({ error: 'buyerId query parameter is required' }, { status: 400 });
  }

  const repo = new CartRepository(prisma);
  const items = await repo.listActiveItems(buyerId);
  logger.info('cart items fetched', { buyerId, count: items.length });
  return NextResponse.json({ items });
}

async function handlePost(request: NextRequest) {
  const body = await request.json();
  const result = addToCartSchema.safeParse(body);

  if (!result.success) {
    incrementMetric('cart.add.validation_error');
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const payload = result.data;

  const response = payload.offerId
    ? await marketplace.addOfferToCart(
        payload.buyerId,
        payload.listingId,
        payload.offerId,
        payload.unitPrice,
      )
    : await marketplace.addListingToCart(
        payload.buyerId,
        payload.listingId,
        payload.unitPrice,
        payload.quantity ?? 1,
      );

  logger.info('cart item added', {
    buyerId: payload.buyerId,
    listingId: payload.listingId,
    offerId: payload.offerId,
  });
  incrementMetric('cart.added');

  return NextResponse.json(response, { status: 201 });
}

export const GET = instrumentRoute('cart.list', handleGet);
export const POST = instrumentRoute('cart.add', handlePost);
