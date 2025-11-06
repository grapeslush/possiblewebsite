import { PrismaClient, ReviewStatus } from '@prisma/client';
import { ReviewRepository } from '../repositories/review.repository';

describe('ReviewRepository', () => {
  it('records moderation decisions with status updates', async () => {
    const reviewUpdateMock = jest.fn().mockResolvedValue({ id: 'review-1' });
    const decisionCreateMock = jest.fn().mockResolvedValue({ id: 'decision-1' });

    const transactionClient = {
      review: { update: reviewUpdateMock },
      reviewModerationDecision: { create: decisionCreateMock },
    };

    const transactionMock = jest
      .fn()
      .mockImplementation((callback: (tx: typeof transactionClient) => Promise<unknown>) =>
        callback(transactionClient as unknown as Parameters<typeof callback>[0]),
      );

    const prisma = {
      $transaction: transactionMock,
    } as unknown as PrismaClient;

    const repository = new ReviewRepository(prisma);

    await repository.recordDecision({
      reviewId: 'review-1',
      moderatorId: 'moderator-1',
      status: ReviewStatus.APPROVED,
      reason: 'Looks good',
    });

    expect(reviewUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'review-1' },
        data: expect.objectContaining({ status: ReviewStatus.APPROVED }),
      }),
    );
    expect(decisionCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reviewId: 'review-1',
          status: ReviewStatus.APPROVED,
          moderatorId: 'moderator-1',
        }),
      }),
    );
  });
});
