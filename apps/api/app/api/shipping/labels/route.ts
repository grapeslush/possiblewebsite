import { NextRequest, NextResponse } from 'next/server';
import {
  AddressType,
  NotificationType,
  OrderEventType,
  ShipmentStatus,
  ShipmentTrackingStatus,
  prisma,
  OrderRepository,
} from '@possiblewebsite/db';
import { z } from 'zod';

import { uploadBinary } from '../../../../lib/storage';
import { enqueueShipmentTrackingPoll } from '../../../../lib/queues';
import { getFallbackPollInterval } from '../../../../lib/shipping/service';
import { getShippingProvider } from '../../../../lib/shipping/index';

const repository = new OrderRepository(prisma);

const parcelSchema = z.object({
  lengthInches: z.number().positive(),
  widthInches: z.number().positive(),
  heightInches: z.number().positive(),
  weightOz: z.number().positive(),
});

const payloadSchema = z.object({
  orderId: z.string().min(1),
  rateId: z.string().min(1),
  parcel: parcelSchema,
  sellerId: z.string().optional(),
  labelFormat: z.enum(['PDF', 'ZPL']).optional(),
});

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = payloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { orderId, rateId, parcel, sellerId, labelFormat } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      shippingAddress: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (sellerId && order.sellerId !== sellerId) {
    return NextResponse.json({ error: 'Seller mismatch' }, { status: 403 });
  }

  if (!order.shippingAddress) {
    return NextResponse.json({ error: 'Order missing shipping address' }, { status: 400 });
  }

  const fromAddress = await prisma.address.findFirst({
    where: {
      userId: order.sellerId,
      type: AddressType.SHIPPING,
    },
    orderBy: { isDefault: 'desc' },
  });

  if (!fromAddress) {
    return NextResponse.json({ error: 'Seller missing default shipping address' }, { status: 400 });
  }

  const provider = getShippingProvider();

  const purchase = await provider.purchaseLabel({
    rateId,
    parcel,
    labelFormat: labelFormat ?? 'PDF',
    reference: `order:${orderId}`,
    from: {
      name: fromAddress.label ?? undefined,
      company: null,
      street1: fromAddress.line1,
      street2: fromAddress.line2,
      city: fromAddress.city,
      state: fromAddress.state,
      postalCode: fromAddress.postalCode,
      country: fromAddress.country,
      phone: null,
      email: null,
    },
    to: {
      name: order.shippingAddress.label ?? undefined,
      company: null,
      street1: order.shippingAddress.line1,
      street2: order.shippingAddress.line2,
      city: order.shippingAddress.city,
      state: order.shippingAddress.state,
      postalCode: order.shippingAddress.postalCode,
      country: order.shippingAddress.country,
      phone: null,
      email: null,
    },
  });

  const upload = await uploadBinary(
    'shipping-labels',
    purchase.labelFile,
    purchase.labelFormat === 'PDF' ? 'application/pdf' : 'application/octet-stream',
  );

  const shipment = await repository.updateShipmentStatus(
    orderId,
    ShipmentStatus.PREPARING,
    purchase.trackingNumber,
    {
      provider: 'pirateship',
      carrier: purchase.carrier,
      serviceLevel: purchase.service,
      trackingUrl: purchase.trackingUrl ?? null,
      trackingStatus: ShipmentTrackingStatus.LABEL_PURCHASED,
      trackingStatusDetail: 'Label purchased',
      trackingNextCheckAt: new Date(Date.now() + getFallbackPollInterval()),
      labelUrl: upload.url,
      labelKey: upload.key,
      labelCost: purchase.amount,
      labelCurrency: purchase.currency,
      labelPurchasedAt: new Date(),
    },
  );

  await repository.addTimelineEvent(
    orderId,
    OrderEventType.NOTE,
    'Shipping label purchased via Pirate Ship',
  );

  await prisma.notification.create({
    data: {
      userId: order.buyerId,
      type: NotificationType.ORDER_UPDATED,
      payload: {
        orderId,
        status: ShipmentStatus.PREPARING,
        trackingNumber: purchase.trackingNumber,
        message: 'Seller purchased a shipping label for your order.',
      },
    },
  });

  try {
    const subscription = await provider.subscribeTracking({
      trackingNumber: purchase.trackingNumber,
      carrier: purchase.carrier,
      reference: `order:${orderId}`,
    });

    await prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        trackingSubscriptionId: subscription.subscriptionId,
      },
    });
  } catch (error) {
    console.warn('Failed to subscribe tracking with Pirate Ship', error);
  }

  await enqueueShipmentTrackingPoll(shipment.id, new Date(Date.now() + getFallbackPollInterval()));

  return NextResponse.json({
    shipmentId: shipment.id,
    trackingNumber: purchase.trackingNumber,
    carrier: purchase.carrier,
    service: purchase.service,
    labelUrl: upload.url,
    amount: purchase.amount,
    currency: purchase.currency,
  });
}
