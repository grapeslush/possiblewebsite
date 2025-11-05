import { Cart, CartItem, Prisma, PrismaClient } from '@prisma/client';
import { toDecimal } from '../utils/decimal.js';

export interface AddCartItemInput {
  listingId: string;
  quantity?: number;
  offerId?: string | null;
  unitPrice: number | string | Prisma.Decimal;
}

export class CartRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getOrCreateActiveCart(buyerId: string): Promise<Cart> {
    const existing = await this.prisma.cart.findFirst({
      where: { buyerId, active: true },
      include: { items: true },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.cart.create({
      data: {
        buyerId,
        items: { create: [] },
      },
      include: { items: true },
    });
  }

  listActiveItems(buyerId: string) {
    return this.prisma.cartItem.findMany({
      where: { cart: { buyerId, active: true } },
      include: {
        listing: true,
        offer: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addItem(cartId: string, input: AddCartItemInput): Promise<CartItem> {
    const quantity = input.quantity ?? 1;

    const where: Prisma.CartItemWhereInput = {
      cartId,
      listingId: input.listingId,
    };

    if (input.offerId) {
      where.offerId = input.offerId;
    } else {
      where.offerId = null;
    }

    const existing = await this.prisma.cartItem.findFirst({
      where,
    });

    if (existing) {
      return this.prisma.cartItem.update({
        where: { id: existing.id },
        data: {
          quantity: existing.quantity + quantity,
          unitPrice: toDecimal(input.unitPrice),
          offerId: input.offerId ?? undefined,
        },
      });
    }

    return this.prisma.cartItem.create({
      data: {
        cartId,
        listingId: input.listingId,
        quantity,
        unitPrice: toDecimal(input.unitPrice),
        offerId: input.offerId ?? undefined,
      },
    });
  }

  updateQuantity(itemId: string, quantity: number) {
    return this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });
  }

  removeItem(itemId: string) {
    return this.prisma.cartItem.delete({
      where: { id: itemId },
    });
  }

  clearCart(cartId: string) {
    return this.prisma.cart.update({
      where: { id: cartId },
      data: {
        active: false,
        items: {
          deleteMany: {},
        },
      },
    });
  }
}
