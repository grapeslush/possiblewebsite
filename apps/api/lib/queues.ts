import { Queue, QueueScheduler, Worker, JobsOptions, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { marketplace } from './services';
import { releasePayoutForOrder } from './payouts';
import { prisma } from './services';
import { pollTrackingForShipment } from './shipping/service.js';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

const connection = new IORedis(redisUrl);

const queueOptions = {
  connection,
};

const createQueue = (name: string) => {
  const queue = new Queue(name, queueOptions);
  new QueueScheduler(name, queueOptions);
  new QueueEvents(name, queueOptions);
  return queue;
};

const globalQueues = globalThis as unknown as {
  __queues__?: {
    offerExpiry: Queue;
    payoutRelease: Queue;
    reviewReminder: Queue;
    aiRecompute: Queue;
    webhookRetry: Queue;
    shipmentTracking: Queue;
  };
};

if (!globalQueues.__queues__) {
  globalQueues.__queues__ = {
    offerExpiry: createQueue('offer-expiry'),
    payoutRelease: createQueue('payout-release'),
    reviewReminder: createQueue('review-reminder'),
    aiRecompute: createQueue('ai-recompute'),
    webhookRetry: createQueue('webhook-retry'),
    shipmentTracking: createQueue('shipment-tracking'),
  };
}

export const queues = globalQueues.__queues__!;

const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000,
  },
};

export const scheduleOfferExpiry = async (offerId: string, runAt: Date) => {
  await queues.offerExpiry.add(
    'expire-offer',
    { offerId },
    { ...defaultJobOptions, delay: Math.max(runAt.getTime() - Date.now(), 0) },
  );
};

export const enqueuePayoutRelease = async (orderId: string) => {
  await queues.payoutRelease.add('release-payout', { orderId }, defaultJobOptions);
};

export const enqueueReviewReminder = async (orderId: string, remindAt: Date) => {
  await queues.reviewReminder.add(
    'send-review-reminder',
    { orderId },
    { ...defaultJobOptions, delay: Math.max(remindAt.getTime() - Date.now(), 0) },
  );
};

export const enqueueAiRecompute = async (listingId: string) => {
  await queues.aiRecompute.add('recompute-ai-signals', { listingId }, defaultJobOptions);
};

export const enqueueWebhookRetry = async (eventId: string) => {
  await queues.webhookRetry.add('retry-webhook', { eventId }, defaultJobOptions);
};

export const enqueueShipmentTrackingPoll = async (shipmentId: string, runAt?: Date) => {
  await queues.shipmentTracking.add(
    'shipment-tracking-poll',
    { shipmentId },
    {
      ...defaultJobOptions,
      delay: runAt ? Math.max(runAt.getTime() - Date.now(), 0) : 0,
    },
  );
};

let workersRegistered = false;

export const registerQueueWorkers = () => {
  if (workersRegistered) return;

  new Worker(
    queues.offerExpiry.name,
    async (job) => {
      await marketplace.expireOffer(job.data.offerId);
    },
    queueOptions,
  );

  new Worker(
    queues.payoutRelease.name,
    async (job) => {
      await releasePayoutForOrder(job.data.orderId);
    },
    queueOptions,
  );

  new Worker(
    queues.reviewReminder.name,
    async (job) => {
      const order = await prisma.order.findUnique({
        where: { id: job.data.orderId },
      });

      if (!order) return;

      await prisma.notification.create({
        data: {
          userId: order.buyerId,
          type: 'SYSTEM',
          payload: {
            orderId: job.data.orderId,
            message: 'Reminder to leave a review',
          },
        },
      });
    },
    queueOptions,
  );

  new Worker(
    queues.aiRecompute.name,
    async (job) => {
      await prisma.listing.update({
        where: { id: job.data.listingId },
        data: { updatedAt: new Date() },
      });
    },
    queueOptions,
  );

  new Worker(
    queues.webhookRetry.name,
    async (job) => {
      await prisma.auditLog.create({
        data: {
          entity: 'Webhook',
          entityId: job.data.eventId,
          action: 'RETRY',
          metadata: {
            attempts: job.attemptsMade,
          },
        },
      });
    },
    queueOptions,
  );

  new Worker(
    queues.shipmentTracking.name,
    async (job) => {
      await pollTrackingForShipment(job.data.shipmentId);
    },
    queueOptions,
  );

  workersRegistered = true;
};

registerQueueWorkers();
