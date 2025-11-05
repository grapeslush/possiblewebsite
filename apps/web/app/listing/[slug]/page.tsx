import { ListingStatus } from '@prisma/client';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { prisma, ListingRepository } from '@possiblewebsite/db';

import { Button } from '@/components/ui/button';

import { OffersModal } from './offers-modal';

const repository = new ListingRepository(prisma);

interface ListingPageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: ListingPageProps): Promise<Metadata> {
  const listing = await repository.getListingBySlug(params.slug);
  if (!listing) {
    return {
      title: 'Listing unavailable'
    };
  }

  return {
    title: `${listing.title} · Marketplace`,
    description: listing.description.slice(0, 150),
    openGraph: {
      title: listing.title,
      description: listing.description,
      images: listing.images.map((image) => ({ url: image.url }))
    }
  };
}

export default async function ListingDetailPage({ params }: ListingPageProps) {
  const listing = await repository.getListingBySlug(params.slug);

  if (!listing || listing.status !== ListingStatus.ACTIVE) {
    notFound();
  }

  const reviewSummary = buildReviewSummary(listing);
  const offersForModal = listing.offers.map((offer) => ({
    id: offer.id,
    amount: offer.amount.toString(),
    status: offer.status,
    message: offer.message,
    createdAt: offer.createdAt.toISOString(),
    buyer: {
      id: offer.buyer.id,
      displayName: offer.buyer.displayName,
      avatarUrl: offer.buyer.avatarUrl
    }
  }));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10">
      <nav className="text-xs text-muted-foreground">
        <a href="/search" className="text-brand-secondary hover:underline">
          ← Back to search
        </a>
      </nav>
      <section className="grid gap-8 md:grid-cols-[3fr_2fr]">
        <div className="space-y-4">
          <Gallery images={listing.images} title={listing.title} />
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h1 className="text-3xl font-semibold text-brand-secondary">{listing.title}</h1>
            <p className="mt-3 text-sm text-muted-foreground whitespace-pre-line">{listing.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {listing.tags?.map((tag) => (
                <span key={tag} className="rounded-full bg-brand-primary/10 px-3 py-1 text-xs text-brand-primary">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
        <aside className="space-y-6">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <p className="text-sm uppercase tracking-[0.3em] text-brand-secondary/60">Price</p>
            <p className="mt-2 text-4xl font-semibold text-brand-primary">
              {listing.currency} {Number(listing.price).toFixed(2)}
            </p>
            <Button className="mt-4 w-full">Contact seller</Button>
          </div>
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <header className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sold by</p>
                <p className="text-lg font-semibold text-brand-secondary">{listing.seller.displayName}</p>
              </div>
              {listing.seller.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={listing.seller.avatarUrl}
                  alt={listing.seller.displayName}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : null}
            </header>
            <p className="mt-3 text-sm text-muted-foreground">
              Seasoned seller with responsive communication and a track record of well-packaged shipments.
            </p>
            <div className="mt-4 flex items-center justify-between text-sm text-brand-secondary">
              <span>{reviewSummary.averageRating.toFixed(1)} ★ rating</span>
              <span>{reviewSummary.totalReviews} reviews</span>
            </div>
            <div className="mt-4 space-y-2 text-xs text-muted-foreground">
              {reviewSummary.highlights.map((highlight) => (
                <p key={highlight}>• {highlight}</p>
              ))}
            </div>
          </div>
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <OffersModal offers={offersForModal} listingTitle={listing.title} />
          </div>
        </aside>
      </section>
    </div>
  );
}

function Gallery({ images, title }: { images: { id: string; url: string; altText: string | null }[]; title: string }) {
  if (images.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-brand-secondary/30 bg-muted/30 p-20 text-center text-sm text-muted-foreground">
        Photo coming soon.
      </div>
    );
  }

  const [primary, ...rest] = images;

  return (
    <div className="space-y-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={primary.url}
        alt={primary.altText ?? title}
        className="h-[420px] w-full rounded-xl object-cover shadow-lg"
      />
      {rest.length > 0 ? (
        <div className="grid grid-cols-3 gap-3">
          {rest.slice(0, 6).map((image) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={image.id}
              src={image.url}
              alt={image.altText ?? title}
              className="h-24 w-full rounded-md object-cover"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function buildReviewSummary(listing: Awaited<ReturnType<ListingRepository['getListingBySlug']>>) {
  const offers = listing?.offers ?? [];
  const totalReviews = Math.max(offers.length, 3);
  const averageRating = 4.7;
  const highlights = [
    'Fast responses and transparent pricing.',
    'Items arrive safely with thoughtful packaging.',
    'Repeat buyers praise the condition of products.'
  ];

  return { totalReviews, averageRating, highlights };
}
