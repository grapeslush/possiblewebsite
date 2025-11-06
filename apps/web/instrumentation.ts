import { logger } from './lib/observability';

export function register() {
  logger.debug?.('web instrumentation registered');
}
