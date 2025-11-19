import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { z } from 'zod';

import { incrementMetric, logger, withTiming } from '@/lib/observability';

const querySchema = z.object({
  title: z.string().min(3),
  category: z.string().optional(),
});

async function callEbayPricing({ title, category }: z.infer<typeof querySchema>) {
  const appId = process.env.EBAY_APP_ID;
  if (!appId) {
    return null;
  }

  const params = new URLSearchParams({
    'OPERATION-NAME': 'findCompletedItems',
    'SERVICE-VERSION': '1.13.0',
    'SECURITY-APPNAME': appId,
    'RESPONSE-DATA-FORMAT': 'JSON',
    keywords: title,
  });

  if (category) {
    params.set('categoryId', category);
  }

  const endpoint = `https://svcs.ebay.com/services/search/FindingService/v1?${params.toString()}`;
  const response = await fetch(endpoint, {
    headers: {
      'X-EBAY-SOA-GLOBAL-ID': process.env.EBAY_GLOBAL_ID ?? 'EBAY-US',
      'X-EBAY-SOA-OPERATION-NAME': 'findCompletedItems',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`eBay API error: ${response.status} ${text}`);
  }

  return response.json();
}

function buildPricingSummary(input: z.infer<typeof querySchema>, ebayPayload: any | null) {
  if (!ebayPayload) {
    const base = 120 + Math.random() * 40;
    return {
      averagePrice: Number(base.toFixed(2)),
      minPrice: Number((base * 0.85).toFixed(2)),
      maxPrice: Number((base * 1.25).toFixed(2)),
      currency: 'USD',
      comparableListings: [],
      provider: 'fallback',
      rationale: `Estimate generated locally for "${input.title}"${input.category ? ` in ${input.category}` : ''}.`,
    };
  }

  const items = ebayPayload?.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item ?? [];
  const soldItems = items
    .filter((item: any) => item.sellingStatus?.[0]?.sellingState?.[0] === 'EndedWithSales')
    .map((item: any) => ({
      title: item.title?.[0],
      price: Number(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ ?? 0),
      currency: item.sellingStatus?.[0]?.currentPrice?.[0]?.['@currencyId'] ?? 'USD',
      url: item.viewItemURL?.[0],
    }))
    .filter((item: any) => item.price > 0);

  if (soldItems.length === 0) {
    return buildPricingSummary(input, null);
  }

  const prices = soldItems.map((item: any) => item.price);
  const totalPrice = prices.reduce((sum: number, value: number) => sum + value, 0);
  const averagePrice = totalPrice / prices.length;

  return {
    averagePrice: Number(averagePrice.toFixed(2)),
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
    currency: soldItems[0]?.currency ?? 'USD',
    comparableListings: soldItems.slice(0, 5),
    provider: 'ebay',
    rationale: `Based on ${soldItems.length} completed listings from eBay.`,
  };
}

export async function GET(request: NextRequest) {
  return withTiming('ai.ebay_pricing', async () => {
    const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!parsed.success) {
      incrementMetric('ai.ebay.validation_error');
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
    }

    try {
      const ebayPayload = await callEbayPricing(parsed.data);
      const summary = buildPricingSummary(parsed.data, ebayPayload);
      incrementMetric('ai.ebay.success');
      return NextResponse.json(summary);
    } catch (error) {
      logger.error('eBay pricing fetch failed', { error });
      incrementMetric('ai.ebay.error');
      return NextResponse.json(buildPricingSummary(parsed.data, null));
    }
  });
}
