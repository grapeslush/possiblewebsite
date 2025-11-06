import { PrismaClient, ReviewStatus } from '@prisma/client';

export interface SubmitReviewInput {
  orderId: string;
  authorId: string;
  targetUserId: string;
  rating: number;
  body: string;
  status?: ReviewStatus;
  moderationNotes?: string | null;
}

export interface ReviewDecisionInput {
  reviewId: string;
  moderatorId?: string | null;
  status: ReviewStatus;
  reason?: string | null;
}

export class ReviewRepository {
  constructor(private readonly prisma: PrismaClient) {}

  submitReview(input: SubmitReviewInput) {
    return this.prisma.review.create({
      data: {
        orderId: input.orderId,
        authorId: input.authorId,
        targetUserId: input.targetUserId,
        rating: input.rating,
        body: input.body,
        status: input.status ?? ReviewStatus.PENDING,
        moderationNotes: input.moderationNotes ?? undefined,
      },
      include: {
        author: { select: { id: true, displayName: true } },
        targetUser: { select: { id: true, displayName: true } },
      },
    });
  }

  listPendingForReview() {
    return this.prisma.review.findMany({
      where: {
        status: {
          in: [ReviewStatus.PENDING, ReviewStatus.UNDER_REVIEW],
        },
      },
      orderBy: { submittedAt: 'asc' },
      include: {
        author: { select: { id: true, displayName: true } },
        targetUser: { select: { id: true, displayName: true } },
      },
    });
  }

  recordDecision(input: ReviewDecisionInput) {
    return this.prisma.$transaction(async (tx) => {
      const review = await tx.review.update({
        where: { id: input.reviewId },
        data: {
          status: input.status,
          moderatedAt: new Date(),
          moderationNotes: input.reason ?? undefined,
        },
      });

      await tx.reviewModerationDecision.create({
        data: {
          reviewId: input.reviewId,
          moderatorId: input.moderatorId ?? undefined,
          status: input.status,
          reason: input.reason ?? undefined,
        },
      });

      return review;
    });
  }

  getReviewById(reviewId: string) {
    return this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        author: true,
        targetUser: true,
      },
    });
  }
}
