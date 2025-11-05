import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { marketplace } from '../../../../../lib/services.js';
import { enqueueReviewReminder } from '../../../../../lib/queues.js';

const acceptOfferSchema = z.object({
  shippingAddressId: z.string().nullable().optional(),
  billingAddressId: z.string().nullable().optional(),
});

export async function POST(request: NextRequest, { params }: { params: { offerId: string } }) {
  const payload = acceptOfferSchema.safeParse(await request.json().catch(() => ({})));

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const offerId = params.offerId;

  const order = await marketplace.acceptOffer(offerId, {
    shippingAddressId: payload.data.shippingAddressId ?? undefined,
    billingAddressId: payload.data.billingAddressId ?? undefined,
  });

  await enqueueReviewReminder(order.id, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

  return NextResponse.json(order, { status: 201 });
}
