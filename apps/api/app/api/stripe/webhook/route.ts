import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { PaymentRepository, OrderRepository, prisma } from '@possiblewebsite/db';
import { stripe } from '../../../../lib/stripe';
import { OrderEventType, OrderStatus, PaymentStatus } from '@possiblewebsite/db';

const paymentRepository = new PaymentRepository(prisma);
const orderRepository = new OrderRepository(prisma);

const parseEvent = async (request: NextRequest) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get('stripe-signature');
  const rawBody = await request.text();

  if (webhookSecret && signature && 'webhooks' in (stripe as Stripe)) {
    try {
      return (stripe as Stripe).webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (error) {
      console.error('Stripe webhook signature verification failed', error);
      throw new Error('Invalid signature');
    }
  }

  return JSON.parse(rawBody);
};

export async function POST(request: NextRequest) {
  let event: Stripe.Event;

  try {
    event = await parseEvent(request);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const intent = event.data.object as Stripe.PaymentIntent;
      const paymentIntent = await prisma.paymentIntent.findUnique({
        where: { stripeId: intent.id },
      });

      if (paymentIntent) {
        await paymentRepository.updatePaymentIntentStatus(intent.id, intent.status);
        await paymentRepository.upsertPayment({
          orderId: paymentIntent.orderId,
          amount: intent.amount_received / 100,
          currency: intent.currency.toUpperCase(),
          provider: 'stripe',
          status: PaymentStatus.COMPLETED,
          stripePaymentIntentId: intent.id,
          transactionRef: intent.id,
          paidAt: new Date(),
        });

        await orderRepository.updateStatus(paymentIntent.orderId, OrderStatus.CONFIRMED);
        await orderRepository.addTimelineEvent(
          paymentIntent.orderId,
          OrderEventType.PAYMENT_CONFIRMED,
          'Stripe payment confirmed',
        );
      }

      break;
    }
    case 'payment_intent.payment_failed': {
      const intent = event.data.object as Stripe.PaymentIntent;
      const paymentIntent = await prisma.paymentIntent.findUnique({
        where: { stripeId: intent.id },
      });

      if (paymentIntent) {
        await paymentRepository.updatePaymentIntentStatus(intent.id, intent.status);
        await paymentRepository.upsertPayment({
          orderId: paymentIntent.orderId,
          amount: intent.amount / 100,
          currency: intent.currency.toUpperCase(),
          provider: 'stripe',
          status: PaymentStatus.FAILED,
          stripePaymentIntentId: intent.id,
          transactionRef: intent.id,
        });

        await orderRepository.addTimelineEvent(
          paymentIntent.orderId,
          OrderEventType.NOTE,
          'Stripe payment failed',
        );
      }

      break;
    }
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const paymentIntentId = session.payment_intent as string | null;

      if (paymentIntentId) {
        const paymentIntent = await prisma.paymentIntent.findUnique({
          where: { stripeId: paymentIntentId },
        });

        if (paymentIntent) {
          await orderRepository.addTimelineEvent(
            paymentIntent.orderId,
            OrderEventType.PAYMENT_CONFIRMED,
            'Checkout session completed',
          );
        }
      }

      break;
    }
    default: {
      const serializedEvent = JSON.parse(JSON.stringify(event));

      await prisma.auditLog.create({
        data: {
          entity: 'StripeEvent',
          entityId: event.id,
          action: 'RECEIVED',
          metadata: serializedEvent,
        },
      });
    }
  }

  return NextResponse.json({ received: true });
}
