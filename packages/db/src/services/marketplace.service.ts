import {
  ListingStatus,
  OfferStatus,
  OrderEventType,
  OrderStatus,
  PaymentStatus,
  PrismaClient,
} from '@prisma/client';
import { DisputeRepository } from '../repositories/dispute.repository.js';
import { ListingRepository } from '../repositories/listing.repository.js';
import { OfferRepository } from '../repositories/offer.repository.js';
import { OrderRepository } from '../repositories/order.repository.js';
import { CartRepository } from '../repositories/cart.repository.js';
import { PaymentRepository } from '../repositories/payment.repository.js';
import { PayoutRepository } from '../repositories/payout.repository.js';

export interface AcceptOfferOptions {
  shippingAddressId?: string | null;
  billingAddressId?: string | null;
}

export class MarketplaceService {
  private readonly listings: ListingRepository;
  private readonly offers: OfferRepository;
  private readonly orders: OrderRepository;
  private readonly disputes: DisputeRepository;
  private readonly carts: CartRepository;
  private readonly payments: PaymentRepository;
  private readonly payouts: PayoutRepository;

  constructor(prisma: PrismaClient) {
    this.listings = new ListingRepository(prisma);
    this.offers = new OfferRepository(prisma);
    this.orders = new OrderRepository(prisma);
    this.disputes = new DisputeRepository(prisma);
    this.carts = new CartRepository(prisma);
    this.payments = new PaymentRepository(prisma);
    this.payouts = new PayoutRepository(prisma);
  }

  createOffer(input: Parameters<OfferRepository['createOffer']>[0]) {
    return this.offers.createOffer(input);
  }

  counterOffer(offerId: string, counterAmount: number, expiresAt?: Date) {
    return this.offers.counterOffer(offerId, counterAmount, expiresAt);
  }

  async acceptOffer(offerId: string, options: AcceptOfferOptions = {}) {
    const offer = await this.offers.getOfferWithDetails(offerId);

    if (!offer) {
      throw new Error(`Offer ${offerId} not found`);
    }

    if (!offer.listing) {
      throw new Error(`Offer ${offerId} is missing listing information`);
    }

    await this.offers.updateStatus(offerId, OfferStatus.ACCEPTED);

    const order = await this.orders.createOrder({
      listingId: offer.listing.id,
      buyerId: offer.buyerId,
      sellerId: offer.listing.sellerId,
      offerId: offer.id,
      totalAmount: offer.amount,
      currency: offer.listing.currency ?? 'USD',
      shippingAddressId: options.shippingAddressId ?? null,
      billingAddressId: options.billingAddressId ?? null,
      items: [
        {
          listingId: offer.listing.id,
          offerId: offer.id,
          quantity: 1,
          unitPrice: offer.counterAmount ?? offer.amount,
        },
      ],
    });

    await this.payments.upsertPayment({
      orderId: order.id,
      amount: offer.amount,
      currency: order.currency,
      provider: 'stripe',
      status: PaymentStatus.PENDING,
    });

    await this.payouts.createPendingPayout(
      order.id,
      offer.listing.sellerId,
      offer.amount,
      order.currency,
    );

    return order;
  }

  async expireOffer(offerId: string) {
    const offer = await this.offers.getOfferWithDetails(offerId);

    if (!offer) {
      throw new Error(`Offer ${offerId} not found`);
    }

    if (offer.status !== OfferStatus.PENDING && offer.status !== OfferStatus.COUNTERED) {
      return offer;
    }

    await this.offers.markExpired(offerId);
    return this.offers.getOfferWithDetails(offerId);
  }

  async createDirectOrder(
    buyerId: string,
    sellerId: string,
    listingId: string,
    amount: number,
    options: AcceptOfferOptions & { quantity?: number; offerId?: string | null } = {},
  ) {
    const quantity = options.quantity ?? 1;
    const unitPrice = amount / quantity;
    const order = await this.orders.createOrder({
      listingId,
      buyerId,
      sellerId,
      offerId: options.offerId ?? null,
      totalAmount: amount,
      currency: 'USD',
      quantity,
      shippingAddressId: options.shippingAddressId ?? null,
      billingAddressId: options.billingAddressId ?? null,
      items: [
        {
          listingId,
          offerId: options.offerId ?? null,
          quantity,
          unitPrice,
        },
      ],
    });

    await this.payments.upsertPayment({
      orderId: order.id,
      amount,
      currency: order.currency,
      provider: 'stripe',
      status: PaymentStatus.PENDING,
    });

    await this.payouts.createPendingPayout(order.id, sellerId, amount, order.currency);

    return order;
  }

  async addListingToCart(buyerId: string, listingId: string, unitPrice: number, quantity = 1) {
    const cart = await this.carts.getOrCreateActiveCart(buyerId);
    const item = await this.carts.addItem(cart.id, { listingId, quantity, unitPrice });
    return { cartId: cart.id, item };
  }

  async addOfferToCart(buyerId: string, listingId: string, offerId: string, amount: number) {
    const cart = await this.carts.getOrCreateActiveCart(buyerId);
    const item = await this.carts.addItem(cart.id, {
      listingId,
      offerId,
      unitPrice: amount,
      quantity: 1,
    });
    return { cartId: cart.id, item };
  }

  async checkoutCart(buyerId: string) {
    const items = await this.carts.listActiveItems(buyerId);

    if (!items.length) {
      throw new Error('Cart is empty');
    }

    const firstItem = items[0];
    const sellerId = firstItem.listing.sellerId;
    const total = items.reduce((acc, item) => acc + Number(item.unitPrice) * item.quantity, 0);
    const order = await this.orders.createOrder({
      listingId: firstItem.listingId,
      buyerId,
      sellerId,
      offerId: firstItem.offerId ?? null,
      totalAmount: total,
      currency: firstItem.listing.currency ?? 'USD',
      items: items.map((item) => ({
        listingId: item.listingId,
        offerId: item.offerId ?? null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    });

    await this.payments.upsertPayment({
      orderId: order.id,
      amount: total,
      currency: order.currency,
      provider: 'stripe',
      status: PaymentStatus.PENDING,
    });

    await this.payouts.createPendingPayout(order.id, sellerId, total, order.currency);

    await this.carts.clearCart(items[0].cartId);
    return order;
  }

  async fulfillOrder(orderId: string, trackingNumber: string) {
    await this.orders.updateStatus(orderId, OrderStatus.FULFILLED);
    await this.orders.addTimelineEvent(
      orderId,
      OrderEventType.SHIPPED,
      'Order marked as shipped by seller',
    );
    return this.orders.createShipment(orderId, trackingNumber);
  }

  async raiseDispute(orderId: string, raisedById: string, reason: string, initialMessage: string) {
    const dispute = await this.disputes.openDispute({
      orderId,
      raisedById,
      reason,
      initialMessage,
    });

    await this.orders.addTimelineEvent(
      orderId,
      OrderEventType.DISPUTE_OPENED,
      'Buyer raised a dispute',
    );
    return dispute;
  }

  getActiveListingsForSeller(sellerId: string) {
    return this.listings.findListings({ sellerId, status: ListingStatus.ACTIVE });
  }
}
