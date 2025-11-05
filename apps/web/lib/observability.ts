import { performance } from 'node:perf_hooks';

type LogLevel = 'info' | 'error' | 'warn';

interface LogContext {
  [key: string]: unknown;
}

class StructuredLogger {
  log(level: LogLevel, message: string, context: LogContext = {}) {
    const payload = {
      level,
      message,
      ...context,
      timestamp: new Date().toISOString()
    };

    if (level === 'error') {
      // eslint-disable-next-line no-console
      console.error(payload);
    } else if (level === 'warn') {
      // eslint-disable-next-line no-console
      console.warn(payload);
    } else {
      // eslint-disable-next-line no-console
      console.info(payload);
    }
  }

  info(message: string, context: LogContext = {}) {
    this.log('info', message, context);
  }

  warn(message: string, context: LogContext = {}) {
    this.log('warn', message, context);
  }

  error(message: string, context: LogContext = {}) {
    this.log('error', message, context);
  }
}

export const logger = new StructuredLogger();

const counters = new Map<string, number>();

export function incrementMetric(name: string, value = 1) {
  const current = counters.get(name) ?? 0;
  counters.set(name, current + value);
}

export function getMetricsSnapshot() {
  return Object.fromEntries(counters.entries());
}

export async function withTiming<T>(
  name: string,
  fn: () => Promise<T>,
  context: LogContext = {}
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const durationMs = performance.now() - start;
    incrementMetric(`${name}.success`);
    logger.info(`${name} completed`, { durationMs: Number(durationMs.toFixed(2)), ...context });
    return result;
  } catch (error) {
    const durationMs = performance.now() - start;
    incrementMetric(`${name}.error`);
    logger.error(`${name} failed`, { durationMs: Number(durationMs.toFixed(2)), error, ...context });
    throw error;
  }
}
