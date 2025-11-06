import { prisma } from '@possiblewebsite/db';
import { notFound } from 'next/navigation';
import { MessageCenter } from './thread-client';

export default async function MessageThreadsPage() {
  const [orders, disputes] = await Promise.all([
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        listing: { select: { title: true } },
        buyer: { select: { id: true, displayName: true } },
        seller: { select: { id: true, displayName: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { id: true, displayName: true, avatarUrl: true } },
          },
        },
      },
    }),
    prisma.dispute.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          select: {
            id: true,
            listing: { select: { title: true } },
          },
        },
        raisedBy: { select: { id: true, displayName: true } },
        assignedTo: { select: { id: true, displayName: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { id: true, displayName: true, avatarUrl: true } },
          },
        },
      },
    }),
  ]);

  if (orders.length === 0 && disputes.length === 0) {
    notFound();
  }

  const currentUserId =
    orders[0]?.buyerId ??
    orders[0]?.sellerId ??
    disputes[0]?.raisedById ??
    disputes[0]?.assignedToId ??
    '';

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-semibold text-brand-secondary">Tackle Exchange inbox</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Manage escrow-protected order and dispute conversations with real-time optimistic updates.
      </p>
      <MessageCenter
        currentUserId={currentUserId}
        initialOrders={orders.map((order) => ({
          orderId: order.id,
          listingTitle: order.listing.title,
          buyerId: order.buyerId,
          sellerId: order.sellerId,
          counterpartName:
            order.buyerId === currentUserId ? order.seller.displayName : order.buyer.displayName,
          messages: order.messages.map((message) => ({
            id: message.id,
            body: message.body,
            createdAt: message.createdAt.toISOString(),
            author: {
              id: message.author.id,
              displayName: message.author.displayName,
              avatarUrl: message.author.avatarUrl,
            },
          })),
        }))}
        initialDisputes={disputes.map((dispute) => ({
          disputeId: dispute.id,
          orderId: dispute.orderId,
          title: dispute.order.listing?.title ?? 'Dispute',
          raisedById: dispute.raisedById,
          assignedToId: dispute.assignedToId,
          counterpartName:
            dispute.raisedById === currentUserId
              ? (dispute.assignedTo?.displayName ?? 'Support agent')
              : dispute.raisedBy.displayName,
          messages: dispute.messages.map((message) => ({
            id: message.id,
            body: message.body,
            createdAt: message.createdAt.toISOString(),
            author: {
              id: message.author.id,
              displayName: message.author.displayName,
              avatarUrl: message.author.avatarUrl,
            },
          })),
        }))}
      />
    </div>
  );
}
