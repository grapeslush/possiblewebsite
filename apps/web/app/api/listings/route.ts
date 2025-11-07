import { ListingStatus, TackleCategory, TackleCondition, WaterType } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma, ListingRepository } from '@possiblewebsite/db';

import { incrementMetric, logger, withTiming } from '@/lib/observability';

const repository = new ListingRepository(prisma);

const imageSchema = z.object({
  url: z.string().url(),
  altText: z.string().nullable().optional(),
  position: z.number().int().min(0).optional(),
  isPrimary: z.boolean().optional()
});

const createSchema = z.object({
  sellerId: z.string().uuid(),
  title: z.string().min(3),
  description: z.string().min(16),
  price: z.union([z.number(), z.string()]),
  currency: z.string().min(3).max(3).default('USD'),
  quantity: z.number().int().min(1).max(1000).default(1),
  category: z.string().min(2).max(60).optional(),
  tags: z.array(z.string().min(2)).max(12).optional(),
  brand: z.string().min(2).max(120),
  modelName: z.string().min(1).max(120).optional(),
  condition: z.nativeEnum(TackleCondition).default(TackleCondition.GOOD),
  tackleCategory: z.nativeEnum(TackleCategory).optional(),
  waterType: z.nativeEnum(WaterType).optional(),
  lureStyle: z.string().min(2).max(120).optional(),
  targetSpecies: z.array(z.string().min(2).max(60)).max(12).default([]),
  techniqueTags: z.array(z.string().min(2).max(60)).max(12).default([]),
  seasonalUse: z.array(z.string().min(2).max(60)).max(6).default([]),
  lineRatingLbMin: z.number().int().min(1).max(200).optional(),
  lineRatingLbMax: z.number().int().min(1).max(200).optional(),
  rodPower: z.string().min(2).max(60).optional(),
  rodAction: z.string().min(2).max(60).optional(),
  gearRatio: z.string().min(1).max(30).optional(),
  bearingCount: z.number().int().min(0).max(20).optional(),
  maxDragLb: z.number().positive().max(150).optional(),
  weightOz: z.number().positive().max(160).optional(),
  lengthIn: z.number().positive().max(144).optional(),
  customNotes: z.string().max(2000).optional(),
  autoAcceptOfferCents: z.number().int().min(0).max(1000000).optional(),
  minimumOfferCents: z.number().int().min(0).max(1000000).optional(),
  shippingProfileId: z.string().uuid().optional(),
  shippingWeightOz: z.number().positive().max(800).optional(),
  shippingLengthIn: z.number().positive().max(120).optional(),
  shippingWidthIn: z.number().positive().max(120).optional(),
  shippingHeightIn: z.number().positive().max(120).optional(),
  handlingTimeDays: z.number().int().min(0).max(14).optional(),
  featuredPhotoUrl: z.string().url().optional(),
  compliancePolicyId: z.string().uuid().optional(),
  seoKeywords: z.array(z.string().min(2).max(40)).max(24).optional(),
  publish: z.boolean().default(false),
  images: z.array(imageSchema).min(1)
}).superRefine((data, ctx) => {
  if (
    data.lineRatingLbMin !== undefined &&
    data.lineRatingLbMax !== undefined &&
    data.lineRatingLbMin > data.lineRatingLbMax
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Minimum line rating must be less than or equal to maximum line rating.',
      path: ['lineRatingLbMin']
    });
  }

  if (
    data.autoAcceptOfferCents !== undefined &&
    data.minimumOfferCents !== undefined &&
    data.autoAcceptOfferCents < data.minimumOfferCents
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Auto-accept offer threshold must be higher than or equal to the minimum offer.',
      path: ['autoAcceptOfferCents']
    });
  }
});

const searchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  limit: z.coerce.number().optional()
});

function slugify(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80);
}

async function ensureUniqueSlug(base: string) {
  let attempt = 0;
  let slugCandidate = base;

  while (attempt < 5) {
    // eslint-disable-next-line no-await-in-loop
    const existing = await prisma.listing.findUnique({ where: { slug: slugCandidate } });
    if (!existing) {
      return slugCandidate;
    }
    attempt += 1;
    slugCandidate = `${base}-${attempt}`;
  }

  return `${base}-${Date.now()}`;
}

export async function GET(request: NextRequest) {
  return withTiming('listings.search', async () => {
    const parsed = searchSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!parsed.success) {
      incrementMetric('listings.search.validation_error');
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
    }

    const listings = await repository.searchListings({
      term: parsed.data.q,
      category: parsed.data.category,
      minPrice: parsed.data.minPrice,
      maxPrice: parsed.data.maxPrice,
      limit: parsed.data.limit
    });

    logger.info('listing search completed', {
      term: parsed.data.q,
      category: parsed.data.category,
      resultCount: listings.length
    });

    incrementMetric('listings.search.success');
    return NextResponse.json({ listings });
  });
}

export async function POST(request: NextRequest) {
  return withTiming('listings.create', async () => {
    const json = await request.json().catch(() => null);
    const parsed = createSchema.safeParse(json);

    if (!parsed.success) {
      incrementMetric('listings.create.validation_error');
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const baseSlug = slugify(parsed.data.title);
    const slug = await ensureUniqueSlug(baseSlug);

    const listing = await repository.createListing({
      sellerId: parsed.data.sellerId,
      title: parsed.data.title,
      slug,
      description: parsed.data.description,
      price: parsed.data.price,
      currency: parsed.data.currency,
      quantity: parsed.data.quantity,
      category: parsed.data.category,
      tags: parsed.data.tags,
      brand: parsed.data.brand,
      modelName: parsed.data.modelName,
      condition: parsed.data.condition,
      tackleCategory: parsed.data.tackleCategory,
      waterType: parsed.data.waterType,
      lureStyle: parsed.data.lureStyle,
      targetSpecies: parsed.data.targetSpecies,
      techniqueTags: parsed.data.techniqueTags,
      seasonalUse: parsed.data.seasonalUse,
      lineRatingLbMin: parsed.data.lineRatingLbMin,
      lineRatingLbMax: parsed.data.lineRatingLbMax,
      rodPower: parsed.data.rodPower,
      rodAction: parsed.data.rodAction,
      gearRatio: parsed.data.gearRatio,
      bearingCount: parsed.data.bearingCount,
      maxDragLb: parsed.data.maxDragLb,
      weightOz: parsed.data.weightOz,
      lengthIn: parsed.data.lengthIn,
      customNotes: parsed.data.customNotes,
      autoAcceptOfferCents: parsed.data.autoAcceptOfferCents,
      minimumOfferCents: parsed.data.minimumOfferCents,
      shippingProfileId: parsed.data.shippingProfileId,
      shippingWeightOz: parsed.data.shippingWeightOz,
      shippingLengthIn: parsed.data.shippingLengthIn,
      shippingWidthIn: parsed.data.shippingWidthIn,
      shippingHeightIn: parsed.data.shippingHeightIn,
      handlingTimeDays: parsed.data.handlingTimeDays,
      featuredPhotoUrl: parsed.data.featuredPhotoUrl,
      compliancePolicyId: parsed.data.compliancePolicyId,
      seoKeywords: parsed.data.seoKeywords,
      images: parsed.data.images
    });

    if (parsed.data.publish) {
      await prisma.listing.update({
        where: { id: listing.id },
        data: {
          status: ListingStatus.ACTIVE,
          publishedAt: new Date()
        }
      });
    }

    logger.info('listing created', {
      sellerId: parsed.data.sellerId,
      listingId: listing.id,
      publish: parsed.data.publish
    });

    incrementMetric('listings.create.success');

    return NextResponse.json({
      listing: {
        ...listing,
        slug,
        status: parsed.data.publish ? ListingStatus.ACTIVE : ListingStatus.DRAFT
      }
    });
  });
}
