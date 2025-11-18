import { NextRequest, NextResponse } from 'next/server';
import { NotificationType } from '@possiblewebsite/db';
import { z } from 'zod';
import { notificationSettings } from '../../../../lib/services';

const notificationTypeValues = [
  'OFFER_RECEIVED',
  'OFFER_UPDATED',
  'ORDER_UPDATED',
  'DISPUTE_UPDATED',
  'SYSTEM',
] as const;

const updateSchema = z.object({
  userId: z.string(),
  type: z.enum(notificationTypeValues),
  emailEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
});

type UpdateSettingsInput = z.infer<typeof updateSchema>;

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
  let parsed: UpdateSettingsInput;

  try {
    parsed = updateSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }

    throw error;
  }

  const { userId, type, emailEnabled, inAppEnabled } = parsed;

  const setting = await notificationSettings.upsertSetting(userId, type as NotificationType, {
    emailEnabled,
    inAppEnabled,
  });

  return NextResponse.json(setting, { status: 200 });
}
