import {
  NotificationType,
  OrderEventType,
  ShipmentStatus,
  ShipmentTrackingStatus,
} from '@prisma/client';

import { OrderRepository, prisma } from '@possiblewebsite/db';

import { releasePayoutForOrder } from '../payouts.js';
import { enqueueShipmentTrackingPoll } from '../queues.js';
import type { TrackingStatusResponse } from './provider.js';
import { getShippingProvider } from './index.js';

const repository = new OrderRepository(prisma);

export const getFallbackPollInterval = () => {
  const value = process.env.SHIPMENT_TRACKING_POLL_INTERVAL_MS;
  const parsed = value ? Number(value) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return 30 * 60 * 1000; // 30 minutes default
};

export const mapTrackingToShipmentStatus = (status: ShipmentTrackingStatus): ShipmentStatus => {
  switch (status) {
    case ShipmentTrackingStatus.LABEL_PURCHASED:
      return ShipmentStatus.PREPARING;
    case ShipmentTrackingStatus.IN_TRANSIT:
    case ShipmentTrackingStatus.OUT_FOR_DELIVERY:
      return ShipmentStatus.SHIPPED;
    case ShipmentTrackingStatus.DELIVERED:
      return ShipmentStatus.DELIVERED;
    case ShipmentTrackingStatus.EXCEPTION:
      return ShipmentStatus.LOST;
    default:
      return ShipmentStatus.PREPARING;
  }
};

export const applyTrackingUpdate = async (
  trackingNumber: string,
  update: {
    status: ShipmentTrackingStatus;
    detail?: string | null;
    occurredAt?: Date | null;
    trackingUrl?: string | null;
    carrier?: string | null;
  },
  source: 'webhook' | 'poller' = 'webhook',
) => {
  const shipment = await prisma.shipment.findFirst({
    where: { trackingNumber },
    include: {
      order: {
        include: {
          buyer: true,
          seller: true,
        },
      },
    },
  });

  if (!shipment || !shipment.order) {
    return null;
  }

  const shipmentStatus = mapTrackingToShipmentStatus(update.status);
  const now = new Date();
  const occurredAt = update.occurredAt ?? now;
  const shouldContinuePolling =
    update.status !== ShipmentTrackingStatus.DELIVERED &&
    update.status !== ShipmentTrackingStatus.EXCEPTION;

  const nextPollAt = shouldContinuePolling
    ? new Date(Date.now() + getFallbackPollInterval())
    : null;

  await repository.updateShipmentStatus(shipment.orderId, shipmentStatus, trackingNumber, {
    trackingStatus: update.status,
    trackingStatusDetail: update.detail ?? null,
    trackingLastEventAt: occurredAt,
    trackingLastCheckedAt: now,
    trackingNextCheckAt: nextPollAt ?? undefined,
    trackingUrl: update.trackingUrl ?? shipment.trackingUrl ?? null,
    carrier: update.carrier ?? shipment.carrier ?? null,
  });

  const detail = update.detail ?? `Shipment is ${update.status.replace(/_/g, ' ').toLowerCase()}`;
  await repository.addTimelineEvent(
    shipment.orderId,
    OrderEventType.NOTE,
    `${source === 'webhook' ? 'Webhook' : 'Polling'} update: ${detail}`,
  );

  await prisma.notification.create({
    data: {
      userId: shipment.order.buyerId,
      type: NotificationType.ORDER_UPDATED,
      payload: {
        orderId: shipment.orderId,
        status: shipmentStatus,
        trackingNumber,
        detail,
      },
    },
  });

  if (shipmentStatus === ShipmentStatus.DELIVERED) {
    await releasePayoutForOrder(shipment.orderId);
  }

  if (nextPollAt) {
    await enqueueShipmentTrackingPoll(shipment.id, nextPollAt);
  }

  return { shipmentId: shipment.id, nextPollAt };
};

export const pollTrackingForShipment = async (shipmentId: string) => {
  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
  });

  if (!shipment || !shipment.trackingNumber) {
    return null;
  }

  const provider = getShippingProvider();
  let status: TrackingStatusResponse | null = null;

  try {
    status = await provider.fetchTrackingStatus(shipment.trackingNumber, shipment.carrier);
  } catch (error) {
    await prisma.shipment.update({
      where: { id: shipmentId },
      data: {
        trackingLastCheckedAt: new Date(),
        trackingNextCheckAt: new Date(Date.now() + getFallbackPollInterval()),
      },
    });
    throw error;
  }

  if (!status) {
    await prisma.shipment.update({
      where: { id: shipmentId },
      data: {
        trackingLastCheckedAt: new Date(),
        trackingNextCheckAt: new Date(Date.now() + getFallbackPollInterval()),
      },
    });
    await enqueueShipmentTrackingPoll(shipmentId, new Date(Date.now() + getFallbackPollInterval()));
    return null;
  }

  await applyTrackingUpdate(
    shipment.trackingNumber,
    {
      status: status.status,
      detail: status.detail,
      occurredAt: status.occurredAt,
      trackingUrl: status.trackingUrl,
      carrier: shipment.carrier,
    },
    'poller',
  );

  return status;
};
