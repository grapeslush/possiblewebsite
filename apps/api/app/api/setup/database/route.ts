import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { instrumentRoute } from '../../../../lib/observability';
import { persistConfig } from '../../../../lib/setup';

export const runtime = 'nodejs';

const databaseSchema = z.object({
  databaseUrl: z.string().url({ message: 'Database URL must be a valid connection string' }),
  redisUrl: z.string().url().optional(),
  nextAuthSecret: z.string().min(16, 'Use a 16+ character secret').optional(),
});

async function handler(request: NextRequest) {
  const payload = databaseSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const updates: Record<string, string> = {
    DATABASE_URL: payload.data.databaseUrl,
  };

  if (payload.data.redisUrl) {
    updates.REDIS_URL = payload.data.redisUrl;
  }

  if (payload.data.nextAuthSecret) {
    updates.NEXTAUTH_SECRET = payload.data.nextAuthSecret;
  }

  const result = await persistConfig(updates);

  return NextResponse.json({ saved: result.keys, configPath: result.path });
}

export const POST = instrumentRoute('setup.database', handler);
