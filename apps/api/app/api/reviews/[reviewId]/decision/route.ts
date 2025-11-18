import { NextRequest, NextResponse } from 'next/server';
import { ReviewStatus } from '@possiblewebsite/db';
import { z } from 'zod';
import { emailClient } from '../../../../../lib/email';
import { auditLogs, prisma, reviews } from '../../../../../lib/services';

const decisionSchema = z.object({
  moderatorId: z.string().optional(),
  status: z
    .nativeEnum(ReviewStatus)
    .refine((value) => value === ReviewStatus.APPROVED || value === ReviewStatus.REJECTED, {
      message: 'Status must be APPROVED or REJECTED',
    }),
  reason: z.string().optional(),
});

type DecisionInput = z.infer<typeof decisionSchema>;

export async function POST(request: NextRequest, { params }: { params: { reviewId: string } }) {
  const body = await request.json();
  let parsed: DecisionInput;

  try {
    parsed = decisionSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }

    throw error;
  }
  const { moderatorId, status, reason } = parsed;
  const moderatorIdValue = typeof moderatorId === 'string' ? moderatorId : null;
  const reasonValue = typeof reason === 'string' ? reason : null;
  const statusValue = status as ReviewStatus;

  const review = await reviews.recordDecision({
    reviewId: params.reviewId,
    moderatorId: moderatorIdValue,
    status: statusValue,
    reason: reasonValue,
  });

  await prisma.moderationEvent.create({
    data: {
      type: 'REVIEW',
      entityId: review.id,
      actorId: moderatorIdValue,
      action: statusValue === ReviewStatus.APPROVED ? 'approved' : 'rejected',
      metadata: reasonValue ? { reason: reasonValue } : undefined,
    },
  });

  await auditLogs.createLog({
    actorId: moderatorIdValue ?? undefined,
    entity: 'review',
    entityId: review.id,
    action: `moderation.${statusValue.toLowerCase()}`,
    metadata: reasonValue ? { reason: reasonValue } : undefined,
  });

  const fullReview = await reviews.getReviewById(review.id);

  if (fullReview) {
    const template = statusValue === ReviewStatus.APPROVED ? 'review-approved' : 'review-rejected';
    const email = fullReview.author.email ?? undefined;

    if (email) {
      await emailClient.sendTemplate({
        to: email,
        template,
        model: {
          reviewerName: fullReview.author.displayName,
          subjectName: fullReview.targetUser.displayName,
          reviewBody: fullReview.body,
          reason: reasonValue,
        },
      });
    }
  }

  return NextResponse.json(review);
}
