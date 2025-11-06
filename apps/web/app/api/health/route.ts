import { NextResponse } from 'next/server';

import { getPrometheusMetrics, incrementMetric, logger } from '@/lib/observability';
import { prisma } from '@possiblewebsite/db';

export const runtime = 'nodejs';

export async function GET() {
  const checks: Record<string, { status: 'pass' | 'fail'; detail?: string }> = {};

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'pass' };
  } catch (error) {
    logger.error({ err: error }, 'web database connectivity failed');
    checks.database = { status: 'fail', detail: (error as Error).message };
  }

  checks.metrics = {
    status: (await getPrometheusMetrics()).length > 0 ? 'pass' : 'fail',
  };

  const status = Object.values(checks).every((check) => check.status === 'pass')
    ? 'ok'
    : 'degraded';
  incrementMetric(`health.${status}`);

  return NextResponse.json(
    {
      status,
      observedAt: new Date().toISOString(),
      checks,
    },
    { status: status === 'ok' ? 200 : 503 },
  );
}
