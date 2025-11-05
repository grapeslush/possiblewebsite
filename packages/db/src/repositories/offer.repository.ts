import { OfferStatus, Prisma, PrismaClient } from '@prisma/client';
import { toDecimal } from '../utils/decimal.js';

export interface CreateOfferInput {
  listingId: string;
  buyerId: string;
  amount: number | string | Prisma.Decimal;
  message?: string | null;
  expiresAt?: Date | null;
}

export class OfferRepository {
  constructor(private readonly prisma: PrismaClient) {}

  createOffer(input: CreateOfferInput) {
    return this.prisma.offer.create({
      data: {
        listingId: input.listingId,
        buyerId: input.buyerId,
        amount: toDecimal(input.amount),
        message: input.message ?? undefined,
        expiresAt: input.expiresAt ?? undefined
      }
    });
  }

  updateStatus(offerId: string, status: OfferStatus) {
    return this.prisma.offer.update({
      where: { id: offerId },
      data: { status, respondedAt: new Date() }
    });
  }

  listOffersForListing(listingId: string) {
    return this.prisma.offer.findMany({
      where: { listingId },
      include: {
        buyer: {
          select: { id: true, displayName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  findBestOffer(listingId: string) {
    return this.prisma.offer.findFirst({
      where: {
        listingId,
        status: { in: [OfferStatus.PENDING, OfferStatus.ACCEPTED] }
      },
      orderBy: { amount: 'desc' }
    });
  }

  getOfferWithDetails(offerId: string) {
    return this.prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        listing: {
          select: {
            id: true,
            sellerId: true,
            price: true,
            currency: true
          }
        },
        buyer: {
          select: { id: true }
        }
      }
    });
  }
}
