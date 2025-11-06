import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createCheckoutSession } from '../../../../lib/stripe';

const checkoutSchema = z.object({
  orderId: z.string(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  buyerEmail: z.string().email().optional(),
  applicationFeePercent: z.number().optional(),
  taxRatePercent: z.number().optional(),
  escrowPercent: z.number().optional(),
});

export async function POST(request: NextRequest) {
  const payload = checkoutSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const session = await createCheckoutSession(payload.data);
  return NextResponse.json(session, { status: 201 });
}
