import { prisma } from '@possiblewebsite/db';
import { notFound } from 'next/navigation';
import { ReviewForm } from './review-form';

export default async function ReviewsPage() {
  const orders = await prisma.order.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      listing: { select: { title: true } },
      buyer: { select: { id: true, displayName: true } },
      seller: { select: { id: true, displayName: true } },
    },
  });

  if (orders.length === 0) {
    notFound();
  }

  const currentUserId = orders[0].buyerId;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-semibold text-brand-secondary">Share your experience</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Reviews feed into Tackle Exchange trust scores and are screened by automated and human
        moderation before appearing publicly.
      </p>
      <ReviewForm
        currentUserId={currentUserId}
        orders={orders.map((order) => ({
          id: order.id,
          listingTitle: order.listing.title,
          buyerId: order.buyerId,
          sellerId: order.sellerId,
          sellerName: order.seller.displayName,
        }))}
      />
    </div>
  );
}
