import { NextRequest, NextResponse } from 'next/server';
import { ReviewStatus } from '@prisma/client';
import { z } from 'zod';
import { emailClient } from '../../../../../lib/email.js';
import { auditLogs, prisma, reviews } from '../../../../../lib/services.js';

const decisionSchema = z.object({
  moderatorId: z.string().optional(),
  status: z
    .nativeEnum(ReviewStatus)
    .refine((value) => value === ReviewStatus.APPROVED || value === ReviewStatus.REJECTED, {
      message: 'Status must be APPROVED or REJECTED',
    }),
  reason: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: { params: { reviewId: string } }) {
  const body = await request.json();
  const parsed = decisionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const review = await reviews.recordDecision({
    reviewId: params.reviewId,
    moderatorId: parsed.data.moderatorId,
    status: parsed.data.status,
    reason: parsed.data.reason,
  });

  await prisma.moderationEvent.create({
    data: {
      type: 'REVIEW',
      entityId: review.id,
      actorId: parsed.data.moderatorId ?? null,
      action: parsed.data.status === ReviewStatus.APPROVED ? 'approved' : 'rejected',
      metadata: parsed.data.reason ? { reason: parsed.data.reason } : undefined,
    },
  });

  await auditLogs.createLog({
    actorId: parsed.data.moderatorId ?? undefined,
    entity: 'review',
    entityId: review.id,
    action: `moderation.${parsed.data.status.toLowerCase()}`,
    metadata: parsed.data.reason ? { reason: parsed.data.reason } : undefined,
  });

  const fullReview = await reviews.getReviewById(review.id);

  if (fullReview) {
    const template =
      parsed.data.status === ReviewStatus.APPROVED ? 'review-approved' : 'review-rejected';
    const email = fullReview.author.email ?? undefined;

    if (email) {
      await emailClient.sendTemplate({
        to: email,
        template,
        model: {
          reviewerName: fullReview.author.displayName,
          subjectName: fullReview.targetUser.displayName,
          reviewBody: fullReview.body,
          reason: parsed.data.reason,
        },
      });
    }
  }

  return NextResponse.json(review);
}
