jest.mock('../lib/services.js', () => ({
  notificationSettings: {
    isEmailEnabled: jest.fn(),
    isInAppEnabled: jest.fn(),
  },
  prisma: {
    notification: { create: jest.fn() },
  },
  auditLogs: {
    createLog: jest.fn(),
  },
}));

jest.mock('../lib/email.js', () => ({
  emailClient: {
    sendTemplate: jest.fn(),
  },
}));

import { notifyOrderMessage } from '../lib/communication.js';
import { notificationSettings, prisma, auditLogs } from '../lib/services.js';
import { emailClient } from '../lib/email.js';

describe('order communication notifications', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('respects email opt-outs', async () => {
    (notificationSettings.isEmailEnabled as jest.Mock).mockResolvedValue(false);
    (notificationSettings.isInAppEnabled as jest.Mock).mockResolvedValue(true);

    await notifyOrderMessage({
      orderId: 'order-1',
      listingTitle: 'Vintage Camera',
      author: { id: 'user-1', displayName: 'Buyer' },
      recipients: [{ id: 'user-2', email: 'seller@example.com', displayName: 'Seller' }],
      message: 'Hello there',
    });

    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'user-2' }) }),
    );
    expect(emailClient.sendTemplate).not.toHaveBeenCalled();
  });

  it('creates audit log entries for sent messages', async () => {
    (notificationSettings.isEmailEnabled as jest.Mock).mockResolvedValue(false);
    (notificationSettings.isInAppEnabled as jest.Mock).mockResolvedValue(false);

    await notifyOrderMessage({
      orderId: 'order-9',
      listingTitle: 'Retro Console',
      author: { id: 'user-5', displayName: 'Buyer' },
      recipients: [{ id: 'user-8', email: 'support@example.com', displayName: 'Support' }],
      message: 'Update on the order',
    });

    expect(auditLogs.createLog).toHaveBeenCalledWith(
      expect.objectContaining({ entity: 'order', entityId: 'order-9', actorId: 'user-5' }),
    );
  });
});
