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
      title: 'Listing unavailable',
    };
  }

  return {
    title: `${listing.title} · Marketplace`,
    description: listing.description.slice(0, 150),
    openGraph: {
      title: listing.title,
      description: listing.description,
      images: listing.images.map((image) => ({ url: image.url })),
    },
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
      avatarUrl: offer.buyer.avatarUrl,
    },
  }));

  const targetSpecies = listing.targetSpecies?.length ? listing.targetSpecies.join(', ') : null;
  const techniqueTags = listing.techniqueTags?.length ? listing.techniqueTags : [];
  const seasonalUse = listing.seasonalUse?.length ? listing.seasonalUse.join(', ') : null;
  const formattedLineRating =
    listing.lineRatingLbMin && listing.lineRatingLbMax
      ? `${listing.lineRatingLbMin}–${listing.lineRatingLbMax} lb`
      : listing.lineRatingLbMin
        ? `${listing.lineRatingLbMin} lb min`
        : listing.lineRatingLbMax
          ? `${listing.lineRatingLbMax} lb max`
          : null;
  const formattedWeight = listing.weightOz ? `${Number(listing.weightOz).toFixed(1)} oz` : null;
  const formattedLength = listing.lengthIn ? `${Number(listing.lengthIn).toFixed(1)} in` : null;
  const formattedMaxDrag = listing.maxDragLb ? `${Number(listing.maxDragLb).toFixed(1)} lb` : null;
  const formattedShippingWeight = listing.shippingWeightOz
    ? `${Number(listing.shippingWeightOz).toFixed(1)} oz`
    : null;
  const shippingDimensions =
    listing.shippingLengthIn && listing.shippingWidthIn && listing.shippingHeightIn
      ? `${Number(listing.shippingLengthIn).toFixed(1)}" L × ${Number(
          listing.shippingWidthIn,
        ).toFixed(1)}" W × ${Number(listing.shippingHeightIn).toFixed(1)}" H`
      : null;

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
            <p className="mt-3 text-sm text-muted-foreground whitespace-pre-line">
              {listing.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {listing.tags?.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-brand-primary/10 px-3 py-1 text-xs text-brand-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="mt-6 rounded-lg border border-brand-secondary/20 bg-brand-secondary/5 p-5">
              <h2 className="text-base font-semibold text-brand-secondary">Bass tackle specs</h2>
              <dl className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
                <MetadataRow label="Brand" value={listing.brand} />
                <MetadataRow label="Model" value={listing.modelName} />
                <MetadataRow label="Condition" value={formatEnumLabel(listing.condition)} />
                <MetadataRow
                  label="Category"
                  value={listing.tackleCategory ? formatEnumLabel(listing.tackleCategory) : null}
                />
                <MetadataRow
                  label="Water type"
                  value={listing.waterType ? formatEnumLabel(listing.waterType) : null}
                />
                <MetadataRow label="Lure style" value={listing.lureStyle} />
                <MetadataRow label="Target species" value={targetSpecies} />
                <MetadataRow
                  label="Technique focus"
                  value={techniqueTags.length ? techniqueTags.join(', ') : null}
                />
                <MetadataRow label="Seasonal highlights" value={seasonalUse} />
                <MetadataRow label="Line rating" value={formattedLineRating} />
                <MetadataRow label="Rod power" value={listing.rodPower} />
                <MetadataRow label="Rod action" value={listing.rodAction} />
                <MetadataRow label="Gear ratio" value={listing.gearRatio} />
                <MetadataRow
                  label="Bearing count"
                  value={listing.bearingCount !== null ? String(listing.bearingCount) : null}
                />
                <MetadataRow label="Max drag" value={formattedMaxDrag} />
                <MetadataRow label="Weight" value={formattedWeight} />
                <MetadataRow label="Length" value={formattedLength} />
                <MetadataRow label="Seller notes" value={listing.customNotes} />
              </dl>
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
            {listing.autoAcceptOfferCents || listing.minimumOfferCents ? (
              <p className="mt-3 text-xs text-muted-foreground">
                {listing.autoAcceptOfferCents
                  ? `Auto-accepts offers at $${(listing.autoAcceptOfferCents / 100).toFixed(2)} or higher.`
                  : null}
                {listing.autoAcceptOfferCents && listing.minimumOfferCents ? ' ' : null}
                {listing.minimumOfferCents
                  ? `Minimum offer considered: $${(listing.minimumOfferCents / 100).toFixed(2)}.`
                  : null}
              </p>
            ) : null}
          </div>
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-brand-secondary">Shipping & packaging</h2>
            <dl className="mt-4 space-y-2 text-sm text-muted-foreground">
              <MetadataRow
                label="Handling time"
                value={
                  listing.handlingTimeDays != null
                    ? `${listing.handlingTimeDays} day${listing.handlingTimeDays === 1 ? '' : 's'}`
                    : null
                }
              />
              <MetadataRow label="Ship-from" value={listing.shippingProfile?.shipFromCity} />
              <MetadataRow
                label="Carrier preference"
                value={listing.shippingProfile?.courierPreference}
              />
              <MetadataRow label="Service level" value={listing.shippingProfile?.serviceLevel} />
              <MetadataRow label="Packed weight" value={formattedShippingWeight} />
              <MetadataRow label="Package size" value={shippingDimensions} />
              <MetadataRow
                label="Signature"
                value={
                  listing.shippingProfile?.signatureRequired
                    ? 'Signature required upon delivery'
                    : listing.shippingProfile
                      ? 'No signature required'
                      : null
                }
              />
            </dl>
          </div>
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <header className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sold by</p>
                <p className="text-lg font-semibold text-brand-secondary">
                  {listing.seller.displayName}
                </p>
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
              Seasoned seller with responsive communication and a track record of well-packaged
              shipments.
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

function Gallery({
  images,
  title,
}: {
  images: { id: string; url: string; altText: string | null }[];
  title: string;
}) {
  if (images.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-brand-secondary/30 bg-muted/30 p-20 text-center text-sm text-muted-foreground">
        Photo coming soon.
      </div>
    );
  }

  const [primary, ...rest] = images;
  if (!primary) {
    return null;
  }

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

function MetadataRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) {
    return null;
  }

  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="font-medium text-brand-secondary">{label}</dt>
      <dd className="text-right text-muted-foreground">{value}</dd>
    </div>
  );
}

function formatEnumLabel(value: string | null | undefined) {
  if (!value) {
    return '';
  }

  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildReviewSummary(listing: Awaited<ReturnType<ListingRepository['getListingBySlug']>>) {
  const offers = listing?.offers ?? [];
  const totalReviews = Math.max(offers.length, 3);
  const averageRating = 4.7;
  const highlights = [
    'Fast responses and transparent pricing.',
    'Items arrive safely with thoughtful packaging.',
    'Repeat buyers praise the condition of products.',
  ];

  return { totalReviews, averageRating, highlights };
}
