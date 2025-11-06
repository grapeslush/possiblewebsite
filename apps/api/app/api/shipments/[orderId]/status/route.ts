import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { OrderRepository, prisma } from '@possiblewebsite/db';
import { OrderEventType, ShipmentStatus } from '@prisma/client';
import { releasePayoutForOrder } from '../../../../../lib/payouts.js';

const repository = new OrderRepository(prisma);

const schema = z.object({
  status: z.nativeEnum(ShipmentStatus),
  trackingNumber: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: { params: { orderId: string } }) {
  const payload = schema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const orderId = params.orderId;
  const status = payload.data.status;

  await repository.updateShipmentStatus(orderId, status, payload.data.trackingNumber);
  await repository.addTimelineEvent(orderId, OrderEventType.NOTE, `Shipment marked as ${status}`);

  if (status === ShipmentStatus.DELIVERED) {
    await releasePayoutForOrder(orderId);
  }

  return NextResponse.json({ status });
}
