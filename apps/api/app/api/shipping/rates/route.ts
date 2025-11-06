import { NextRequest, NextResponse } from 'next/server';
import { AddressType } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '../../../../lib/services';
import { getShippingProvider } from '../../../../lib/shipping/index';

const parcelSchema = z.object({
  lengthInches: z.number().positive(),
  widthInches: z.number().positive(),
  heightInches: z.number().positive(),
  weightOz: z.number().positive(),
});

const payloadSchema = z.object({
  orderId: z.string().min(1),
  parcel: parcelSchema,
  sellerId: z.string().optional(),
});

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const json = await request.json();
  const parsed = payloadSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { orderId, parcel, sellerId } = parsed.data;

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

  const rates = await provider.quoteRates({
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
    parcel,
  });

  return NextResponse.json({ rates });
}
