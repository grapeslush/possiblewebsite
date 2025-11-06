import {
  AuditRepository,
  DisputeRepository,
  MarketplaceService,
  NotificationSettingRepository,
  OrderRepository,
  ReviewRepository,
  prisma,
} from '@possiblewebsite/db';

export const marketplace = new MarketplaceService(prisma);
export const orders = new OrderRepository(prisma);
export const disputes = new DisputeRepository(prisma);
export const auditLogs = new AuditRepository(prisma);
export const notificationSettings = new NotificationSettingRepository(prisma);
export const reviews = new ReviewRepository(prisma);

export { prisma } from '@possiblewebsite/db';
