import {
  NotificationType,
  OrderEventType,
  OrderStatus,
  Prisma,
  PrismaClient,
  ShipmentStatus,
  ShipmentTrackingStatus,
} from '@prisma/client';
import { toDecimal } from '../utils/decimal.js';

export interface CreateOrderInput {
  listingId: string;
  buyerId: string;
  sellerId: string;
  offerId?: string | null;
  totalAmount: number | string | Prisma.Decimal;
  currency?: string;
  quantity?: number;
  shippingAddressId?: string | null;
  billingAddressId?: string | null;
  items?: Array<{
    listingId: string;
    offerId?: string | null;
    quantity?: number;
    unitPrice: number | string | Prisma.Decimal;
  }>;
}

export class OrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createOrder(input: CreateOrderInput) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          listingId: input.listingId,
          buyerId: input.buyerId,
          sellerId: input.sellerId,
          offerId: input.offerId ?? undefined,
          totalAmount: toDecimal(input.totalAmount),
          currency: input.currency ?? 'USD',
          quantity: input.quantity ?? 1,
          shippingAddressId:
            input.shippingAddressId === undefined ? undefined : input.shippingAddressId,
          billingAddressId:
            input.billingAddressId === undefined ? undefined : input.billingAddressId,
          items:
            input.items && input.items.length
              ? {
                  create: input.items.map((item) => ({
                    listingId: item.listingId,
                    offerId: item.offerId ?? undefined,
                    quantity: item.quantity ?? 1,
                    unitPrice: toDecimal(item.unitPrice),
                  })),
                }
              : undefined,
          timelineEvents: {
            create: {
              type: OrderEventType.CREATED,
              detail: 'Order created via repository',
            },
          },
        },
        include: {
          listing: true,
        },
      });

      await tx.notification.create({
        data: {
          userId: input.sellerId,
          type: NotificationType.ORDER_UPDATED,
          payload: {
            orderId: order.id,
            status: order.status,
            listingTitle: order.listing.title,
          },
        },
      });

      return order;
    });
  }

  getOrderDetails(orderId: string) {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        listing: true,
        buyer: true,
        seller: true,
        payment: true,
        shipment: true,
        timelineEvents: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  updateStatus(orderId: string, status: OrderStatus) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        fulfilledAt: status === OrderStatus.FULFILLED ? new Date() : undefined,
        cancelledAt: status === OrderStatus.CANCELLED ? new Date() : undefined,
      },
    });
  }

  addTimelineEvent(orderId: string, type: OrderEventType, detail: string) {
    return this.prisma.orderTimelineEvent.create({
      data: {
        orderId,
        type,
        detail,
      },
    });
  }

  createShipment(
    orderId: string,
    trackingNumber: string,
    options?: {
      carrier?: string | null;
      provider?: string | null;
      serviceLevel?: string | null;
      trackingUrl?: string | null;
      trackingStatus?: ShipmentTrackingStatus;
      trackingStatusDetail?: string | null;
      trackingSubscriptionId?: string | null;
      trackingLastEventAt?: Date | null;
      trackingNextCheckAt?: Date | null;
      labelUrl?: string | null;
      labelKey?: string | null;
      labelCost?: number | string | Prisma.Decimal | null;
      labelCurrency?: string | null;
      labelPurchasedAt?: Date | null;
    },
  ) {
    return this.prisma.shipment.upsert({
      where: { orderId },
      update: {
        status: ShipmentStatus.SHIPPED,
        trackingNumber,
        carrier: options?.carrier ?? undefined,
        provider: options?.provider ?? undefined,
        serviceLevel: options?.serviceLevel ?? undefined,
        trackingUrl: options?.trackingUrl ?? undefined,
        trackingStatus: options?.trackingStatus ?? ShipmentTrackingStatus.IN_TRANSIT,
        trackingStatusDetail: options?.trackingStatusDetail ?? undefined,
        trackingSubscriptionId: options?.trackingSubscriptionId ?? undefined,
        trackingLastEventAt: options?.trackingLastEventAt ?? undefined,
        trackingNextCheckAt: options?.trackingNextCheckAt ?? undefined,
        labelUrl: options?.labelUrl ?? undefined,
        labelKey: options?.labelKey ?? undefined,
        labelCost:
          options?.labelCost === undefined || options?.labelCost === null
            ? undefined
            : toDecimal(options.labelCost),
        labelCurrency: options?.labelCurrency ?? undefined,
        labelPurchasedAt: options?.labelPurchasedAt ?? new Date(),
        shippedAt: new Date(),
      },
      create: {
        orderId,
        trackingNumber,
        status: ShipmentStatus.SHIPPED,
        carrier: options?.carrier ?? undefined,
        provider: options?.provider ?? undefined,
        serviceLevel: options?.serviceLevel ?? undefined,
        trackingUrl: options?.trackingUrl ?? undefined,
        trackingStatus: options?.trackingStatus ?? ShipmentTrackingStatus.IN_TRANSIT,
        trackingStatusDetail: options?.trackingStatusDetail ?? undefined,
        trackingSubscriptionId: options?.trackingSubscriptionId ?? undefined,
        trackingLastEventAt: options?.trackingLastEventAt ?? undefined,
        trackingNextCheckAt: options?.trackingNextCheckAt ?? undefined,
        labelUrl: options?.labelUrl ?? undefined,
        labelKey: options?.labelKey ?? undefined,
        labelCost:
          options?.labelCost === undefined || options?.labelCost === null
            ? undefined
            : toDecimal(options.labelCost),
        labelCurrency: options?.labelCurrency ?? undefined,
        labelPurchasedAt: options?.labelPurchasedAt ?? new Date(),
        shippedAt: new Date(),
      },
    });
  }

  updateShipmentStatus(
    orderId: string,
    status: ShipmentStatus,
    trackingNumber?: string | null,
    options?: {
      trackingStatus?: ShipmentTrackingStatus;
      trackingStatusDetail?: string | null;
      trackingLastEventAt?: Date | null;
      trackingLastCheckedAt?: Date | null;
      trackingNextCheckAt?: Date | null;
      trackingUrl?: string | null;
      carrier?: string | null;
      serviceLevel?: string | null;
      provider?: string | null;
      trackingSubscriptionId?: string | null;
      labelUrl?: string | null;
      labelKey?: string | null;
      labelCost?: number | string | Prisma.Decimal | null;
      labelCurrency?: string | null;
      labelPurchasedAt?: Date | null;
      shippedAt?: Date | null;
      deliveredAt?: Date | null;
    },
  ) {
    return this.prisma.shipment.upsert({
      where: { orderId },
      update: {
        status,
        trackingNumber: trackingNumber ?? undefined,
        trackingStatus: options?.trackingStatus ?? undefined,
        trackingStatusDetail: options?.trackingStatusDetail ?? undefined,
        trackingLastEventAt: options?.trackingLastEventAt ?? undefined,
        trackingLastCheckedAt: options?.trackingLastCheckedAt ?? undefined,
        trackingNextCheckAt: options?.trackingNextCheckAt ?? undefined,
        trackingUrl: options?.trackingUrl ?? undefined,
        carrier: options?.carrier ?? undefined,
        serviceLevel: options?.serviceLevel ?? undefined,
        provider: options?.provider ?? undefined,
        trackingSubscriptionId: options?.trackingSubscriptionId ?? undefined,
        labelUrl: options?.labelUrl ?? undefined,
        labelKey: options?.labelKey ?? undefined,
        labelCost:
          options?.labelCost === undefined || options?.labelCost === null
            ? undefined
            : toDecimal(options.labelCost),
        labelCurrency: options?.labelCurrency ?? undefined,
        labelPurchasedAt: options?.labelPurchasedAt ?? undefined,
        deliveredAt: options?.deliveredAt
          ? options.deliveredAt
          : status === ShipmentStatus.DELIVERED
            ? new Date()
            : undefined,
        shippedAt: options?.shippedAt
          ? options.shippedAt
          : status === ShipmentStatus.SHIPPED
            ? new Date()
            : undefined,
        updatedAt: new Date(),
      },
      create: {
        orderId,
        status,
        trackingNumber: trackingNumber ?? undefined,
        trackingStatus: options?.trackingStatus ?? ShipmentTrackingStatus.UNKNOWN,
        trackingStatusDetail: options?.trackingStatusDetail ?? undefined,
        trackingLastEventAt: options?.trackingLastEventAt ?? undefined,
        trackingLastCheckedAt: options?.trackingLastCheckedAt ?? undefined,
        trackingNextCheckAt: options?.trackingNextCheckAt ?? undefined,
        trackingUrl: options?.trackingUrl ?? undefined,
        carrier: options?.carrier ?? undefined,
        serviceLevel: options?.serviceLevel ?? undefined,
        provider: options?.provider ?? undefined,
        trackingSubscriptionId: options?.trackingSubscriptionId ?? undefined,
        labelUrl: options?.labelUrl ?? undefined,
        labelKey: options?.labelKey ?? undefined,
        labelCost:
          options?.labelCost === undefined || options?.labelCost === null
            ? undefined
            : toDecimal(options.labelCost),
        labelCurrency: options?.labelCurrency ?? undefined,
        labelPurchasedAt: options?.labelPurchasedAt ?? undefined,
        shippedAt:
          options?.shippedAt ?? (status === ShipmentStatus.SHIPPED ? new Date() : undefined),
        deliveredAt:
          options?.deliveredAt ?? (status === ShipmentStatus.DELIVERED ? new Date() : undefined),
      },
    });
  }
}
