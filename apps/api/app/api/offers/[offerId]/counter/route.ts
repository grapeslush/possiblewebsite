import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { marketplace } from '../../../../../lib/services.js';
import { scheduleOfferExpiry } from '../../../../../lib/queues.js';

const counterSchema = z.object({
  amount: z.number(),
  expiresAt: z.string().datetime().optional(),
});

export async function POST(request: NextRequest, { params }: { params: { offerId: string } }) {
  const payload = counterSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const offer = await marketplace.counterOffer(
    params.offerId,
    payload.data.amount,
    payload.data.expiresAt ? new Date(payload.data.expiresAt) : undefined,
  );

  if (offer.expiresAt) {
    await scheduleOfferExpiry(offer.id, offer.expiresAt);
  }

  return NextResponse.json(offer);
}
