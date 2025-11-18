import { applyPersistedConfigToEnv } from './lib/setup';
import { logger } from './lib/observability';

export function register() {
  void applyPersistedConfigToEnv();
  logger.debug?.('api instrumentation registered');
}
