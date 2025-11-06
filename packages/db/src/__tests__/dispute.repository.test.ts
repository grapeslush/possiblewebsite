import { DisputeStatus, NotificationType, PrismaClient } from '@prisma/client';
import { DisputeRepository } from '../repositories/dispute.repository';

describe('DisputeRepository', () => {
  it('assigns an agent and creates a notification in a transaction', async () => {
    const disputeRecord = { id: 'dispute-1', status: DisputeStatus.UNDER_REVIEW };
    const disputeUpdateMock = jest.fn().mockResolvedValue(disputeRecord);
    const notificationCreateMock = jest.fn().mockResolvedValue({ id: 'notification-1' });

    const transactionClient = {
      dispute: { update: disputeUpdateMock },
      notification: { create: notificationCreateMock },
    };

    const transactionMock = jest
      .fn()
      .mockImplementation(async (callback: (tx: typeof transactionClient) => Promise<unknown>) =>
        callback(transactionClient as unknown as Parameters<typeof callback>[0]),
      );

    const prisma = {
      $transaction: transactionMock,
    } as unknown as PrismaClient;

    const repository = new DisputeRepository(prisma);
    const result = await repository.assignAgent('dispute-1', 'agent-1');

    expect(result).toEqual(disputeRecord);
    expect(disputeUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'dispute-1' },
        data: expect.objectContaining({
          assignedToId: 'agent-1',
          status: DisputeStatus.UNDER_REVIEW,
        }),
      }),
    );
    expect(notificationCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'agent-1',
          type: NotificationType.DISPUTE_UPDATED,
        }),
      }),
    );
  });
});
