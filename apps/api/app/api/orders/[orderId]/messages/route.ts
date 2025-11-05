import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { detectProfanity } from '../../../../../lib/profanity.js';
import { verifyCaptcha } from '../../../../../lib/hcaptcha.js';
import { rateLimiter } from '../../../../../lib/rate-limit.js';
import { notifyOrderMessage } from '../../../../../lib/communication.js';
import { orders, prisma } from '../../../../../lib/services.js';

const messageSchema = z.object({
  authorId: z.string(),
  body: z.string().min(1).max(2000),
  captchaToken: z.string().optional(),
});

export async function GET(request: NextRequest, { params }: { params: { orderId: string } }) {
  const messages = await orders.listMessages(params.orderId);
  return NextResponse.json(messages);
}

export async function POST(request: NextRequest, { params }: { params: { orderId: string } }) {
  const payload = await request.json();
  const parsed = messageSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const captchaPassed = await verifyCaptcha(parsed.data.captchaToken ?? null);

  if (!captchaPassed) {
    return NextResponse.json({ error: 'Captcha verification failed' }, { status: 403 });
  }

  const allowed = await rateLimiter.consume(`order-message:${parsed.data.authorId}`, {
    max: 5,
    windowMs: 60_000,
  });

  if (!allowed) {
    return NextResponse.json({ error: 'Message rate limit exceeded' }, { status: 429 });
  }

  const profanity = detectProfanity(parsed.data.body);

  if (profanity.blocked) {
    await prisma.moderationEvent.create({
      data: {
        type: 'MESSAGE',
        entityId: params.orderId,
        actorId: parsed.data.authorId,
        action: 'blocked',
        metadata: { matches: profanity.matches },
      },
    });

    return NextResponse.json(
      {
        error: 'Message blocked by moderation policy',
        matches: profanity.matches,
      },
      { status: 422 },
    );
  }

  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: {
      listing: { select: { title: true } },
      buyer: { select: { id: true, email: true, displayName: true } },
      seller: { select: { id: true, email: true, displayName: true } },
    },
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const message = await orders.addMessage(params.orderId, parsed.data.authorId, parsed.data.body);

  const recipients = [order.buyer, order.seller]
    .filter((participant) => participant?.id && participant.id !== parsed.data.authorId)
    .map((participant) => ({
      id: participant.id,
      email: participant.email,
      displayName: participant.displayName,
    }));

  await notifyOrderMessage({
    orderId: order.id,
    listingTitle: order.listing?.title,
    author: {
      id: parsed.data.authorId,
      displayName:
        order.buyer.id === parsed.data.authorId
          ? order.buyer.displayName
          : order.seller.displayName,
    },
    recipients,
    message: parsed.data.body,
  });

  await prisma.moderationEvent.create({
    data: {
      type: 'MESSAGE',
      entityId: params.orderId,
      actorId: parsed.data.authorId,
      action: 'allowed',
    },
  });

  return NextResponse.json(message, { status: 201 });
}
