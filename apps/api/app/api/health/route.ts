import { NextResponse } from 'next/server';
import IORedis from 'ioredis';

import { incrementMetric, logger } from '../../../lib/observability';
import { prisma } from '../../../lib/services.js';

export const runtime = 'nodejs';

export async function GET() {
  const checks: Record<string, { status: 'pass' | 'fail'; latencyMs?: number; error?: string }> =
    {};

  // Database health
  const dbStart = process.hrtime.bigint();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const durationMs = Number(process.hrtime.bigint() - dbStart) / 1_000_000;
    checks.database = { status: 'pass', latencyMs: Number(durationMs.toFixed(2)) };
  } catch (error) {
    const durationMs = Number(process.hrtime.bigint() - dbStart) / 1_000_000;
    logger.error({ err: error, durationMs }, 'database health check failed');
    checks.database = {
      status: 'fail',
      latencyMs: Number(durationMs.toFixed(2)),
      error: (error as Error).message,
    };
  }

  // Redis health
  const redisStart = process.hrtime.bigint();
  let redis: IORedis | undefined;
  try {
    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
    redis = new IORedis(redisUrl, { lazyConnect: true });
    await redis.connect();
    await redis.ping();
    const durationMs = Number(process.hrtime.bigint() - redisStart) / 1_000_000;
    checks.redis = { status: 'pass', latencyMs: Number(durationMs.toFixed(2)) };
  } catch (error) {
    const durationMs = Number(process.hrtime.bigint() - redisStart) / 1_000_000;
    logger.error({ err: error, durationMs }, 'redis health check failed');
    checks.redis = {
      status: 'fail',
      latencyMs: Number(durationMs.toFixed(2)),
      error: (error as Error).message,
    };
  } finally {
    if (redis && redis.status !== 'end') {
      redis.quit().catch((quitError) => {
        logger.warn({ err: quitError }, 'failed to close redis connection after health check');
      });
    }
  }

  // Queue scheduler readiness is inferred from redis connectivity
  checks.queueScheduler = {
    status: checks.redis?.status === 'pass' ? 'pass' : 'fail',
  };

  const failedChecks = Object.values(checks).filter((check) => check.status === 'fail');
  const status = failedChecks.length === 0 ? 'ok' : 'degraded';
  const responseStatus = failedChecks.length === 0 ? 200 : 503;

  incrementMetric(`health.${status}`);

  return NextResponse.json(
    {
      status,
      observedAt: new Date().toISOString(),
      uptimeSeconds: Number(process.uptime().toFixed(0)),
      version: process.env.GIT_COMMIT_SHA ?? 'dev',
      checks,
    },
    { status: responseStatus },
  );
}
