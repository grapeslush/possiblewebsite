import { NextRequest, NextResponse } from 'next/server';
import { NotificationType } from '@prisma/client';
import { z } from 'zod';
import { notificationSettings } from '../../../../lib/services';

const updateSchema = z.object({
  userId: z.string(),
  type: z.nativeEnum(NotificationType),
  emailEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  const settings = await notificationSettings.getUserSettings(userId);
  return NextResponse.json(settings);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const setting = await notificationSettings.upsertSetting(parsed.data.userId, parsed.data.type, {
    emailEnabled: parsed.data.emailEnabled,
    inAppEnabled: parsed.data.inAppEnabled,
  });

  return NextResponse.json(setting, { status: 200 });
}
