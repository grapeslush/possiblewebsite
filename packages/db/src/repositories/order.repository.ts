import {
  NotificationType,
  OrderEventType,
  OrderStatus,
  Prisma,
  PrismaClient,
  ShipmentStatus
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
          timelineEvents: {
            create: {
              type: OrderEventType.CREATED,
              detail: 'Order created via repository'
            }
          }
        },
        include: {
          listing: true
        }
      });

      await tx.notification.create({
        data: {
          userId: input.sellerId,
          type: NotificationType.ORDER_UPDATED,
          payload: {
            orderId: order.id,
            status: order.status,
            listingTitle: order.listing.title
          }
        }
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
          orderBy: { createdAt: 'asc' }
        }
      }
    });
  }

  updateStatus(orderId: string, status: OrderStatus) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        fulfilledAt: status === OrderStatus.FULFILLED ? new Date() : undefined,
        cancelledAt: status === OrderStatus.CANCELLED ? new Date() : undefined
      }
    });
  }

  addTimelineEvent(orderId: string, type: OrderEventType, detail: string) {
    return this.prisma.orderTimelineEvent.create({
      data: {
        orderId,
        type,
        detail
      }
    });
  }

  createShipment(orderId: string, trackingNumber: string) {
    return this.prisma.shipment.upsert({
      where: { orderId },
      update: {
        status: ShipmentStatus.SHIPPED,
        trackingNumber,
        shippedAt: new Date()
      },
      create: {
        orderId,
        trackingNumber,
        status: ShipmentStatus.SHIPPED,
        shippedAt: new Date()
      }
    });
  }
}
