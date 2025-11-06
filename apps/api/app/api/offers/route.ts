import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { instrumentRoute, incrementMetric, logger } from '../../../lib/observability';
import { marketplace } from '../../../lib/services.js';
import { scheduleOfferExpiry } from '../../../lib/queues.js';

const createOfferSchema = z.object({
  listingId: z.string(),
  buyerId: z.string(),
  amount: z.number(),
  message: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
});

export const runtime = 'nodejs';

async function handlePost(request: NextRequest) {
  const json = await request.json();
  const result = createOfferSchema.safeParse(json);

  if (!result.success) {
    incrementMetric('offers.validation_error');
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const data = result.data;

  const offer = await marketplace.createOffer({
    listingId: data.listingId,
    buyerId: data.buyerId,
    amount: data.amount,
    message: data.message,
    expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
  });

  if (offer.expiresAt) {
    await scheduleOfferExpiry(offer.id, offer.expiresAt);
  }

  logger.info('offer created', {
    listingId: data.listingId,
    buyerId: data.buyerId,
    offerId: offer.id,
  });
  incrementMetric('offers.created');

  return NextResponse.json(offer, { status: 201 });
}

export const POST = instrumentRoute('offers', handlePost);
