import Stripe from 'stripe';
import { PaymentRepository, prisma } from '@possiblewebsite/db';

interface FinancialBreakdownOptions {
  applicationFeePercent?: number;
  taxRatePercent?: number;
  escrowPercent?: number;
}

export interface CreateCheckoutSessionOptions extends FinancialBreakdownOptions {
  orderId: string;
  successUrl: string;
  cancelUrl: string;
  buyerEmail?: string | null;
}

type StripeLike = Pick<Stripe, 'checkout' | 'paymentIntents' | 'transfers'>;

class MockStripe implements StripeLike {
  checkout = {
    sessions: {
      create: async (params: Stripe.Checkout.SessionCreateParams) => {
        const now = Date.now();
        const paymentIntentId = `pi_mock_${now}`;

        return {
          id: `cs_mock_${now}`,
          url: params.success_url ?? null,
          payment_intent: paymentIntentId,
          amount_total:
            params.line_items?.reduce(
              (acc, item) => acc + (item.price_data?.unit_amount ?? 0) * (item.quantity ?? 1),
              0,
            ) ?? null,
          currency: params.currency ?? 'usd',
        } as unknown as Stripe.Checkout.Session;
      },
    },
  } as StripeLike['checkout'];

  paymentIntents = {
    retrieve: async (id: string) => ({
      id,
      status: 'requires_payment_method',
      amount: 0,
      client_secret: `${id}_secret`,
      currency: 'usd',
    }),
  } as StripeLike['paymentIntents'];

  transfers = {
    create: async (params: Stripe.TransferCreateParams, _options?: Stripe.RequestOptions) => ({
      id: `tr_mock_${Date.now()}`,
      amount: params.amount,
      currency: params.currency ?? 'usd',
      metadata: params.metadata ?? {},
    }),
  } as StripeLike['transfers'];
}

const createStripeClient = (): StripeLike => {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    return new MockStripe();
  }

  return new Stripe(secretKey, { apiVersion: '2023-10-16' });
};

const stripe = createStripeClient();

export const calculateFinancialBreakdown = (
  total: number,
  options: FinancialBreakdownOptions = {},
) => {
  const tax = options.taxRatePercent ? total * (options.taxRatePercent / 100) : 0;
  const applicationFee = options.applicationFeePercent
    ? total * (options.applicationFeePercent / 100)
    : 0;
  const escrowBase = total - applicationFee - tax;
  const escrow = options.escrowPercent ? escrowBase * (options.escrowPercent / 100) : escrowBase;

  return {
    taxAmount: Number(tax.toFixed(2)),
    applicationFeeAmount: Number(applicationFee.toFixed(2)),
    escrowAmount: Number(escrow.toFixed(2)),
  };
};

export const createCheckoutSession = async (options: CreateCheckoutSessionOptions) => {
  const order = await prisma.order.findUnique({
    where: { id: options.orderId },
    include: {
      items: true,
      buyer: true,
      seller: true,
      payment: true,
    },
  });

  if (!order) {
    throw new Error(`Order ${options.orderId} not found`);
  }

  const total = Number(order.totalAmount);
  const breakdown = calculateFinancialBreakdown(total, options);
  const paymentRepository = new PaymentRepository(prisma);

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = order.items.map((item) => ({
    quantity: item.quantity,
    price_data: {
      currency: order.currency?.toLowerCase() ?? 'usd',
      product_data: {
        name: `Listing ${item.listingId}`,
      },
      unit_amount: Math.round(Number(item.unitPrice) * 100),
    },
  }));

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    success_url: options.successUrl,
    cancel_url: options.cancelUrl,
    customer_email: options.buyerEmail ?? order.buyer.email,
    currency: order.currency?.toLowerCase(),
    line_items: lineItems,
    automatic_tax: { enabled: true },
    payment_intent_data: {
      application_fee_amount: Math.round(breakdown.applicationFeeAmount * 100),
      metadata: {
        orderId: order.id,
        escrowAmount: breakdown.escrowAmount,
      },
    },
    metadata: {
      orderId: order.id,
    },
  });

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent?.id ?? undefined);

  if (paymentIntentId) {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    await paymentRepository.createPaymentIntent({
      orderId: order.id,
      stripeId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret ?? null,
      status: paymentIntent.status,
      amount: total,
      currency: order.currency ?? 'USD',
      metadata: {
        applicationFeeAmount: breakdown.applicationFeeAmount,
        taxAmount: breakdown.taxAmount,
        escrowAmount: breakdown.escrowAmount,
      },
    });

    await paymentRepository.upsertPayment({
      orderId: order.id,
      amount: total,
      currency: order.currency ?? 'USD',
      provider: 'stripe',
      status: order.payment?.status ?? undefined,
      stripePaymentIntentId: paymentIntent.id,
      applicationFeeAmount: breakdown.applicationFeeAmount,
      taxAmount: breakdown.taxAmount,
      escrowAmount: breakdown.escrowAmount,
    });
  }

  return {
    id: session.id,
    url: session.url,
    paymentIntentId,
    breakdown,
  };
};

export { stripe };
