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
  UserRole
} from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function clearDatabase() {
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

  return { admin, support, sellers, buyers };
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

function createSlug(title: string) {
  const slugBase = faker.helpers.slugify(title).toLowerCase();
  return `${slugBase}-${faker.string.alphanumeric(6).toLowerCase()}`;
}

async function seedListings(
  sellers: { id: string; displayName: string }[],
  buyers: { id: string; displayName: string }[],
  addressByUser: Map<string, string>,
  supportAgentId: string
) {
  const createdListings = [] as { id: string; sellerId: string }[];
  const createdOffers: string[] = [];
  const createdOrders: string[] = [];

  for (const seller of sellers) {
    for (let i = 0; i < 3; i += 1) {
      const title = faker.commerce.productName();
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
                deliveredAt: faker.date.recent({ days: 2 })
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

  console.info('Seeding listings, offers, and orders...');
  await seedListings(users.sellers, users.buyers, addressByUser, users.support.id);

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
