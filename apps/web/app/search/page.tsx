import { ListingStatus } from '@prisma/client';
import { Metadata } from 'next';
import Link from 'next/link';

import { prisma, ListingRepository } from '@possiblewebsite/db';

import { Button } from '@/components/ui/button';

const repository = new ListingRepository(prisma);

interface SearchPageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const term = extractParam(searchParams.q);
  const category = extractParam(searchParams.category);

  const title = term ? `Search results for "${term}"` : 'Explore Tackle Exchange listings';
  const description = category
    ? `Curated Tackle Exchange listings in ${category}. Discover new and vintage gear backed by AI-assisted content.`
    : 'Discover verified gear with AI-enhanced descriptions, seasonal pricing insights, and escrow protection.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
    alternates: {
      canonical: term ? `/search?q=${encodeURIComponent(term)}` : '/search',
    },
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const term = extractParam(searchParams.q);
  const category = extractParam(searchParams.category);
  const minPrice = parseNumber(searchParams.minPrice);
  const maxPrice = parseNumber(searchParams.maxPrice);

  const listings = await repository.searchListings({
    term,
    category,
    minPrice: minPrice ?? undefined,
    maxPrice: maxPrice ?? undefined,
    limit: 30,
  });

  const categories = await prisma.listing.findMany({
    where: {
      status: ListingStatus.ACTIVE,
      category: { not: null },
    },
    distinct: ['category'],
    select: { category: true },
    orderBy: { category: 'asc' },
  });

  const jsonLd = buildJsonLd(listings, term);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-brand-secondary">
          Tackle Exchange marketplace
        </p>
        <h1 className="text-3xl font-semibold">
          {term ? `Results for “${term}”` : 'Search tackle listings'}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          We use PostgreSQL trigram search to surface fuzzy matches, and overlay AI-powered pricing
          guidance to highlight high-confidence deals.
        </p>
      </header>

      <form
        className="grid gap-4 rounded-lg border bg-white p-6 shadow-sm md:grid-cols-[2fr_1fr_1fr_1fr]"
        method="get"
      >
        <label className="flex flex-col gap-1 text-sm">
          Search term
          <input
            className="rounded-md border border-brand-secondary/30 px-3 py-2"
            name="q"
            defaultValue={term ?? ''}
            placeholder="Custom jigging rod, sonar bundle…"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Category
          <select
            name="category"
            defaultValue={category ?? ''}
            className="rounded-md border border-brand-secondary/30 px-3 py-2"
          >
            <option value="">All tackle categories</option>
            {categories
              .map((entry) => entry.category)
              .filter((value): value is string => Boolean(value))
              .map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Min price
          <input
            type="number"
            name="minPrice"
            defaultValue={minPrice ?? ''}
            className="rounded-md border border-brand-secondary/30 px-3 py-2"
            step="0.01"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Max price
          <input
            type="number"
            name="maxPrice"
            defaultValue={maxPrice ?? ''}
            className="rounded-md border border-brand-secondary/30 px-3 py-2"
            step="0.01"
          />
        </label>
        <div className="md:col-span-4 flex items-center justify-end gap-3">
          <Button variant="ghost" asChild>
            <Link href="/search">Clear</Link>
          </Button>
          <Button type="submit">Search</Button>
        </div>
      </form>

      <section className="grid gap-6 md:grid-cols-3">
        {listings.length === 0 ? (
          <div className="col-span-full rounded-md border border-dashed border-brand-secondary/30 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            No tackle matched your query. Try adjusting filters or exploring a different category.
          </div>
        ) : (
          listings.map((listing) => (
            <article
              key={listing.id}
              className="space-y-3 rounded-lg border bg-white p-4 shadow-sm"
            >
              <Link href={`/listing/${listing.slug}`} className="group flex flex-col gap-3">
                {listing.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={listing.images[0].url}
                    alt={listing.images[0].altText ?? listing.title}
                    className="h-48 w-full rounded-md object-cover transition group-hover:scale-[1.02]"
                  />
                ) : null}
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-semibold text-brand-secondary">{listing.title}</h2>
                  <span className="text-sm font-semibold text-brand-primary">
                    {listing.currency} {Number(listing.price).toFixed(2)}
                  </span>
                </div>
                <p className="line-clamp-3 text-sm text-muted-foreground">{listing.description}</p>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>Seller: {listing.seller.displayName}</span>
                  {listing.category ? <span>Category: {listing.category}</span> : null}
                </div>
              </Link>
            </article>
          ))
        )}
      </section>

      <script type="application/ld+json" suppressHydrationWarning>
        {JSON.stringify(jsonLd)}
      </script>
    </div>
  );
}

function extractParam(param: string | string[] | undefined) {
  if (Array.isArray(param)) {
    return param[0];
  }
  return param ?? null;
}

function parseNumber(value: string | string[] | undefined) {
  const raw = extractParam(value as string | string[] | undefined);
  if (!raw) {
    return null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildJsonLd(listings: any[], searchTerm: string | null) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: searchTerm ? `Marketplace results for ${searchTerm}` : 'Marketplace listings',
    itemListElement: listings.map((listing, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/listing/${listing.slug}`,
      name: listing.title,
      image: listing.images?.[0]?.url,
      offers: {
        '@type': 'Offer',
        priceCurrency: listing.currency,
        price: Number(listing.price),
      },
    })),
  };
}
