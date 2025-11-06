import { NotificationType, OrderEventType, OrderStatus, PrismaClient } from '@prisma/client';
import { OrderRepository } from '../repositories/order.repository';

describe('OrderRepository', () => {
  it('creates an order and emits a notification inside a transaction', async () => {
    const orderRecord = {
      id: 'order-1',
      status: OrderStatus.PENDING,
      listing: { title: 'Test Listing' },
    } as const;

    const orderCreateMock = jest.fn().mockResolvedValue(orderRecord);
    const notificationCreateMock = jest.fn().mockResolvedValue({ id: 'notification-1' });

    const transactionClient = {
      order: { create: orderCreateMock },
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

    const repository = new OrderRepository(prisma);

    const result = await repository.createOrder({
      listingId: 'listing-1',
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      offerId: 'offer-1',
      totalAmount: '199.99',
    });

    expect(result).toBe(orderRecord);
    expect(orderCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          listingId: 'listing-1',
          buyerId: 'buyer-1',
          sellerId: 'seller-1',
        }),
      }),
    );
    expect(notificationCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'seller-1',
          type: NotificationType.ORDER_UPDATED,
        }),
      }),
    );
  });

  it('adds a timeline event for an order', async () => {
    const timelineCreateMock = jest.fn().mockResolvedValue({ id: 'timeline-1' });
    const prisma = {
      orderTimelineEvent: { create: timelineCreateMock },
    } as unknown as PrismaClient;

    const repository = new OrderRepository(prisma);
    await repository.addTimelineEvent('order-1', OrderEventType.NOTE, 'Message');

    expect(timelineCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { orderId: 'order-1', type: OrderEventType.NOTE, detail: 'Message' },
      }),
    );
  });
});
