import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { instrumentRoute } from '../../../../lib/observability';
import { persistConfig } from '../../../../lib/setup';

export const runtime = 'nodejs';

const mailSchema = z.object({
  provider: z.enum(['postmark', 'sendgrid']),
  apiKey: z.string().min(8),
  fromEmail: z.string().email(),
});

async function handler(request: NextRequest) {
  const payload = mailSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const updates: Record<string, string> = {};

  if (payload.data.provider === 'postmark') {
    updates.POSTMARK_SERVER_TOKEN = payload.data.apiKey;
    updates.POSTMARK_FROM_EMAIL = payload.data.fromEmail;
  } else {
    updates.SENDGRID_API_KEY = payload.data.apiKey;
    updates.SENDGRID_FROM_EMAIL = payload.data.fromEmail;
  }

  const result = await persistConfig(updates);

  return NextResponse.json({ saved: result.keys, configPath: result.path });
}

export const POST = instrumentRoute('setup.mail', handler);
