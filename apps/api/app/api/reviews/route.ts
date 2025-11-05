import { NextRequest, NextResponse } from 'next/server';
import { ReviewStatus } from '@prisma/client';
import { z } from 'zod';
import { detectProfanity } from '../../../lib/profanity.js';
import { evaluateReview } from '../../../lib/moderation.js';
import { verifyCaptcha } from '../../../lib/hcaptcha.js';
import { rateLimiter } from '../../../lib/rate-limit.js';
import { auditLogs, prisma, reviews } from '../../../lib/services.js';

const submitSchema = z.object({
  orderId: z.string(),
  authorId: z.string(),
  targetUserId: z.string().optional(),
  rating: z.number().min(1).max(5),
  body: z.string().min(10).max(2000),
  captchaToken: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const parsed = submitSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const captchaPassed = await verifyCaptcha(parsed.data.captchaToken ?? null);

  if (!captchaPassed) {
    return NextResponse.json({ error: 'Captcha verification failed' }, { status: 403 });
  }

  const allowed = await rateLimiter.consume(`review-submit:${parsed.data.authorId}`, {
    max: 3,
    windowMs: 60_000,
  });

  if (!allowed) {
    return NextResponse.json({ error: 'Review submission rate limit exceeded' }, { status: 429 });
  }

  const profanity = detectProfanity(parsed.data.body);

  if (profanity.blocked) {
    const blockedReview = await reviews.submitReview({
      orderId: parsed.data.orderId,
      authorId: parsed.data.authorId,
      targetUserId: parsed.data.targetUserId ?? parsed.data.authorId,
      rating: parsed.data.rating,
      body: parsed.data.body,
      status: ReviewStatus.BLOCKED,
      moderationNotes: `Blocked terms: ${profanity.matches.join(', ')}`,
    });

    await prisma.moderationEvent.create({
      data: {
        type: 'REVIEW',
        entityId: blockedReview.id,
        actorId: parsed.data.authorId,
        action: 'blocked',
        metadata: { matches: profanity.matches },
      },
    });

    return NextResponse.json(blockedReview, { status: 202 });
  }

  const order = await prisma.order.findUnique({
    where: { id: parsed.data.orderId },
    select: {
      id: true,
      buyerId: true,
      sellerId: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const targetUserId =
    parsed.data.targetUserId ??
    (order.buyerId === parsed.data.authorId ? order.sellerId : order.buyerId);

  const moderationResult = await evaluateReview(parsed.data.body);

  const status = moderationResult.flagged ? ReviewStatus.UNDER_REVIEW : ReviewStatus.PENDING;

  const review = await reviews.submitReview({
    orderId: parsed.data.orderId,
    authorId: parsed.data.authorId,
    targetUserId,
    rating: parsed.data.rating,
    body: parsed.data.body,
    status,
    moderationNotes: moderationResult.reason,
  });

  await prisma.moderationEvent.create({
    data: {
      type: 'REVIEW',
      entityId: review.id,
      actorId: parsed.data.authorId,
      action: moderationResult.flagged ? 'flagged' : 'accepted',
      metadata: moderationResult.reason ? { reason: moderationResult.reason } : undefined,
    },
  });

  await auditLogs.createLog({
    actorId: parsed.data.authorId,
    entity: 'review',
    entityId: review.id,
    action: 'submitted',
    metadata: { status },
  });

  return NextResponse.json(review, { status: 201 });
}
