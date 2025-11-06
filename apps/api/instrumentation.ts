import { logger } from './lib/observability';

export function register() {
  logger.debug?.('api instrumentation registered');
}
