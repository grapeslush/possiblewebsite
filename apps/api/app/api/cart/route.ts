import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { CartRepository, prisma } from '@possiblewebsite/db';
import { marketplace } from '../../../lib/services.js';

const addToCartSchema = z.object({
  buyerId: z.string(),
  listingId: z.string(),
  unitPrice: z.number(),
  quantity: z.number().optional(),
  offerId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const buyerId = request.nextUrl.searchParams.get('buyerId');

  if (!buyerId) {
    return NextResponse.json({ error: 'buyerId query parameter is required' }, { status: 400 });
  }

  const repo = new CartRepository(prisma);
  const items = await repo.listActiveItems(buyerId);
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = addToCartSchema.safeParse(body);

  if (!result.success) {
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

  return NextResponse.json(response, { status: 201 });
}
