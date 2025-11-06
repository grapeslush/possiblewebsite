import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { instrumentRoute, incrementMetric, logger } from '../../../lib/observability';
import { marketplace } from '../../../lib/services.js';
import { enqueueReviewReminder } from '../../../lib/queues.js';

const orderSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('direct'),
    buyerId: z.string(),
    sellerId: z.string(),
    listingId: z.string(),
    amount: z.number(),
    quantity: z.number().optional(),
    shippingAddressId: z.string().nullable().optional(),
    billingAddressId: z.string().nullable().optional(),
    offerId: z.string().optional(),
  }),
  z.object({
    type: z.literal('offer'),
    offerId: z.string(),
    shippingAddressId: z.string().nullable().optional(),
    billingAddressId: z.string().nullable().optional(),
  }),
  z.object({
    type: z.literal('cart'),
    buyerId: z.string(),
  }),
]);

export const runtime = 'nodejs';

async function handlePost(request: NextRequest) {
  const payload = orderSchema.safeParse(await request.json());

  if (!payload.success) {
    incrementMetric('orders.validation_error');
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const data = payload.data;
  let order;

  if (data.type === 'direct') {
    order = await marketplace.createDirectOrder(
      data.buyerId,
      data.sellerId,
      data.listingId,
      data.amount,
      {
        quantity: data.quantity,
        shippingAddressId: data.shippingAddressId ?? undefined,
        billingAddressId: data.billingAddressId ?? undefined,
        offerId: data.offerId ?? undefined,
      },
    );
  } else if (data.type === 'offer') {
    order = await marketplace.acceptOffer(data.offerId, {
      shippingAddressId: data.shippingAddressId ?? undefined,
      billingAddressId: data.billingAddressId ?? undefined,
    });
  } else {
    order = await marketplace.checkoutCart(data.buyerId);
  }

  await enqueueReviewReminder(order.id, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

  logger.info('order created', { orderId: order.id, type: data.type });
  incrementMetric('orders.created');

  return NextResponse.json(order, { status: 201 });
}

export const POST = instrumentRoute('orders', handlePost);
