import {
  ListingStatus,
  Prisma,
  PrismaClient,
  TackleCategory,
  TackleCondition,
  WaterType,
} from '@prisma/client';
import { toDecimal } from '../utils/decimal';

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
  brand: string;
  modelName?: string | null;
  condition?: TackleCondition;
  tackleCategory?: TackleCategory | null;
  waterType?: WaterType | null;
  lureStyle?: string | null;
  targetSpecies?: string[];
  techniqueTags?: string[];
  seasonalUse?: string[];
  lineRatingLbMin?: number | null;
  lineRatingLbMax?: number | null;
  rodPower?: string | null;
  rodAction?: string | null;
  gearRatio?: string | null;
  bearingCount?: number | null;
  maxDragLb?: number | string | Prisma.Decimal | null;
  weightOz?: number | string | Prisma.Decimal | null;
  lengthIn?: number | string | Prisma.Decimal | null;
  customNotes?: string | null;
  autoAcceptOfferCents?: number | null;
  minimumOfferCents?: number | null;
  shippingProfileId?: string | null;
  shippingWeightOz?: number | string | Prisma.Decimal | null;
  shippingLengthIn?: number | string | Prisma.Decimal | null;
  shippingWidthIn?: number | string | Prisma.Decimal | null;
  shippingHeightIn?: number | string | Prisma.Decimal | null;
  handlingTimeDays?: number | null;
  featuredPhotoUrl?: string | null;
  compliancePolicyId?: string | null;
  seoKeywords?: string[];
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
        brand: input.brand,
        modelName: input.modelName ?? undefined,
        condition: input.condition ?? TackleCondition.GOOD,
        tackleCategory: input.tackleCategory ?? undefined,
        waterType: input.waterType ?? undefined,
        lureStyle: input.lureStyle ?? undefined,
        targetSpecies: input.targetSpecies ?? [],
        techniqueTags: input.techniqueTags ?? [],
        seasonalUse: input.seasonalUse ?? [],
        lineRatingLbMin: input.lineRatingLbMin ?? undefined,
        lineRatingLbMax: input.lineRatingLbMax ?? undefined,
        rodPower: input.rodPower ?? undefined,
        rodAction: input.rodAction ?? undefined,
        gearRatio: input.gearRatio ?? undefined,
        bearingCount: input.bearingCount ?? undefined,
        maxDragLb:
          input.maxDragLb === undefined
            ? undefined
            : input.maxDragLb === null
              ? null
              : toDecimal(input.maxDragLb),
        weightOz:
          input.weightOz === undefined
            ? undefined
            : input.weightOz === null
              ? null
              : toDecimal(input.weightOz),
        lengthIn:
          input.lengthIn === undefined
            ? undefined
            : input.lengthIn === null
              ? null
              : toDecimal(input.lengthIn),
        customNotes: input.customNotes ?? undefined,
        autoAcceptOfferCents: input.autoAcceptOfferCents ?? undefined,
        minimumOfferCents: input.minimumOfferCents ?? undefined,
        shippingProfileId: input.shippingProfileId ?? undefined,
        shippingWeightOz:
          input.shippingWeightOz === undefined
            ? undefined
            : input.shippingWeightOz === null
              ? null
              : toDecimal(input.shippingWeightOz),
        shippingLengthIn:
          input.shippingLengthIn === undefined
            ? undefined
            : input.shippingLengthIn === null
              ? null
              : toDecimal(input.shippingLengthIn),
        shippingWidthIn:
          input.shippingWidthIn === undefined
            ? undefined
            : input.shippingWidthIn === null
              ? null
              : toDecimal(input.shippingWidthIn),
        shippingHeightIn:
          input.shippingHeightIn === undefined
            ? undefined
            : input.shippingHeightIn === null
              ? null
              : toDecimal(input.shippingHeightIn),
        handlingTimeDays: input.handlingTimeDays ?? undefined,
        featuredPhotoUrl: input.featuredPhotoUrl ?? undefined,
        compliancePolicyId: input.compliancePolicyId ?? undefined,
        seoKeywords: input.seoKeywords ?? [],
        images: input.images
          ? {
              create: input.images.map((image, index) => ({
                url: image.url,
                altText: image.altText ?? null,
                position: image.position ?? index,
                isPrimary: image.isPrimary ?? index === 0,
              })),
            }
          : undefined,
      },
      include: {
        images: true,
        shippingProfile: true,
        compliancePolicy: true,
      },
    });
  }

  publishListing(listingId: string) {
    return this.prisma.listing.update({
      where: { id: listingId },
      data: {
        status: ListingStatus.ACTIVE,
        publishedAt: new Date(),
      },
    });
  }

  archiveListing(listingId: string) {
    return this.prisma.listing.update({
      where: { id: listingId },
      data: {
        status: ListingStatus.ARCHIVED,
        archivedAt: new Date(),
      },
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
              { description: { contains: filters.searchTerm, mode: 'insensitive' } },
            ]
          : undefined,
      },
      include: {
        seller: {
          select: {
            id: true,
            displayName: true,
          },
        },
        images: {
          orderBy: {
            position: 'asc',
          },
        },
        shippingProfile: true,
        compliancePolicy: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
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
              select: { id: true, displayName: true },
            },
          },
        },
      },
    });
  }

  async getListingBySlug(slug: string) {
    return this.prisma.listing.findUnique({
      where: { slug },
      include: {
        seller: true,
        images: {
          orderBy: { position: 'asc' },
        },
        shippingProfile: true,
        compliancePolicy: true,
        offers: {
          orderBy: { createdAt: 'desc' },
          include: {
            buyer: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
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
        lte: filters.maxPrice ? new Prisma.Decimal(filters.maxPrice) : undefined,
      },
    };

    if (!hasTerm) {
      return this.prisma.listing.findMany({
        where: baseWhere,
        include: {
          seller: {
            select: { id: true, displayName: true, avatarUrl: true },
          },
          images: {
            orderBy: { position: 'asc' },
          },
        },
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        take: limit,
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
            select: { id: true, displayName: true, avatarUrl: true },
          },
          images: {
            orderBy: { position: 'asc' },
          },
          shippingProfile: true,
        },
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
            { description: { contains: filters.term ?? '', mode: 'insensitive' } },
          ],
        },
        include: {
          seller: {
            select: { id: true, displayName: true, avatarUrl: true },
          },
          images: {
            orderBy: { position: 'asc' },
          },
          shippingProfile: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    }
  }
}
