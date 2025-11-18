import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { instrumentRoute } from '../../../../lib/observability';
import { persistConfig } from '../../../../lib/setup';

export const runtime = 'nodejs';

const storageSchema = z.object({
  endpoint: z.string().url({ message: 'Object storage endpoint must be a URL' }),
  bucket: z.string().min(1),
  region: z.string().min(1),
  accessKey: z.string().min(1),
  secretKey: z.string().min(1),
  publicUrl: z.string().url().optional(),
});

async function handler(request: NextRequest) {
  const payload = storageSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const updates: Record<string, string> = {
    OBJECT_STORAGE_ENDPOINT: payload.data.endpoint,
    OBJECT_STORAGE_BUCKET: payload.data.bucket,
    OBJECT_STORAGE_REGION: payload.data.region,
    OBJECT_STORAGE_ACCESS_KEY: payload.data.accessKey,
    OBJECT_STORAGE_SECRET_KEY: payload.data.secretKey,
  };

  if (payload.data.publicUrl) {
    updates.OBJECT_STORAGE_PUBLIC_URL = payload.data.publicUrl;
  }

  const result = await persistConfig(updates);

  return NextResponse.json({ saved: result.keys, configPath: result.path });
}

export const POST = instrumentRoute('setup.storage', handler);
