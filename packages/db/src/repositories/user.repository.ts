import { ListingStatus, OrderStatus, PrismaClient, UserRole } from '@prisma/client';

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  displayName: string;
  role?: UserRole;
  bio?: string;
  phoneNumber?: string | null;
  dateOfBirth?: Date | null;
  marketingOptIn?: boolean;
}

export class UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  createUser(input: CreateUserInput) {
    return this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash: input.passwordHash,
        displayName: input.displayName,
        bio: input.bio,
        phoneNumber: input.phoneNumber ?? undefined,
        role: input.role ?? UserRole.BUYER,
        dateOfBirth: input.dateOfBirth ?? undefined,
        ageVerifiedAt: input.dateOfBirth ? new Date() : undefined,
        marketingOptIn: input.marketingOptIn ?? false
      }
    });
  }

  listActiveSellers() {
    return this.prisma.user.findMany({
      where: {
        role: UserRole.SELLER,
        listings: {
          some: {
            status: ListingStatus.ACTIVE
          }
        }
      },
      include: {
        listings: {
          where: { status: ListingStatus.ACTIVE },
          select: {
            id: true,
            title: true,
            price: true,
            currency: true,
            slug: true
          }
        }
      },
      orderBy: {
        displayName: 'asc'
      }
    });
  }

  async setDefaultAddress(userId: string, addressId: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.address.updateMany({
        where: { userId },
        data: { isDefault: false }
      });

      await tx.address.update({
        where: { id: addressId },
        data: { isDefault: true }
      });
    });

    return this.prisma.address.findUnique({ where: { id: addressId } });
  }

  listBuyersWithOpenOrders() {
    return this.prisma.user.findMany({
      where: {
        role: UserRole.BUYER,
        ordersBought: {
          some: {
            status: {
              in: [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.DISPUTED]
            }
          }
        }
      },
      select: {
        id: true,
        displayName: true,
        ordersBought: {
          where: {
            status: {
              in: [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.DISPUTED]
            }
          },
          select: {
            id: true,
            status: true,
            totalAmount: true,
            currency: true,
            listing: {
              select: { title: true, slug: true }
            }
          }
        }
      }
    });
  }
}
