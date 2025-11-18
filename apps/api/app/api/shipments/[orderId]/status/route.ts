import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { OrderRepository, OrderEventType, ShipmentStatus, prisma } from '@possiblewebsite/db';
import { releasePayoutForOrder } from '../../../../../lib/payouts';

const repository = new OrderRepository(prisma);

const schema = z.object({
  status: z.nativeEnum(ShipmentStatus),
  trackingNumber: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: { params: { orderId: string } }) {
  let payload: z.infer<typeof schema>;

  try {
    payload = schema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }

    throw error;
  }

  const orderId = params.orderId;
  const status = payload.status;
  const trackingNumber =
    typeof payload.trackingNumber === 'string' ? payload.trackingNumber : undefined;

  await repository.updateShipmentStatus(orderId, status, trackingNumber);
  await repository.addTimelineEvent(orderId, OrderEventType.NOTE, `Shipment marked as ${status}`);

  if (status === ShipmentStatus.DELIVERED) {
    await releasePayoutForOrder(orderId);
  }

  return NextResponse.json({ status });
}
