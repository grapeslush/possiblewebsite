import { NextResponse } from 'next/server';

import { incrementMetric, logger } from '../../../lib/observability';
import { prisma } from '../../../lib/services.js';

export const runtime = 'nodejs';

const requiredEnvVars = [
  'DATABASE_URL',
  'REDIS_URL',
  'MINIO_ENDPOINT',
  'MINIO_ACCESS_KEY',
  'MINIO_SECRET_KEY',
];

export async function GET() {
  const envIssues = requiredEnvVars.filter((key) => !process.env[key]);

  let databaseReady = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseReady = true;
  } catch (error) {
    logger.error({ err: error }, 'database readiness check failed');
  }

  const ready = envIssues.length === 0 && databaseReady;

  incrementMetric(`readiness.${ready ? 'ready' : 'blocked'}`);

  return NextResponse.json(
    {
      status: ready ? 'ready' : 'blocked',
      missingEnvironmentVariables: envIssues,
      dependencies: {
        database: databaseReady ? 'ready' : 'unreachable',
      },
    },
    { status: ready ? 200 : 503 },
  );
}
