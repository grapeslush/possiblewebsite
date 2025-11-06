import { AuditRepository, PayoutRepository, prisma } from '@possiblewebsite/db';
import { stripe } from './stripe';

export const releasePayoutForOrder = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      payout: true,
      payment: true,
      seller: true,
      shipment: true,
    },
  });

  if (!order || !order.payout) {
    throw new Error(`Payout not found for order ${orderId}`);
  }

  if (order.payout.transferId) {
    return order.payout;
  }

  if (!order.seller.stripeConnectId) {
    throw new Error(`Seller ${order.sellerId} missing Stripe Connect account`);
  }

  const payoutRepository = new PayoutRepository(prisma);
  const auditRepository = new AuditRepository(prisma);
  const amountInCents = Math.round(Number(order.payout.amount) * 100);

  const transfer = await stripe.transfers.create(
    {
      amount: amountInCents,
      currency: order.payout.currency.toLowerCase(),
      destination: order.seller.stripeConnectId,
      metadata: {
        orderId: order.id,
        payoutId: order.payout.id,
      },
    },
    {
      idempotencyKey: `payout_${order.payout.id}`,
    },
  );

  const payout = await payoutRepository.markAsReleased(order.id, transfer.id);

  await auditRepository.createLog({
    actorId: order.sellerId,
    entity: 'Payout',
    entityId: payout.id,
    action: 'PAYOUT_RELEASED',
    metadata: {
      transferId: transfer.id,
      amount: amountInCents / 100,
      currency: order.payout.currency,
    },
  });

  return payout;
};
