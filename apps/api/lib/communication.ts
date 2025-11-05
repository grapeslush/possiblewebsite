import { NotificationType } from '@prisma/client';
import { emailClient } from './email.js';
import { auditLogs, notificationSettings, prisma } from './services.js';

interface Participant {
  id: string;
  email?: string | null;
  displayName?: string | null;
}

interface OrderMessageContext {
  orderId: string;
  listingTitle?: string | null;
  author: Participant;
  recipients: Participant[];
  message: string;
}

interface DisputeMessageContext {
  disputeId: string;
  orderId: string;
  author: Participant;
  recipients: Participant[];
  message: string;
}

export async function notifyOrderMessage(context: OrderMessageContext) {
  await Promise.all(
    context.recipients.map(async (recipient) => {
      const allowEmail = await notificationSettings.isEmailEnabled(
        recipient.id,
        NotificationType.ORDER_UPDATED,
      );
      const allowInApp = await notificationSettings.isInAppEnabled(
        recipient.id,
        NotificationType.ORDER_UPDATED,
      );

      if (allowInApp) {
        await prisma.notification.create({
          data: {
            userId: recipient.id,
            type: NotificationType.ORDER_UPDATED,
            payload: {
              orderId: context.orderId,
              message: context.message.slice(0, 240),
              authorId: context.author.id,
            },
          },
        });
      }

      if (allowEmail && recipient.email) {
        await emailClient.sendTemplate({
          to: recipient.email,
          template: 'order-message',
          model: {
            orderId: context.orderId,
            listingTitle: context.listingTitle ?? 'Order update',
            authorName: context.author.displayName ?? 'Marketplace user',
            message: context.message,
          },
        });
      }
    }),
  );

  await auditLogs.createLog({
    actorId: context.author.id,
    entity: 'order',
    entityId: context.orderId,
    action: 'message.sent',
    metadata: { recipientCount: context.recipients.length },
  });
}

export async function notifyDisputeMessage(context: DisputeMessageContext) {
  await Promise.all(
    context.recipients.map(async (recipient) => {
      const allowEmail = await notificationSettings.isEmailEnabled(
        recipient.id,
        NotificationType.DISPUTE_UPDATED,
      );
      const allowInApp = await notificationSettings.isInAppEnabled(
        recipient.id,
        NotificationType.DISPUTE_UPDATED,
      );

      if (allowInApp) {
        await prisma.notification.create({
          data: {
            userId: recipient.id,
            type: NotificationType.DISPUTE_UPDATED,
            payload: {
              disputeId: context.disputeId,
              orderId: context.orderId,
              message: context.message.slice(0, 240),
              authorId: context.author.id,
            },
          },
        });
      }

      if (allowEmail && recipient.email) {
        await emailClient.sendTemplate({
          to: recipient.email,
          template: 'dispute-message',
          model: {
            disputeId: context.disputeId,
            orderId: context.orderId,
            authorName: context.author.displayName ?? 'Marketplace user',
            message: context.message,
          },
        });
      }
    }),
  );

  await auditLogs.createLog({
    actorId: context.author.id,
    entity: 'dispute',
    entityId: context.disputeId,
    action: 'message.sent',
    metadata: { recipientCount: context.recipients.length },
  });
}
