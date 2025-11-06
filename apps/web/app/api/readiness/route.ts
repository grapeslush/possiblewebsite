import { NextResponse } from 'next/server';

import { incrementMetric } from '@/lib/observability';

export const runtime = 'nodejs';

const requiredEnvVars = ['NEXTAUTH_SECRET', 'DATABASE_URL'];

export async function GET() {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  const ready = missing.length === 0;

  incrementMetric(`readiness.${ready ? 'ready' : 'blocked'}`);

  return NextResponse.json(
    {
      status: ready ? 'ready' : 'blocked',
      missingEnvironmentVariables: missing,
    },
    { status: ready ? 200 : 503 },
  );
}
