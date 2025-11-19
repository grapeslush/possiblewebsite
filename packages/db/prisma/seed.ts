import 'dotenv/config';
import path from 'path';
import { readFileSync } from 'fs';
import {
  AddressType,
  DisputeStatus,
  HelpArticleStatus,
  ListingStatus,
  MessageType,
  NotificationType,
  OfferStatus,
  OrderEventType,
  OrderStatus,
  PaymentStatus,
  PayoutStatus,
  Prisma,
  PrismaClient,
  ReviewStatus,
  ShipmentStatus,
  ShipmentTrackingStatus,
  ThreadType,
  TackleCategory,
  TackleCondition,
} from '@prisma/client';

import { buildCatalog, getVariants } from './seed-data/catalog';
import {
  ADMIN_USER,
  BUYER_SEEDS,
  DEMO_PASSWORD_HASH,
  SELLER_SEEDS,
  SUPPORT_USER,
  PolicyAcceptanceSeed,
  UserSeed,
} from './seed-data/users';
import { SHIPPING_TEMPLATES } from './seed-data/shipping';

const prisma = new PrismaClient();

async function clearDatabase() {
  await prisma.$transaction([
    prisma.reviewModerationDecision.deleteMany(),
    prisma.review.deleteMany(),
    prisma.orderMessage.deleteMany(),
    prisma.cartItem.deleteMany(),
    prisma.cart.deleteMany(),
    prisma.paymentIntent.deleteMany(),
    prisma.payout.deleteMany(),
    prisma.shipment.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.orderTimelineEvent.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.disputeMessage.deleteMany(),
    prisma.dispute.deleteMany(),
    prisma.order.deleteMany(),
    prisma.offer.deleteMany(),
    prisma.listingImage.deleteMany(),
    prisma.recommendationCache.deleteMany(),
    prisma.listing.deleteMany(),
    prisma.shippingProfile.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.notificationSetting.deleteMany(),
    prisma.threadParticipant.deleteMany(),
    prisma.message.deleteMany(),
    prisma.thread.deleteMany(),
    prisma.helpArticle.deleteMany(),
    prisma.policyAcceptance.deleteMany(),
    prisma.policy.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.address.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

type PolicyRecord = Map<string, { id: string; version: string }>;

type CreatedUserRecord = {
  user: Awaited<ReturnType<typeof prisma.user.create>>;
  shippingAddressId: string;
  billingAddressId: string;
};

const policyDefinitions = [
  {
    slug: 'marketplace-terms-of-service',
    title: 'Marketplace Terms of Service',
    category: 'compliance',
    version: '2024.06',
    summary: 'Core marketplace terms for buyers and sellers.',
    body: `## Marketplace Terms\n\nAll demo accounts operate under simulated escrow conditions. Payments route through a sandbox Stripe Connect account and payouts are only released after fulfillment checks.`,
    isRequiredForBuyers: true,
    isRequiredForSellers: true,
  },
  {
    slug: 'seller-trust-and-safety',
    title: 'Seller Trust & Safety Policy',
    category: 'trust-and-safety',
    version: '2024.06',
    summary: 'Escrow, provenance, and authenticity obligations for sellers.',
    body: `## Seller Trust & Safety\n\nEvery listing must include an AI provenance note and comply with shipping SLAs. Violations lead to payout holds managed by the support pod.`,
    isRequiredForSellers: true,
  },
  {
    slug: 'age-and-consent',
    title: 'Age & Consent Policy',
    category: 'compliance',
    version: '2024.04',
    summary: 'Confirms that participants are over 18 and authorized to engage in commerce.',
    body: `## Age Verification\n\nDemo participants attest they are of legal age and consent to Possible Tackle Exchange storing onboarding data for compliance drills.`,
    isRequiredForBuyers: true,
    isRequiredForSellers: true,
  },
];

async function seedPolicies(): Promise<PolicyRecord> {
  const records = await Promise.all(
    policyDefinitions.map((definition) =>
      prisma.policy.create({
        data: {
          slug: definition.slug,
          title: definition.title,
          category: definition.category,
          version: definition.version,
          summary: definition.summary,
          body: definition.body,
          isRequiredForBuyers: definition.isRequiredForBuyers ?? false,
          isRequiredForSellers: definition.isRequiredForSellers ?? false,
          isActive: true,
          publishedAt: new Date('2024-05-01T12:00:00Z'),
        },
      }),
    ),
  );

  return new Map(
    records.map((policy) => [policy.slug, { id: policy.id, version: policy.version }]),
  );
}

let addressCounter = 100;

function buildPolicyAcceptanceData(policyMap: PolicyRecord, policies: PolicyAcceptanceSeed[]) {
  return policies.map((policySeed) => {
    const policy = policyMap.get(policySeed.slug);
    if (!policy) {
      throw new Error(`Missing policy definition for ${policySeed.slug}`);
    }

    return {
      policyId: policy.id,
      policyVersion: policySeed.version,
      acceptedAt: new Date('2024-06-01T10:00:00Z'),
      ipAddress: '203.0.113.24',
    };
  });
}

async function createUser(
  seed: UserSeed,
  policyMap: PolicyRecord,
  roleDefaults: { city: string; state: string; postalCode: string; country: string },
): Promise<CreatedUserRecord> {
  const city = seed.city ?? roleDefaults.city;
  const state = seed.state ?? roleDefaults.state;
  const postalCode = seed.postalCode ?? roleDefaults.postalCode;
  const country = seed.country ?? roleDefaults.country;

  const user = await prisma.user.create({
    data: {
      id: seed.id,
      email: seed.email,
      passwordHash: DEMO_PASSWORD_HASH,
      displayName: seed.displayName,
      role: seed.role,
      phoneNumber: seed.phoneNumber,
      avatarUrl: seed.avatarUrl,
      bio: seed.bio,
      stripeCustomerId: seed.stripeCustomerId,
      stripeConnectId: seed.stripeConnectId,
      marketingOptIn: seed.marketingOptIn ?? false,
      emailVerified: new Date('2024-04-15T15:30:00Z'),
      dateOfBirth: new Date('1988-03-12T00:00:00Z'),
      ageVerifiedAt: new Date('2024-04-10T09:00:00Z'),
      policyAcceptances: {
        create: buildPolicyAcceptanceData(policyMap, seed.policies),
      },
      notificationSettings: {
        create: [
          {
            type: NotificationType.OFFER_RECEIVED,
            emailEnabled: true,
            inAppEnabled: true,
          },
          {
            type: NotificationType.ORDER_UPDATED,
            emailEnabled: true,
            inAppEnabled: true,
          },
        ],
      },
    },
  });

  addressCounter += 1;
  const lineNumber = addressCounter;
  const shipping = await prisma.address.create({
    data: {
      userId: user.id,
      label: 'Primary Shipping',
      type: AddressType.SHIPPING,
      line1: `${lineNumber} Lakeview Trail`,
      city,
      state,
      postalCode,
      country,
      isDefault: true,
    },
  });

  const billing = await prisma.address.create({
    data: {
      userId: user.id,
      label: 'Billing',
      type: AddressType.BILLING,
      line1: `${lineNumber} Harbor Plaza Suite 2`,
      city,
      state,
      postalCode,
      country,
      isDefault: false,
    },
  });

  return { user, shippingAddressId: shipping.id, billingAddressId: billing.id };
}

async function seedUsers(policyMap: PolicyRecord) {
  const admin = await createUser(ADMIN_USER, policyMap, {
    city: 'Austin',
    state: 'TX',
    postalCode: '78701',
    country: 'US',
  });

  const support = await createUser(SUPPORT_USER, policyMap, {
    city: 'Austin',
    state: 'TX',
    postalCode: '78701',
    country: 'US',
  });

  const sellers = [] as CreatedUserRecord[];
  for (const sellerSeed of SELLER_SEEDS) {
    sellers.push(
      await createUser(sellerSeed, policyMap, {
        city: 'Dallas',
        state: 'TX',
        postalCode: '75201',
        country: 'US',
      }),
    );
  }

  const buyers = [] as CreatedUserRecord[];
  for (const buyerSeed of BUYER_SEEDS) {
    buyers.push(
      await createUser(buyerSeed, policyMap, {
        city: 'Chicago',
        state: 'IL',
        postalCode: '60601',
        country: 'US',
      }),
    );
  }

  return { admin, support, sellers, buyers };
}

async function seedShippingProfiles(sellers: CreatedUserRecord[]) {
  const profileMap = new Map<string, Map<string, string>>();

  for (const seller of sellers) {
    const sellerProfiles = await Promise.all(
      SHIPPING_TEMPLATES.map((template) =>
        prisma.shippingProfile.create({
          data: {
            sellerId: seller.user.id,
            label: `${seller.user.displayName.split(' ')[0]} ${template.label}`,
            courierPreference: template.courierPreference,
            serviceLevel: template.serviceLevel,
            shipFromCity: 'Austin',
            shipFromState: 'TX',
            shipFromPostalCode: '78701',
            shipFromCountry: 'US',
            packageType: template.packageType,
            packageWeightOz: new Prisma.Decimal(template.weightOz),
            packageLengthIn: new Prisma.Decimal(template.lengthIn),
            packageWidthIn: new Prisma.Decimal(template.widthIn),
            packageHeightIn: new Prisma.Decimal(template.heightIn),
            insurancePreferred: template.insuranceAmountCents > 10000,
            insuranceAmountCents: template.insuranceAmountCents,
            signatureRequired: template.signatureRequired,
            handlingNotes: template.handlingNotes,
          },
        }),
      ),
    );

    profileMap.set(
      seller.user.id,
      new Map(
        sellerProfiles.map((profile, index) => [
          SHIPPING_TEMPLATES[index]?.key ?? profile.id,
          profile.id,
        ]),
      ),
    );
  }

  return profileMap;
}

function slugify(title: string, index: number) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `${base}-${index.toString().padStart(3, '0')}`;
}

type ListingRecord = Awaited<ReturnType<typeof prisma.listing.create>>;

type ListingWithSeller = {
  listing: ListingRecord;
  seller: CreatedUserRecord;
};

async function seedListings(
  sellers: CreatedUserRecord[],
  supportUserId: string,
  shippingProfiles: Map<string, Map<string, string>>,
) {
  const catalog = buildCatalog();
  const variants = getVariants();

  const listings: ListingWithSeller[] = [];
  let counter = 1;

  for (const [catalogIndex, product] of catalog.entries()) {
    for (const variant of variants) {
      const seller = sellers[(catalogIndex + listings.length) % sellers.length]!;
      const slug = slugify(`${product.baseTitle}${variant.suffix}`, counter);
      counter += 1;

      const shippingProfileId = shippingProfiles
        .get(seller.user.id)
        ?.get(product.shippingProfileKey);

      const shippingTemplate = SHIPPING_TEMPLATES.find(
        (template) => template.key === product.shippingProfileKey,
      );

      if (!shippingProfileId) {
        throw new Error(
          `Missing shipping profile ${product.shippingProfileKey} for seller ${seller.user.displayName}`,
        );
      }

      const priceValue = Number((product.price * variant.priceMultiplier).toFixed(2));
      const price = new Prisma.Decimal(priceValue);
      const autoAccept = Math.round(priceValue * 100 * 0.96);
      const minimumOffer = Math.round(priceValue * 100 * 0.82);

      const listing = await prisma.listing.create({
        data: {
          sellerId: seller.user.id,
          title: `${product.baseTitle}${variant.suffix}`,
          slug,
          description: product.description,
          price,
          quantity: 1,
          status: variant.status,
          category: product.tackleCategory,
          tags: [
            ...product.techniqueTags,
            ...product.seasonalUse.map((season) => `${season.toLowerCase()}-season`),
          ],
          brand: product.brand,
          modelName: product.modelName,
          condition: variant.condition,
          tackleCategory: product.tackleCategory,
          waterType: product.waterType,
          lureStyle: product.lureStyle,
          targetSpecies: product.targetSpecies,
          techniqueTags: product.techniqueTags,
          seasonalUse: product.seasonalUse,
          lineRatingLbMin: product.lineRating?.min,
          lineRatingLbMax: product.lineRating?.max,
          rodPower: product.rodPower,
          rodAction: product.rodAction,
          gearRatio: product.gearRatio,
          bearingCount: product.bearingCount ?? undefined,
          maxDragLb: product.maxDragLb ? new Prisma.Decimal(product.maxDragLb) : undefined,
          weightOz: product.weightOz ? new Prisma.Decimal(product.weightOz) : undefined,
          lengthIn: product.lengthIn ? new Prisma.Decimal(product.lengthIn) : undefined,
          customNotes: `${product.aiNotes} | AI provenance: ${variant.provenance}`,
          autoAcceptOfferCents: autoAccept,
          minimumOfferCents: minimumOffer,
          shippingProfileId,
          shippingWeightOz: shippingTemplate
            ? new Prisma.Decimal(shippingTemplate.weightOz)
            : new Prisma.Decimal(32),
          shippingLengthIn: shippingTemplate
            ? new Prisma.Decimal(shippingTemplate.lengthIn)
            : new Prisma.Decimal(Math.max(product.lengthIn ?? 24, 18)),
          shippingWidthIn: shippingTemplate
            ? new Prisma.Decimal(shippingTemplate.widthIn)
            : new Prisma.Decimal(variant.condition === TackleCondition.GOOD ? 8 : 6),
          shippingHeightIn: shippingTemplate
            ? new Prisma.Decimal(shippingTemplate.heightIn)
            : new Prisma.Decimal(product.tackleCategory === TackleCategory.LURE ? 4 : 6),
          handlingTimeDays: product.tackleCategory === 'ELECTRONICS' ? 3 : 2,
          featuredPhotoUrl: product.featuredAsset,
          seoKeywords: [
            product.brand.toLowerCase(),
            product.tackleCategory.toLowerCase(),
            ...product.techniqueTags,
          ],
          publishedAt:
            variant.status === ListingStatus.ACTIVE ? new Date('2024-06-05T12:00:00Z') : undefined,
          images: {
            create: product.gallery.map((asset, index) => ({
              url: asset,
              altText: `${product.baseTitle} photo ${index + 1}`,
              position: index,
              isPrimary: index === 0,
            })),
          },
        },
      });

      listings.push({ listing, seller });
    }
  }

  const heroListingSeller =
    sellers.find((seller) => seller.user.id === '11111111-1111-1111-1111-111111111111') ??
    sellers[0]!;

  await prisma.listing.updateMany({
    where: { sellerId: heroListingSeller.user.id, status: ListingStatus.DRAFT },
    data: { status: ListingStatus.ACTIVE, publishedAt: new Date('2024-06-07T15:00:00Z') },
  });

  return listings;
}

async function seedHelpCenter(adminId: string, policyMap: PolicyRecord) {
  const helpArticles = [
    {
      slug: 'escrow-and-compliance',
      title: 'How escrow and compliance work in the demo',
      summary: 'Overview of payment holds, provenance logs, and dispute routing.',
      path: 'docs/help/escrow-overview.md',
      category: 'escrow',
      policySlug: 'seller-trust-and-safety',
    },
    {
      slug: 'shipping-playbook',
      title: 'Packing and shipping checklist',
      summary: 'Category-specific tips for shipping rods, reels, and electronics safely.',
      path: 'docs/help/shipping-playbook.md',
      category: 'shipping',
      policySlug: 'marketplace-terms-of-service',
    },
    {
      slug: 'dispute-center',
      title: 'Dispute center runbook',
      summary: 'Step-by-step process when a buyer escalates an order.',
      path: 'docs/help/dispute-center.md',
      category: 'support',
      policySlug: 'marketplace-terms-of-service',
    },
    {
      slug: 'ai-content-review',
      title: 'AI content review notes',
      summary: 'Transparency into the AI provenance workflow on seeded listings.',
      path: 'docs/help/ai-content-review.md',
      category: 'ai',
      policySlug: 'seller-trust-and-safety',
    },
  ];

  for (const article of helpArticles) {
    const filePath = path.resolve(process.cwd(), article.path);
    const content = readFileSync(filePath, 'utf-8');
    const policy = policyMap.get(article.policySlug);

    await prisma.helpArticle.create({
      data: {
        slug: article.slug,
        title: article.title,
        summary: article.summary,
        content,
        status: HelpArticleStatus.PUBLISHED,
        category: article.category,
        authorId: adminId,
        relatedPolicyId: policy?.id,
        keywords: ['demo', 'escrow', 'support', 'compliance'],
        featuredImageUrl: '/seed-images/storage-tackle-tray.svg',
        readingTimeMinutes: 4,
        publishedAt: new Date('2024-06-06T13:00:00Z'),
      },
    });
  }
}

type MarketplaceUsers = ReturnType<typeof seedUsers> extends Promise<infer R> ? R : never;

type ListingSeedResult = Awaited<ReturnType<typeof seedListings>>;

type AddressMap = Map<string, { shipping: string; billing: string }>;

function buildAddressMap(users: MarketplaceUsers): AddressMap {
  const map: AddressMap = new Map();
  map.set(users.admin.user.id, {
    shipping: users.admin.shippingAddressId,
    billing: users.admin.billingAddressId,
  });
  map.set(users.support.user.id, {
    shipping: users.support.shippingAddressId,
    billing: users.support.billingAddressId,
  });
  users.sellers.forEach((seller) => {
    map.set(seller.user.id, {
      shipping: seller.shippingAddressId,
      billing: seller.billingAddressId,
    });
  });
  users.buyers.forEach((buyer) => {
    map.set(buyer.user.id, { shipping: buyer.shippingAddressId, billing: buyer.billingAddressId });
  });
  return map;
}

async function seedMarketplaceActivity(
  users: MarketplaceUsers,
  listings: ListingSeedResult,
  addressMap: AddressMap,
) {
  const activeListings = listings.filter((entry) => entry.listing.status === ListingStatus.ACTIVE);
  const [listingA, listingB, listingC, listingD, listingE, listingF] = activeListings;
  const buyers = users.buyers.map((record) => record.user);
  const supportUser = users.support.user;

  if (!listingA || !listingB || !listingC || !listingD || !listingE || !listingF) {
    throw new Error('Not enough active listings to build marketplace scenarios');
  }

  const offerScenarios = [
    {
      status: OfferStatus.PENDING,
      listing: listingA,
      buyer: buyers[0]!,
      amount: listingA.listing.price.mul(new Prisma.Decimal(0.94)),
      message: 'Checking if you can include the original box? I can checkout today.',
    },
    {
      status: OfferStatus.ACCEPTED,
      listing: listingB,
      buyer: buyers[1]!,
      amount: listingB.listing.price.mul(new Prisma.Decimal(0.97)),
      message: 'Ready to buy if you can ship by tomorrow.',
    },
    {
      status: OfferStatus.DECLINED,
      listing: listingC,
      buyer: buyers[2]!,
      amount: listingC.listing.price.mul(new Prisma.Decimal(0.82)),
      message: 'Can you do a quick discount for bundle pricing?',
    },
    {
      status: OfferStatus.COUNTERED,
      listing: listingD,
      buyer: buyers[3]!,
      amount: listingD.listing.price.mul(new Prisma.Decimal(0.88)),
      counterAmount: listingD.listing.price.mul(new Prisma.Decimal(0.93)),
      message: 'Countering at 7% under asking to cover tournament shipping.',
    },
    {
      status: OfferStatus.WITHDRAWN,
      listing: listingE,
      buyer: buyers[4]!,
      amount: listingE.listing.price.mul(new Prisma.Decimal(0.9)),
      message: 'Withdrawing due to double booking. Will revisit after event.',
    },
    {
      status: OfferStatus.EXPIRED,
      listing: listingF,
      buyer: buyers[5]!,
      amount: listingF.listing.price.mul(new Prisma.Decimal(0.9)),
      message: 'Offer expired before seller responded.',
    },
  ];

  const createdOffers = [] as Awaited<ReturnType<typeof prisma.offer.create>>[];

  for (const offerScenario of offerScenarios) {
    const offer = await prisma.offer.create({
      data: {
        listingId: offerScenario.listing.listing.id,
        buyerId: offerScenario.buyer.id,
        amount: offerScenario.amount,
        status: offerScenario.status,
        message: offerScenario.message,
        counterAmount: offerScenario.counterAmount,
        respondedAt:
          offerScenario.status !== OfferStatus.PENDING
            ? new Date('2024-06-08T16:00:00Z')
            : undefined,
        expiresAt: new Date('2024-06-10T16:00:00Z'),
      },
    });

    createdOffers.push(offer);
  }

  const orderScenarios = [
    {
      listingEntry: listingA,
      offer: createdOffers[0]!,
      buyer: buyers[0]!,
      status: OrderStatus.PENDING,
      shipmentStatus: ShipmentStatus.PREPARING,
      trackingStatus: ShipmentTrackingStatus.LABEL_PURCHASED,
      paymentStatus: PaymentStatus.PENDING,
      payoutStatus: PayoutStatus.PENDING,
      withDispute: false,
      withReview: false,
    },
    {
      listingEntry: listingB,
      offer: createdOffers[1]!,
      buyer: buyers[1]!,
      status: OrderStatus.CONFIRMED,
      shipmentStatus: ShipmentStatus.SHIPPED,
      trackingStatus: ShipmentTrackingStatus.IN_TRANSIT,
      paymentStatus: PaymentStatus.COMPLETED,
      payoutStatus: PayoutStatus.PENDING,
      withDispute: false,
      withReview: false,
    },
    {
      listingEntry: listingC,
      offer: createdOffers[2]!,
      buyer: buyers[2]!,
      status: OrderStatus.FULFILLED,
      shipmentStatus: ShipmentStatus.DELIVERED,
      trackingStatus: ShipmentTrackingStatus.DELIVERED,
      paymentStatus: PaymentStatus.COMPLETED,
      payoutStatus: PayoutStatus.RELEASED,
      withDispute: false,
      withReview: true,
    },
    {
      listingEntry: listingD,
      offer: createdOffers[3]!,
      buyer: buyers[3]!,
      status: OrderStatus.CANCELLED,
      shipmentStatus: null,
      trackingStatus: null,
      paymentStatus: PaymentStatus.REFUNDED,
      payoutStatus: PayoutStatus.FAILED,
      withDispute: false,
      withReview: false,
    },
    {
      listingEntry: listingE,
      offer: createdOffers[4]!,
      buyer: buyers[4]!,
      status: OrderStatus.REFUNDED,
      shipmentStatus: ShipmentStatus.RETURNED,
      trackingStatus: ShipmentTrackingStatus.EXCEPTION,
      paymentStatus: PaymentStatus.REFUNDED,
      payoutStatus: PayoutStatus.FAILED,
      withDispute: false,
      withReview: false,
    },
    {
      listingEntry: listingF,
      offer: createdOffers[5]!,
      buyer: buyers[5]!,
      status: OrderStatus.DISPUTED,
      shipmentStatus: ShipmentStatus.DELIVERED,
      trackingStatus: ShipmentTrackingStatus.EXCEPTION,
      paymentStatus: PaymentStatus.COMPLETED,
      payoutStatus: PayoutStatus.PENDING,
      withDispute: true,
      withReview: true,
    },
  ];

  for (const scenario of orderScenarios) {
    const listing = scenario.listingEntry.listing;
    const seller = scenario.listingEntry.seller.user;
    const buyer = scenario.buyer;
    const shippingAddress = addressMap.get(buyer.id);
    const billingAddress = addressMap.get(buyer.id);

    const order = await prisma.order.create({
      data: {
        listingId: listing.id,
        buyerId: buyer.id,
        sellerId: seller.id,
        offerId: scenario.offer.id,
        status: scenario.status,
        totalAmount: scenario.offer.amount,
        currency: 'USD',
        quantity: 1,
        subtotalAmount: scenario.offer.amount,
        shippingAmount: new Prisma.Decimal(25),
        taxAmount: new Prisma.Decimal(3.5),
        serviceFeeAmount: new Prisma.Decimal(5.25),
        insuranceAmount: new Prisma.Decimal(4.5),
        shippingProfileId: listing.shippingProfileId ?? undefined,
        shippingAddressId: shippingAddress?.shipping,
        billingAddressId: billingAddress?.billing,
        buyerNote: 'Please include provenance memo and insured label.',
        sellerNote: 'Packed with foam corners and tamper seal applied.',
        tackleTechnique: listing.techniqueTags[0] ?? 'All-Purpose',
        targetSpecies: listing.targetSpecies,
        preferredDeliveryWindow: 'Within 5 days',
        isGift: false,
        timelineEvents: {
          create: [
            {
              type: OrderEventType.CREATED,
              detail: 'Order submitted by buyer',
              createdAt: new Date('2024-06-08T17:00:00Z'),
            },
            {
              type: OrderEventType.PAYMENT_CONFIRMED,
              detail: 'Escrow payment confirmed by system',
              createdAt: new Date('2024-06-08T17:10:00Z'),
            },
          ],
        },
        items: {
          create: [
            {
              listingId: listing.id,
              offerId: scenario.offer.id,
              quantity: 1,
              unitPrice: scenario.offer.amount,
            },
          ],
        },
      },
    });

    await prisma.orderMessage.create({
      data: {
        orderId: order.id,
        authorId: seller.id,
        body: 'Order acknowledged. Preparing AI provenance packet now.',
      },
    });

    await prisma.payment.create({
      data: {
        orderId: order.id,
        status: scenario.paymentStatus,
        amount: order.totalAmount,
        provider: 'stripe',
        transactionRef: `pi_demo_${order.id.split('-')[0]}`,
        paidAt:
          scenario.paymentStatus === PaymentStatus.COMPLETED
            ? new Date('2024-06-08T17:05:00Z')
            : undefined,
        currency: 'USD',
        applicationFeeAmount: new Prisma.Decimal(12.5),
        taxAmount: new Prisma.Decimal(3.5),
        escrowAmount: order.totalAmount,
      },
    });

    await prisma.paymentIntent.create({
      data: {
        orderId: order.id,
        stripeId: `pi_${order.id.replace(/-/g, '').slice(0, 20)}`,
        clientSecret: `cs_test_${order.id.replace(/-/g, '').slice(0, 16)}`,
        status:
          scenario.paymentStatus === PaymentStatus.COMPLETED ? 'succeeded' : 'requires_action',
        amount: order.totalAmount,
        currency: 'USD',
        metadata: { provenance: 'demo-seed' },
      },
    });

    await prisma.payout.create({
      data: {
        orderId: order.id,
        sellerId: seller.id,
        amount: order.totalAmount,
        currency: 'USD',
        status: scenario.payoutStatus,
        transferId:
          scenario.payoutStatus === PayoutStatus.RELEASED
            ? `po_${order.id.slice(0, 8)}`
            : undefined,
        releasedAt:
          scenario.payoutStatus === PayoutStatus.RELEASED
            ? new Date('2024-06-11T18:00:00Z')
            : undefined,
      },
    });

    if (scenario.shipmentStatus && scenario.trackingStatus) {
      await prisma.shipment.create({
        data: {
          orderId: order.id,
          status: scenario.shipmentStatus,
          carrier: 'UPS',
          serviceLevel: 'Ground',
          trackingNumber: `1Z${order.id.replace(/-/g, '').slice(0, 16)}`,
          trackingUrl: 'https://track.demo.carrier/example',
          trackingStatus: scenario.trackingStatus,
          trackingStatusDetail: 'Package scanned through automated compliance lane.',
          trackingLastEventAt: new Date('2024-06-09T09:00:00Z'),
          trackingLastCheckedAt: new Date('2024-06-09T09:15:00Z'),
          trackingNextCheckAt: new Date('2024-06-09T12:15:00Z'),
          labelUrl: '/seed-images/combo-frog.svg',
          labelKey: `label_${order.id}`,
          labelCost: new Prisma.Decimal(21.5),
          labelCurrency: 'USD',
          labelPurchasedAt: new Date('2024-06-08T17:12:00Z'),
          shippedAt: new Date('2024-06-08T19:00:00Z'),
          deliveredAt:
            scenario.shipmentStatus === ShipmentStatus.DELIVERED
              ? new Date('2024-06-10T14:30:00Z')
              : undefined,
          shippingProfileId: order.shippingProfileId ?? undefined,
          packageWeightOz: new Prisma.Decimal(48),
          packageLengthIn: new Prisma.Decimal(42),
          packageWidthIn: new Prisma.Decimal(6),
          packageHeightIn: new Prisma.Decimal(5),
          requiresSignature: true,
          insuredAmount: order.totalAmount,
          pickupScheduledAt: new Date('2024-06-08T18:00:00Z'),
          droppedOffAt: new Date('2024-06-08T18:30:00Z'),
          estimatedDeliveryAt: new Date('2024-06-10T14:00:00Z'),
        },
      });

      await prisma.orderTimelineEvent.create({
        data: {
          orderId: order.id,
          type: OrderEventType.SHIPPED,
          detail: 'Shipment handed to carrier with AI inspection record attached.',
          createdAt: new Date('2024-06-08T19:00:00Z'),
        },
      });

      if (scenario.shipmentStatus === ShipmentStatus.DELIVERED) {
        await prisma.orderTimelineEvent.create({
          data: {
            orderId: order.id,
            type: OrderEventType.DELIVERED,
            detail: 'Delivery confirmed with signature and geo stamp.',
            createdAt: new Date('2024-06-10T14:30:00Z'),
          },
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        actorId: buyer.id,
        entity: 'Order',
        entityId: order.id,
        action: `ORDER_${scenario.status}`,
        metadata: {
          offerId: scenario.offer.id,
          listingId: listing.id,
        },
      },
    });

    await prisma.notification.createMany({
      data: [
        {
          userId: seller.id,
          type: NotificationType.ORDER_UPDATED,
          payload: { orderId: order.id, status: scenario.status },
        },
        {
          userId: buyer.id,
          type: NotificationType.ORDER_UPDATED,
          payload: { orderId: order.id, status: scenario.status },
        },
      ],
    });

    if (scenario.withReview) {
      const review = await prisma.review.create({
        data: {
          orderId: order.id,
          authorId: buyer.id,
          targetUserId: seller.id,
          rating: scenario.status === OrderStatus.DISPUTED ? 2 : 5,
          body:
            scenario.status === OrderStatus.DISPUTED
              ? 'Gear arrived with damaged packaging. Working with support to resolve.'
              : 'Pristine tackle and detailed provenance photos. Highly recommended.',
          status:
            scenario.status === OrderStatus.DISPUTED
              ? ReviewStatus.UNDER_REVIEW
              : ReviewStatus.APPROVED,
          moderatedAt:
            scenario.status === OrderStatus.DISPUTED
              ? new Date('2024-06-11T09:00:00Z')
              : new Date('2024-06-10T16:00:00Z'),
        },
      });

      if (scenario.status === OrderStatus.DISPUTED) {
        await prisma.reviewModerationDecision.create({
          data: {
            reviewId: review.id,
            moderatorId: supportUser.id,
            status: ReviewStatus.UNDER_REVIEW,
            reason: 'Waiting for dispute outcome to finalize rating.',
          },
        });
      }
    }

    if (scenario.withDispute) {
      const dispute = await prisma.dispute.create({
        data: {
          orderId: order.id,
          raisedById: buyer.id,
          assignedToId: supportUser.id,
          status: DisputeStatus.UNDER_REVIEW,
          reason: 'Electronics arrived with cracked transducer housing.',
          messages: {
            create: [
              {
                authorId: buyer.id,
                body: 'Received the package but the housing is cracked. Need resolution before the weekend event.',
              },
              {
                authorId: supportUser.id,
                body: 'Requesting additional photos and AI provenance logs.',
                isInternal: false,
              },
            ],
          },
        },
      });

      await prisma.thread.create({
        data: {
          subject: 'Dispute escalation for electronics order',
          type: ThreadType.SUPPORT,
          orderId: order.id,
          listingId: listing.id,
          createdById: supportUser.id,
          lastMessagePreview: 'Support requested more documentation from buyer.',
          lastMessageAt: new Date('2024-06-11T11:00:00Z'),
          participants: {
            create: [
              { userId: buyer.id },
              { userId: seller.id },
              { userId: supportUser.id, role: 'owner' },
            ],
          },
          messages: {
            create: [
              {
                senderId: supportUser.id,
                type: MessageType.SYSTEM,
                body: 'Thread opened for dispute review. Provenance logs attached.',
              },
              {
                senderId: buyer.id,
                type: MessageType.STANDARD,
                body: 'Uploading dockside inspection photos per instructions.',
              },
            ],
          },
        },
      });

      await prisma.notification.create({
        data: {
          userId: supportUser.id,
          type: NotificationType.DISPUTE_UPDATED,
          payload: {
            orderId: order.id,
            disputeId: dispute.id,
            message: 'Dispute escalated to compliance queue.',
          },
        },
      });
    }
  }

  if (buyers.length < 2) {
    throw new Error('Not enough buyers to seed carts and recommendations');
  }

  const primaryBuyer = buyers[0]!;
  const secondaryBuyer = buyers[1] ?? primaryBuyer;
  const featuredListing = activeListings[9] ?? activeListings[0]!;

  const cartOneItems = activeListings.slice(6, 9).map((entry) => ({
    listingId: entry.listing.id,
    unitPrice: entry.listing.price,
  }));

  await prisma.cart.create({
    data: {
      buyerId: primaryBuyer.id,
      active: true,
      items: {
        create: cartOneItems.map((item) => ({
          listingId: item.listingId,
          quantity: 1,
          unitPrice: item.unitPrice,
        })),
      },
    },
  });

  await prisma.cart.create({
    data: {
      buyerId: secondaryBuyer.id,
      active: false,
      items: {
        create: [
          {
            listingId: featuredListing.listing.id,
            quantity: 1,
            unitPrice: featuredListing.listing.price,
          },
        ],
      },
    },
  });

  await prisma.recommendationCache.createMany({
    data: [
      {
        userId: primaryBuyer.id,
        context: 'dashboard-feed',
        recommendations: {
          message: 'AI surfaced frog combos with similar provenance tags.',
          listingIds:
            cartOneItems.length > 0
              ? cartOneItems.map((item) => item.listingId)
              : [activeListings[0]?.listing.id ?? listingA.listing.id],
        },
      },
      {
        listingId: listingA.listing.id,
        context: 'listing-similar-items',
        recommendations: {
          matches: [listingB.listing.id, listingC.listing.id, listingD.listing.id],
        },
      },
    ],
  });
}

async function main() {
  console.info('Clearing existing data...');
  await clearDatabase();

  console.info('Seeding policies...');
  const policyMap = await seedPolicies();

  console.info('Creating users and addresses...');
  const users = await seedUsers(policyMap);

  console.info('Seeding shipping profiles...');
  const shippingProfiles = await seedShippingProfiles(users.sellers);

  console.info('Creating curated listings...');
  const listings = await seedListings(users.sellers, users.support.user.id, shippingProfiles);

  console.info('Seeding help center content...');
  await seedHelpCenter(users.admin.user.id, policyMap);

  console.info('Simulating marketplace activity...');
  const addressMap = buildAddressMap(users);
  await seedMarketplaceActivity(users, listings, addressMap);

  console.info('Seeding completed successfully.');
}

main()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
