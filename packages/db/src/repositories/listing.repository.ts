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

export interface SearchFilters {
  term?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
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

  async getListingBySlug(slug: string) {
    return this.prisma.listing.findUnique({
      where: { slug },
      include: {
        seller: true,
        images: {
          orderBy: { position: 'asc' }
        },
        offers: {
          orderBy: { createdAt: 'desc' },
          include: {
            buyer: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true
              }
            }
          }
        }
      }
    });
  }

  async searchListings(filters: SearchFilters = {}) {
    const limit = Math.min(filters.limit ?? 24, 50);
    const hasTerm = Boolean(filters.term && filters.term.trim().length > 0);

    const baseWhere: Prisma.ListingWhereInput = {
      status: ListingStatus.ACTIVE,
      category: filters.category,
      price: {
        gte: filters.minPrice ? new Prisma.Decimal(filters.minPrice) : undefined,
        lte: filters.maxPrice ? new Prisma.Decimal(filters.maxPrice) : undefined
      }
    };

    if (!hasTerm) {
      return this.prisma.listing.findMany({
        where: baseWhere,
        include: {
          seller: {
            select: { id: true, displayName: true, avatarUrl: true }
          },
          images: {
            orderBy: { position: 'asc' }
          }
        },
        orderBy: [
          { publishedAt: 'desc' },
          { createdAt: 'desc' }
        ],
        take: limit
      });
    }

    try {
      const term = filters.term?.trim() ?? '';
      const rows = await this.prisma.$queryRaw<{ id: string }[]>`
        SELECT l."id"
        FROM "Listing" AS l
        WHERE l."status" = ${ListingStatus.ACTIVE}
          ${filters.category ? Prisma.sql`AND l."category" = ${filters.category}` : Prisma.empty}
          ${filters.minPrice ? Prisma.sql`AND l."price" >= ${new Prisma.Decimal(filters.minPrice)}` : Prisma.empty}
          ${filters.maxPrice ? Prisma.sql`AND l."price" <= ${new Prisma.Decimal(filters.maxPrice)}` : Prisma.empty}
          AND (l."title" % ${term} OR l."description" % ${term})
        ORDER BY similarity(l."title", ${term}) DESC, l."publishedAt" DESC NULLS LAST
        LIMIT ${limit}
      `;

      const ids = rows.map((row) => row.id);
      if (ids.length === 0) {
        return [];
      }

      const listings = await this.prisma.listing.findMany({
        where: { id: { in: ids } },
        include: {
          seller: {
            select: { id: true, displayName: true, avatarUrl: true }
          },
          images: {
            orderBy: { position: 'asc' }
          }
        }
      });

      const listingById = new Map(listings.map((listing) => [listing.id, listing]));
      return ids
        .map((id) => listingById.get(id))
        .filter((listing): listing is NonNullable<typeof listing> => Boolean(listing));
    } catch (error) {
      // pg_trgm might not be available; fall back to ILIKE search
      return this.prisma.listing.findMany({
        where: {
          ...baseWhere,
          OR: [
            { title: { contains: filters.term ?? '', mode: 'insensitive' } },
            { description: { contains: filters.term ?? '', mode: 'insensitive' } }
          ]
        },
        include: {
          seller: {
            select: { id: true, displayName: true, avatarUrl: true }
          },
          images: {
            orderBy: { position: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      });
    }
  }
}
