import { ListingStatus, Prisma, PrismaClient } from '@prisma/client';
import { toDecimal } from '../utils/decimal.js';

export interface CreateListingInput {
  sellerId: string;
  title: string;
  slug: string;
  description: string;
  price: number | string | Prisma.Decimal;
  currency?: string;
  quantity?: number;
  category?: string | null;
  tags?: string[];
  images?: { url: string; altText?: string | null; position?: number; isPrimary?: boolean }[];
}

export interface ListingFilters {
  sellerId?: string;
  status?: ListingStatus;
  searchTerm?: string;
  category?: string;
}

export class ListingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  createListing(input: CreateListingInput) {
    return this.prisma.listing.create({
      data: {
        sellerId: input.sellerId,
        title: input.title,
        slug: input.slug,
        description: input.description,
        price: toDecimal(input.price),
        currency: input.currency ?? 'USD',
        quantity: input.quantity ?? 1,
        category: input.category ?? undefined,
        tags: input.tags ?? [],
        images: input.images
          ? {
              create: input.images.map((image, index) => ({
                url: image.url,
                altText: image.altText ?? null,
                position: image.position ?? index,
                isPrimary: image.isPrimary ?? index === 0
              }))
            }
          : undefined
      },
      include: {
        images: true
      }
    });
  }

  publishListing(listingId: string) {
    return this.prisma.listing.update({
      where: { id: listingId },
      data: {
        status: ListingStatus.ACTIVE,
        publishedAt: new Date()
      }
    });
  }

  archiveListing(listingId: string) {
    return this.prisma.listing.update({
      where: { id: listingId },
      data: {
        status: ListingStatus.ARCHIVED,
        archivedAt: new Date()
      }
    });
  }

  findListings(filters: ListingFilters) {
    return this.prisma.listing.findMany({
      where: {
        sellerId: filters.sellerId,
        status: filters.status,
        category: filters.category,
        OR: filters.searchTerm
          ? [
              { title: { contains: filters.searchTerm, mode: 'insensitive' } },
              { description: { contains: filters.searchTerm, mode: 'insensitive' } }
            ]
          : undefined
      },
      include: {
        seller: {
          select: {
            id: true,
            displayName: true
          }
        },
        images: {
          orderBy: {
            position: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  getListingWithOffers(listingId: string) {
    return this.prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        seller: true,
        offers: {
          orderBy: { createdAt: 'desc' },
          include: {
            buyer: {
              select: { id: true, displayName: true }
            }
          }
        }
      }
    });
  }
}
