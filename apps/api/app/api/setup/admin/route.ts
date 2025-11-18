import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { instrumentRoute } from '../../../../lib/observability';
import { createAdminAccount } from '../../../../lib/setup';

export const runtime = 'nodejs';

const adminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12, 'Use a strong passphrase with at least 12 characters'),
  displayName: z.string().min(2),
});

async function handler(request: NextRequest) {
  const payload = adminSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const admin = await createAdminAccount(payload.data);

  return NextResponse.json({
    admin: { id: admin.id, email: admin.email, displayName: admin.displayName, role: admin.role },
  });
}

export const POST = instrumentRoute('setup.admin', handler);
