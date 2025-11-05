import { PaymentStatus, Prisma, PrismaClient } from '@prisma/client';
import { toDecimal } from '../utils/decimal.js';

export interface UpsertPaymentInput {
  orderId: string;
  amount: number | string | Prisma.Decimal;
  currency?: string;
  provider?: string;
  status?: PaymentStatus;
  transactionRef?: string | null;
  applicationFeeAmount?: number | string | Prisma.Decimal | null;
  taxAmount?: number | string | Prisma.Decimal | null;
  escrowAmount?: number | string | Prisma.Decimal | null;
  stripePaymentIntentId?: string | null;
  paidAt?: Date | null;
}

export interface CreatePaymentIntentInput {
  orderId: string;
  stripeId: string;
  clientSecret?: string | null;
  status: string;
  amount: number | string | Prisma.Decimal;
  currency?: string;
  metadata?: Record<string, unknown> | null;
}

export class PaymentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  upsertPayment(input: UpsertPaymentInput) {
    return this.prisma.payment.upsert({
      where: { orderId: input.orderId },
      update: {
        amount: toDecimal(input.amount),
        currency: input.currency ?? undefined,
        provider: input.provider ?? undefined,
        status: input.status ?? undefined,
        transactionRef: input.transactionRef ?? undefined,
        paidAt: input.paidAt ?? undefined,
        applicationFeeAmount:
          input.applicationFeeAmount === undefined || input.applicationFeeAmount === null
            ? undefined
            : toDecimal(input.applicationFeeAmount),
        taxAmount:
          input.taxAmount === undefined || input.taxAmount === null
            ? undefined
            : toDecimal(input.taxAmount),
        escrowAmount:
          input.escrowAmount === undefined || input.escrowAmount === null
            ? undefined
            : toDecimal(input.escrowAmount),
        stripePaymentIntentId: input.stripePaymentIntentId ?? undefined,
      },
      create: {
        orderId: input.orderId,
        amount: toDecimal(input.amount),
        currency: input.currency ?? 'USD',
        provider: input.provider ?? 'stripe',
        status: input.status ?? PaymentStatus.PENDING,
        transactionRef: input.transactionRef ?? undefined,
        paidAt: input.paidAt ?? undefined,
        applicationFeeAmount:
          input.applicationFeeAmount === undefined || input.applicationFeeAmount === null
            ? undefined
            : toDecimal(input.applicationFeeAmount),
        taxAmount:
          input.taxAmount === undefined || input.taxAmount === null
            ? undefined
            : toDecimal(input.taxAmount),
        escrowAmount:
          input.escrowAmount === undefined || input.escrowAmount === null
            ? undefined
            : toDecimal(input.escrowAmount),
        stripePaymentIntentId: input.stripePaymentIntentId ?? undefined,
      },
    });
  }

  createPaymentIntent(input: CreatePaymentIntentInput) {
    return this.prisma.paymentIntent.create({
      data: {
        orderId: input.orderId,
        stripeId: input.stripeId,
        clientSecret: input.clientSecret ?? undefined,
        status: input.status,
        amount: toDecimal(input.amount),
        currency: input.currency ?? 'USD',
        metadata: input.metadata ?? undefined,
      },
    });
  }

  updatePaymentIntentStatus(stripeId: string, status: string) {
    return this.prisma.paymentIntent.update({
      where: { stripeId },
      data: { status },
    });
  }
}
