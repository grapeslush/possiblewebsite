import { PayoutStatus, PrismaClient, Prisma } from '@prisma/client';
import { toDecimal } from '../utils/decimal.js';

export class PayoutRepository {
  constructor(private readonly prisma: PrismaClient) {}

  createPendingPayout(
    orderId: string,
    sellerId: string,
    amount: number | string | Prisma.Decimal,
    currency = 'USD',
  ) {
    return this.prisma.payout.upsert({
      where: { orderId },
      update: {
        amount: toDecimal(amount),
        currency,
      },
      create: {
        orderId,
        sellerId,
        amount: toDecimal(amount),
        currency,
      },
    });
  }

  async markAsReleased(orderId: string, transferId: string) {
    return this.prisma.payout.update({
      where: { orderId },
      data: {
        status: PayoutStatus.RELEASED,
        transferId,
        releasedAt: new Date(),
      },
    });
  }

  getPayoutByOrder(orderId: string) {
    return this.prisma.payout.findUnique({
      where: { orderId },
    });
  }
}
