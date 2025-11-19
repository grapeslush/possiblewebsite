import { applyPersistedConfigToEnv, getOnboardingStatus } from '../lib/setup';
import { prisma } from '../lib/services';

async function main() {
  try {
    await applyPersistedConfigToEnv();
    const status = await getOnboardingStatus();

    console.log(JSON.stringify(status));

    if (!status.completed) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('unable to read onboarding status', error);
    process.exitCode = 2;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
