import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

const createClient = () =>
  new PrismaClient({
    log: process.env.PRISMA_LOG_LEVEL === 'debug' ? ['query', 'warn', 'error'] : ['warn', 'error']
  });

export const prisma = globalThis.__prisma__ ?? createClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma__ = prisma;
}

export type PrismaTransactionClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

export default prisma;
