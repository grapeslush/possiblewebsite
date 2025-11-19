import { Prisma, PrismaClient } from '@prisma/client';

export class PlatformSettingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  get(key: string) {
    return this.prisma.platformSetting.findUnique({ where: { key } });
  }

  set(key: string, value: Prisma.InputJsonValue) {
    return this.prisma.platformSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
}
