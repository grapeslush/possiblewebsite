import { NotificationType, PrismaClient } from '@prisma/client';

export interface UpdateNotificationSettingInput {
  emailEnabled?: boolean;
  inAppEnabled?: boolean;
}

export class NotificationSettingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  getUserSettings(userId: string) {
    return this.prisma.notificationSetting.findMany({
      where: { userId },
      orderBy: { type: 'asc' },
    });
  }

  upsertSetting(userId: string, type: NotificationType, input: UpdateNotificationSettingInput) {
    return this.prisma.notificationSetting.upsert({
      where: { userId_type: { userId, type } },
      update: {
        emailEnabled: input.emailEnabled ?? undefined,
        inAppEnabled: input.inAppEnabled ?? undefined,
      },
      create: {
        userId,
        type,
        emailEnabled: input.emailEnabled ?? true,
        inAppEnabled: input.inAppEnabled ?? true,
      },
    });
  }

  async isEmailEnabled(userId: string, type: NotificationType) {
    const setting = await this.prisma.notificationSetting.findUnique({
      where: { userId_type: { userId, type } },
    });

    return setting?.emailEnabled ?? true;
  }

  async isInAppEnabled(userId: string, type: NotificationType) {
    const setting = await this.prisma.notificationSetting.findUnique({
      where: { userId_type: { userId, type } },
    });

    return setting?.inAppEnabled ?? true;
  }
}
