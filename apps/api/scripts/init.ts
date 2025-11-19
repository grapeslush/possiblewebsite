import { initializePlatform, applyPersistedConfigToEnv } from '../lib/setup';
import { logger } from '../lib/observability';
import { prisma } from '../lib/services';

async function main() {
  try {
    await applyPersistedConfigToEnv();

    const result = await initializePlatform();

    if (!result.ok) {
      logger.error({ err: result.error }, 'setup initialization failed');
      process.exitCode = 1;
      return;
    }

    if (result.alreadyCompleted) {
      logger.info('setup already marked complete, skipping initialization');
      return;
    }

    logger.info(
      {
        completedAt: result.completedAt,
        migrationsRanAt: result.migrationsRanAt,
        seedRanAt: result.seedRanAt,
      },
      'setup finished successfully',
    );
  } catch (error) {
    logger.error({ err: error }, 'unhandled setup initialization error');
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
