import { MarketplaceService, prisma } from '@possiblewebsite/db';

export const marketplace = new MarketplaceService(prisma);

export { prisma } from '@possiblewebsite/db';
