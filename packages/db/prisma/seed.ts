import 'dotenv/config';
import {
  AddressType,
  DisputeStatus,
  ListingStatus,
  NotificationType,
  OfferStatus,
  OrderEventType,
  OrderStatus,
  PaymentStatus,
  Prisma,
  PrismaClient,
  ShipmentStatus,
  TackleCategory,
  TackleCondition,
  UserRole,
  WaterType,
} from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

const TACKLE_BRANDS = ['Megabass', 'Shimano', 'Daiwa', 'G. Loomis', 'Dobyns', 'St. Croix'];
const LURE_STYLES = ['Swimbait', 'Frog', 'Football Jig', 'Bladed Jig', 'Jerkbait', 'Crankbait'];
const TECHNIQUES = ['Flipping', 'Pitching', 'Finesse', 'Power Fishing', 'Dock Skipping', 'Offshore Structure'];
const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'];

async function clearDatabase() {
  await prisma.message.deleteMany();
  await prisma.threadParticipant.deleteMany();
  await prisma.thread.deleteMany();
  await prisma.recommendationCache.deleteMany();
  await prisma.helpArticle.deleteMany();
  await prisma.policyAcceptance.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.disputeMessage.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.orderTimelineEvent.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.listingImage.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.shippingProfile.deleteMany();
  await prisma.policy.deleteMany();
  await prisma.address.deleteMany();
  await prisma.user.deleteMany();
}

async function seedUsers() {
  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      passwordHash: faker.string.alphanumeric(32),
      displayName: 'Admin User',
      role: UserRole.ADMIN,
      bio: 'System administrator for the marketplace.'
    }
  });

  const support = await prisma.user.create({
    data: {
      email: 'support@example.com',
      passwordHash: faker.string.alphanumeric(32),
      displayName: 'Support Agent',
      role: UserRole.SUPPORT,
      bio: 'Handles escalations and dispute resolution.'
    }
  });

  const sellers = await Promise.all(
    Array.from({ length: 3 }).map((_, index) =>
      prisma.user.create({
        data: {
          email: `seller${index + 1}@example.com`,
          passwordHash: faker.string.alphanumeric(32),
          displayName: faker.person.fullName(),
          role: UserRole.SELLER,
          bio: faker.lorem.sentence(),
          phoneNumber: faker.phone.number()
        }
      })
    )
  );

  const demoSeller = await prisma.user.create({
    data: {
      id: '11111111-1111-1111-1111-111111111111',
      email: 'demo-seller@example.com',
      passwordHash: faker.string.alphanumeric(32),
      displayName: 'Demo Marketplace Seller',
      role: UserRole.SELLER,
      bio: 'Curated drops for the listing creation walkthrough.',
      phoneNumber: faker.phone.number(),
      avatarUrl: faker.image.avatarGitHub()
    }
  });

  const buyers = await Promise.all(
    Array.from({ length: 5 }).map((_, index) =>
      prisma.user.create({
        data: {
          email: `buyer${index + 1}@example.com`,
          passwordHash: faker.string.alphanumeric(32),
          displayName: faker.person.fullName(),
          role: UserRole.BUYER,
          bio: faker.lorem.sentence(),
          phoneNumber: faker.phone.number()
        }
      })
    )
  );

  return { admin, support, sellers: [...sellers, demoSeller], buyers };
}

async function seedAddresses(users: { sellers: { id: string }[]; buyers: { id: string }[] }) {
  const addressByUser = new Map<string, string>();

  const addressPromises = [...users.sellers, ...users.buyers].map((user) =>
    prisma.address.create({
      data: {
        userId: user.id,
        label: 'Primary Address',
        type: AddressType.SHIPPING,
        line1: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state({ abbreviated: true }),
        postalCode: faker.location.zipCode(),
        country: faker.location.countryCode(),
        isDefault: true
      }
    })
  );

  const addresses = await Promise.all(addressPromises);
  addresses.forEach((address) => addressByUser.set(address.userId, address.id));

  return addressByUser;
}

async function seedShippingProfiles(sellers: { id: string; displayName: string }[]) {
  const profiles = await Promise.all(
    sellers.map((seller) =>
      prisma.shippingProfile.create({
        data: {
          sellerId: seller.id,
          label: `${seller.displayName.split(' ')[0] ?? 'Seller'} tackle shipping`,
          courierPreference: faker.helpers.arrayElement(['USPS', 'UPS', 'FedEx']),
          serviceLevel: faker.helpers.arrayElement(['Priority', 'Ground', 'Two-Day']),
          shipFromCity: faker.location.city(),
          shipFromState: faker.location.state({ abbreviated: true }),
          shipFromPostalCode: faker.location.zipCode(),
          shipFromCountry: 'US',
          packageType: faker.helpers.arrayElement(['Rod Tube', 'Tackle Tray', 'Reel Box']),
          packageWeightOz: new Prisma.Decimal(faker.number.float({ min: 12, max: 64, precision: 0.1 })),
          packageLengthIn: new Prisma.Decimal(faker.number.float({ min: 18, max: 48, precision: 0.1 })),
          packageWidthIn: new Prisma.Decimal(faker.number.float({ min: 4, max: 12, precision: 0.1 })),
          packageHeightIn: new Prisma.Decimal(faker.number.float({ min: 3, max: 10, precision: 0.1 })),
          insurancePreferred: faker.datatype.boolean(),
          insuranceAmountCents: faker.number.int({ min: 1500, max: 45000 }),
          signatureRequired: faker.datatype.boolean(),
          handlingNotes: 'Packed with recycled foam and rod socks to protect sensitive tackle.',
        },
      })
    )
  );

  return new Map(profiles.map((profile) => [profile.sellerId, profile.id]));
}

function createSlug(title: string) {
  const slugBase = faker.helpers.slugify(title).toLowerCase();
  return `${slugBase}-${faker.string.alphanumeric(6).toLowerCase()}`;
}

async function seedListings(
  sellers: { id: string; displayName: string }[],
  buyers: { id: string; displayName: string }[],
  addressByUser: Map<string, string>,
  shippingProfileBySeller: Map<string, string>,
  supportAgentId: string
) {
  const createdListings = [] as { id: string; sellerId: string }[];
  const createdOffers: string[] = [];
  const createdOrders: string[] = [];

  const featureSeller =
    sellers.find((seller) => seller.id === '11111111-1111-1111-1111-111111111111') ?? sellers[0];

  for (const seller of sellers) {
    for (let i = 0; i < 3; i += 1) {
      const title = faker.commerce.productName();
      const brand = faker.helpers.arrayElement(TACKLE_BRANDS);
      const tackleCategory = faker.helpers.arrayElement([
        TackleCategory.LURE,
        TackleCategory.ROD,
        TackleCategory.REEL,
        TackleCategory.ROD_AND_REEL_COMBO,
      ]);
      const condition = faker.helpers.arrayElement([
        TackleCondition.LIKE_NEW,
        TackleCondition.EXCELLENT,
        TackleCondition.GOOD,
      ]);
      const techniqueTags = faker.helpers.arrayElements(
        TECHNIQUES,
        faker.number.int({ min: 1, max: 3 }),
      );
      const seasonalHighlights = faker.helpers.arrayElements(
        SEASONS,
        faker.number.int({ min: 1, max: 3 }),
      );
      const autoAcceptCents = faker.number.int({ min: 14000, max: 32000 });
      const minimumOfferCents = faker.number.int({ min: 9000, max: autoAcceptCents - 1000 });
      const shippingProfileId = shippingProfileBySeller.get(seller.id) ?? null;

      const listing = await prisma.listing.create({
        data: {
          sellerId: seller.id,
          title,
          slug: createSlug(title),
          description: faker.commerce.productDescription(),
          price: new Prisma.Decimal(faker.commerce.price({ min: 50, max: 500 })),
          status: i === 0 ? ListingStatus.ACTIVE : ListingStatus.DRAFT,
          category: faker.commerce.department(),
          tags: faker.helpers.arrayElements(['vintage', 'handmade', 'rare', 'sale', 'limited'], 2),
          brand,
          modelName: `${brand} ${faker.color.human()} ${faker.word.noun()}`,
          condition,
          tackleCategory,
          waterType: faker.helpers.arrayElement([WaterType.FRESHWATER, WaterType.BRACKISH]),
          lureStyle: faker.helpers.arrayElement(LURE_STYLES),
          targetSpecies: ['Largemouth Bass', 'Smallmouth Bass'],
          techniqueTags,
          seasonalUse: seasonalHighlights,
          lineRatingLbMin: faker.number.int({ min: 10, max: 20 }),
          lineRatingLbMax: faker.number.int({ min: 21, max: 35 }),
          rodPower: faker.helpers.arrayElement(['Medium', 'Medium Heavy', 'Heavy']),
          rodAction: faker.helpers.arrayElement(['Fast', 'Moderate Fast', 'Extra Fast']),
          gearRatio: `${faker.number.int({ min: 5, max: 8 })}.${faker.number.int({ min: 0, max: 9 })}:1`,
          bearingCount: faker.number.int({ min: 5, max: 12 }),
          maxDragLb: new Prisma.Decimal(faker.number.float({ min: 12, max: 25, precision: 0.1 })),
          weightOz: new Prisma.Decimal(faker.number.float({ min: 5, max: 9, precision: 0.1 })),
          lengthIn: new Prisma.Decimal(faker.number.float({ min: 78, max: 96, precision: 0.1 })),
          customNotes: 'Dialed for trophy bass in pressured reservoirs.',
          autoAcceptOfferCents: autoAcceptCents,
          minimumOfferCents,
          shippingProfileId: shippingProfileId ?? undefined,
          shippingWeightOz: new Prisma.Decimal(faker.number.float({ min: 20, max: 48, precision: 0.1 })),
          shippingLengthIn: new Prisma.Decimal(faker.number.float({ min: 24, max: 48, precision: 0.1 })),
          shippingWidthIn: new Prisma.Decimal(faker.number.float({ min: 4, max: 10, precision: 0.1 })),
          shippingHeightIn: new Prisma.Decimal(faker.number.float({ min: 3, max: 8, precision: 0.1 })),
          handlingTimeDays: faker.number.int({ min: 1, max: 3 }),
          featuredPhotoUrl: faker.image.urlPicsumPhotos({ width: 800, height: 800 }),
          seoKeywords: ['bass fishing', 'tackle', brand.toLowerCase()],
          images: {
            create: [
              {
                url: faker.image.urlPicsumPhotos({ width: 800, height: 800 }),
                altText: title,
                position: 0,
                isPrimary: true
              },
              {
                url: faker.image.urlPicsumPhotos({ width: 800, height: 800 }),
                altText: `${title} alternate view`,
                position: 1
              }
            ]
  }

  const heroListing = await prisma.listing.create({
    data: {
      sellerId: featureSeller?.id ?? supportAgentId,
      title: 'Signature frog rod & reel combo',
      slug: 'signature-frog-rod-and-reel-combo',
      description:
        'Tournament-ready frog setup tuned for matted grass and laydowns. Includes a 7\'3" heavy rod paired with a high-speed reel and braided line leader recommendations.',
      price: new Prisma.Decimal(329.0),
      status: ListingStatus.ACTIVE,
      category: 'Bass Fishing Combos',
      tags: ['frog-fishing', 'combo', 'topwater'],
      brand: 'Megabass',
      modelName: 'Orochi XXX Jungle Frog Special',
      condition: TackleCondition.EXCELLENT,
      tackleCategory: TackleCategory.ROD_AND_REEL_COMBO,
      waterType: WaterType.FRESHWATER,
      lureStyle: 'Hollow-body frog',
      targetSpecies: ['Largemouth Bass', 'Snakehead'],
      techniqueTags: ['Frog Fishing', 'Power Fishing'],
      seasonalUse: ['Summer', 'Fall'],
      lineRatingLbMin: 50,
      lineRatingLbMax: 65,
      rodPower: 'Heavy',
      rodAction: 'Fast',
      gearRatio: '8.1:1',
      bearingCount: 11,
      maxDragLb: new Prisma.Decimal(22),
      weightOz: new Prisma.Decimal(7.8),
      lengthIn: new Prisma.Decimal(87),
      customNotes: 'Includes reel spooled with 65lb braid and trimmed EVA knobs for wet traction.',
      autoAcceptOfferCents: 30000,
      minimumOfferCents: 26000,
      shippingProfileId: shippingProfileBySeller.get(featureSeller?.id ?? '') ?? undefined,
      shippingWeightOz: new Prisma.Decimal(32),
      shippingLengthIn: new Prisma.Decimal(45),
      shippingWidthIn: new Prisma.Decimal(6),
      shippingHeightIn: new Prisma.Decimal(5),
      handlingTimeDays: 2,
      featuredPhotoUrl:
        'https://images.unsplash.com/photo-1520872024865-3ff2805d8bbf?auto=format&fit=crop&w=800&q=80',
      seoKeywords: ['frog rod', 'topwater bass combo', 'heavy cover'],
      publishedAt: new Date(),
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1502720705749-3c925585bafc?auto=format&fit=crop&w=800&q=80',
            altText: 'Frog rod and reel combo on deck',
            position: 0,
            isPrimary: true
          },
          {
            url: 'https://images.unsplash.com/photo-1520872024865-3ff2805d8bbf?auto=format&fit=crop&w=800&q=80',
            altText: 'Heavy cover bass habitat',
            position: 1
          }
        ]
      }
    }
  });

  await prisma.offer.create({
    data: {
      listingId: heroListing.id,
      buyerId: buyers[0]?.id ?? sellers[0]?.id ?? supportAgentId,
      amount: new Prisma.Decimal(310),
      status: OfferStatus.PENDING,
      message: 'Would you consider $310 shipped with signature confirmation?'
    }
  });
}
      });

      createdListings.push({ id: listing.id, sellerId: seller.id });

      const interestedBuyers = faker.helpers.shuffle(buyers).slice(0, faker.number.int({ min: 2, max: 3 }));

      for (const buyer of interestedBuyers) {
        const offer = await prisma.offer.create({
          data: {
            listingId: listing.id,
            buyerId: buyer.id,
            amount: new Prisma.Decimal(faker.commerce.price({ min: 40, max: 450 })),
            status: OfferStatus.PENDING,
            message: faker.lorem.sentence()
          }
        });
        createdOffers.push(offer.id);

        const shouldCreateOrder = faker.datatype.boolean({ probability: 0.6 });
        if (shouldCreateOrder) {
          const shippingAddressId = addressByUser.get(buyer.id) ?? null;
          const billingAddressId = addressByUser.get(buyer.id) ?? null;
          const isGift = faker.datatype.boolean({ probability: 0.2 });
          const tackleTechniqueFocus = techniqueTags[0] ?? 'Power Fishing';

          const status = faker.helpers.arrayElement([
            OrderStatus.CONFIRMED,
            OrderStatus.FULFILLED,
            OrderStatus.PENDING,
            OrderStatus.DISPUTED
          ]);

          const order = await prisma.order.create({
            data: {
              listingId: listing.id,
              buyerId: buyer.id,
              sellerId: seller.id,
              offerId: offer.id,
              status,
              totalAmount: offer.amount,
              currency: 'USD',
              quantity: 1,
              shippingAddressId,
              billingAddressId,
              subtotalAmount: offer.amount,
              shippingProfileId: listing.shippingProfileId ?? undefined,
              targetSpecies: listing.targetSpecies,
              tackleTechnique: tackleTechniqueFocus,
              preferredDeliveryWindow: faker.helpers.arrayElement([
                'Within 1 week',
                'Before upcoming tournament',
                'Flexible',
              ]),
              buyerNote: 'Please ship with extra padding for the reel handle.',
              isGift,
              giftMessage: isGift ? 'Tight lines and big bites!' : null,
              timelineEvents: {
                create: [
                  {
                    type: OrderEventType.CREATED,
                    detail: 'Order submitted by buyer'
                  },
                  {
                    type: OrderEventType.PAYMENT_CONFIRMED,
                    detail: 'Payment confirmed by system'
                  }
                ]
              }
            }
          });

          createdOrders.push(order.id);

          if ([OrderStatus.CONFIRMED, OrderStatus.FULFILLED].includes(status)) {
            await prisma.payment.create({
              data: {
                orderId: order.id,
                amount: order.totalAmount,
                status: PaymentStatus.COMPLETED,
                provider: 'stripe',
                transactionRef: faker.string.uuid(),
                paidAt: faker.date.recent()
              }
            });
          }

          if (status === OrderStatus.FULFILLED) {
            await prisma.shipment.create({
              data: {
                orderId: order.id,
                status: ShipmentStatus.DELIVERED,
                carrier: 'UPS',
                trackingNumber: faker.string.alphanumeric(12).toUpperCase(),
                shippedAt: faker.date.recent({ days: 5 }),
                deliveredAt: faker.date.recent({ days: 2 }),
                shippingProfileId: listing.shippingProfileId ?? undefined,
                packageWeightOz: listing.shippingWeightOz ?? new Prisma.Decimal(28),
                packageLengthIn: listing.shippingLengthIn ?? new Prisma.Decimal(42),
                packageWidthIn: listing.shippingWidthIn ?? new Prisma.Decimal(6),
                packageHeightIn: listing.shippingHeightIn ?? new Prisma.Decimal(5),
                requiresSignature: faker.datatype.boolean({ probability: 0.4 }),
                insuredAmount: new Prisma.Decimal(faker.number.float({ min: 50, max: 400, precision: 0.01 })),
                pickupScheduledAt: faker.date.recent({ days: 6 }),
                droppedOffAt: faker.date.recent({ days: 5 }),
                estimatedDeliveryAt: faker.date.soon({ days: 3 })
              }
            });

            await prisma.orderTimelineEvent.create({
              data: {
                orderId: order.id,
                type: OrderEventType.DELIVERED,
                detail: 'Shipment delivered to buyer'
              }
            });
          }

          if (status === OrderStatus.DISPUTED) {
            const dispute = await prisma.dispute.create({
              data: {
                orderId: order.id,
                raisedById: buyer.id,
                assignedToId: supportAgentId,
                status: DisputeStatus.UNDER_REVIEW,
                reason: 'Item arrived damaged',
                messages: {
                  create: [
                    {
                      authorId: buyer.id,
                      body: 'The package arrived damaged. Requesting refund.'
                    },
                    {
                      authorId: supportAgentId,
                      body: 'Support team reviewing the case.',
                      isInternal: true
                    }
                  ]
                }
              }
            });

            await prisma.notification.createMany({
              data: [
                {
                  userId: seller.id,
                  type: NotificationType.DISPUTE_UPDATED,
                  payload: { orderId: order.id, disputeId: dispute.id, message: 'Dispute opened by buyer.' }
                },
                {
                  userId: supportAgentId,
                  type: NotificationType.DISPUTE_UPDATED,
                  payload: { orderId: order.id, disputeId: dispute.id, message: 'Assigned to you for review.' }
                }
              ]
            });
          } else {
            await prisma.notification.create({
              data: {
                userId: seller.id,
                type: NotificationType.ORDER_UPDATED,
                payload: { orderId: order.id, status }
              }
            });
          }

          await prisma.auditLog.createMany({
            data: [
              {
                actorId: buyer.id,
                entity: 'Order',
                entityId: order.id,
                action: 'ORDER_CREATED',
                metadata: { listingId: listing.id, sellerId: seller.id }
              },
              {
                actorId: seller.id,
                entity: 'Order',
                entityId: order.id,
                action: 'ORDER_ACKNOWLEDGED',
                metadata: { buyerId: buyer.id }
              }
            ]
          });
        }
      }
    }
  }

  return { createdListings, createdOffers, createdOrders };
}

async function main() {
  console.info('Clearing existing data...');
  await clearDatabase();

  console.info('Seeding users...');
  const users = await seedUsers();

  console.info('Seeding addresses...');
  const addressByUser = await seedAddresses(users);

  console.info('Seeding shipping profiles...');
  const shippingProfileBySeller = await seedShippingProfiles(users.sellers);

  console.info('Seeding listings, offers, and orders...');
  await seedListings(
    users.sellers,
    users.buyers,
    addressByUser,
    shippingProfileBySeller,
    users.support.id
  );

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
