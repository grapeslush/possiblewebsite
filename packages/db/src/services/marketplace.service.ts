import { ListingStatus, OfferStatus, OrderEventType, OrderStatus, PrismaClient } from '@prisma/client';
import { DisputeRepository } from '../repositories/dispute.repository.js';
import { ListingRepository } from '../repositories/listing.repository.js';
import { OfferRepository } from '../repositories/offer.repository.js';
import { OrderRepository } from '../repositories/order.repository.js';

export interface AcceptOfferOptions {
  shippingAddressId?: string | null;
  billingAddressId?: string | null;
}

export class MarketplaceService {
  private readonly listings: ListingRepository;
  private readonly offers: OfferRepository;
  private readonly orders: OrderRepository;
  private readonly disputes: DisputeRepository;

  constructor(prisma: PrismaClient) {
    this.listings = new ListingRepository(prisma);
    this.offers = new OfferRepository(prisma);
    this.orders = new OrderRepository(prisma);
    this.disputes = new DisputeRepository(prisma);
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

    return this.orders.createOrder({
      listingId: offer.listing.id,
      buyerId: offer.buyerId,
      sellerId: offer.listing.sellerId,
      offerId: offer.id,
      totalAmount: offer.amount,
      currency: offer.listing.currency ?? 'USD',
      shippingAddressId: options.shippingAddressId ?? null,
      billingAddressId: options.billingAddressId ?? null
    });
  }

  async fulfillOrder(orderId: string, trackingNumber: string) {
    await this.orders.updateStatus(orderId, OrderStatus.FULFILLED);
    await this.orders.addTimelineEvent(orderId, OrderEventType.SHIPPED, 'Order marked as shipped by seller');
    return this.orders.createShipment(orderId, trackingNumber);
  }

  async raiseDispute(orderId: string, raisedById: string, reason: string, initialMessage: string) {
    const dispute = await this.disputes.openDispute({
      orderId,
      raisedById,
      reason,
      initialMessage
    });

    await this.orders.addTimelineEvent(orderId, OrderEventType.DISPUTE_OPENED, 'Buyer raised a dispute');
    return dispute;
  }

  getActiveListingsForSeller(sellerId: string) {
    return this.listings.findListings({ sellerId, status: ListingStatus.ACTIVE });
  }
}
