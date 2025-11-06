import { NextResponse } from 'next/server';

import { getPrometheusMetrics } from '../../../lib/observability';

export const runtime = 'nodejs';

export async function GET() {
  const metrics = await getPrometheusMetrics();

  return new NextResponse(metrics, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; version=0.0.4',
      'Cache-Control': 'no-store',
    },
  });
}
