import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';
import pino, { LoggerOptions } from 'pino';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { BatchSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { SpanStatusCode, trace, Tracer } from '@opentelemetry/api';
import { NextRequest } from 'next/server';

type LogContext = Record<string, unknown>;

type RouteHandler<T> = (request: NextRequest, ...rest: any[]) => Promise<T> | T;

type ResponseLike = { status?: number };

const globalCache = globalThis as typeof globalThis & {
  __POSSIBLE_API_LOGGER__?: pino.Logger;
  __POSSIBLE_API_TRACER__?: Tracer;
  __POSSIBLE_API_REGISTRY__?: Registry;
  __POSSIBLE_API_COUNTERS__?: Map<string, Counter<string>>;
  __POSSIBLE_API_OPERATION_HISTOGRAM__?: Histogram<string>;
  __POSSIBLE_API_HTTP_HISTOGRAM__?: Histogram<string>;
};

const serviceName = process.env.OTEL_SERVICE_NAME ?? 'possiblewebsite-api';
const metricsPrefix = process.env.METRICS_PREFIX ?? 'possiblewebsite';

function createLogger() {
  const options: LoggerOptions = {
    level: process.env.LOG_LEVEL ?? 'info',
    base: { service: serviceName },
  };

  if (process.env.NODE_ENV !== 'production') {
    options.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
      },
    };
  }

  return pino(options);
}

function createTracer() {
  const provider = new NodeTracerProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    }),
  });

  provider.addSpanProcessor(new BatchSpanProcessor(new ConsoleSpanExporter()));
  provider.register();

  return trace.getTracer(serviceName);
}

function createRegistry() {
  const register = new Registry();
  collectDefaultMetrics({
    prefix: `${metricsPrefix}_`,
    register,
  });
  return register;
}

function getRegistry() {
  if (!globalCache.__POSSIBLE_API_REGISTRY__) {
    globalCache.__POSSIBLE_API_REGISTRY__ = createRegistry();
  }
  return globalCache.__POSSIBLE_API_REGISTRY__;
}

function getLoggerInstance() {
  if (!globalCache.__POSSIBLE_API_LOGGER__) {
    globalCache.__POSSIBLE_API_LOGGER__ = createLogger();
  }
  return globalCache.__POSSIBLE_API_LOGGER__;
}

function getTracerInstance() {
  if (!globalCache.__POSSIBLE_API_TRACER__) {
    globalCache.__POSSIBLE_API_TRACER__ = createTracer();
  }
  return globalCache.__POSSIBLE_API_TRACER__;
}

function getCounters() {
  if (!globalCache.__POSSIBLE_API_COUNTERS__) {
    globalCache.__POSSIBLE_API_COUNTERS__ = new Map();
  }
  return globalCache.__POSSIBLE_API_COUNTERS__;
}

function sanitizeMetricName(name: string) {
  return name.replace(/[^a-zA-Z0-9_]/g, '_');
}

function getCounter(name: string) {
  const counters = getCounters();
  const metricName = `${metricsPrefix}_${sanitizeMetricName(name)}`;

  if (!counters.has(metricName)) {
    counters.set(
      metricName,
      new Counter({
        name: metricName,
        help: `Counter for ${name}`,
        labelNames: ['service'],
        registers: [getRegistry()],
      }),
    );
  }

  return counters.get(metricName)!;
}

function getOperationHistogram() {
  if (!globalCache.__POSSIBLE_API_OPERATION_HISTOGRAM__) {
    globalCache.__POSSIBLE_API_OPERATION_HISTOGRAM__ = new Histogram({
      name: `${metricsPrefix}_operation_duration_seconds`,
      help: 'Duration of internal operations in seconds',
      labelNames: ['service', 'operation', 'status'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
      registers: [getRegistry()],
    });
  }

  return globalCache.__POSSIBLE_API_OPERATION_HISTOGRAM__;
}

function getHttpHistogram() {
  if (!globalCache.__POSSIBLE_API_HTTP_HISTOGRAM__) {
    globalCache.__POSSIBLE_API_HTTP_HISTOGRAM__ = new Histogram({
      name: `${metricsPrefix}_http_request_duration_seconds`,
      help: 'HTTP request duration in seconds',
      labelNames: ['service', 'route', 'method', 'status'],
      buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
      registers: [getRegistry()],
    });
  }

  return globalCache.__POSSIBLE_API_HTTP_HISTOGRAM__;
}

export const logger = getLoggerInstance();

export function incrementMetric(name: string, value = 1) {
  const counter = getCounter(name);
  counter.inc({ service: serviceName }, value);
}

export async function getPrometheusMetrics() {
  return getRegistry().metrics();
}

export async function getMetricsSnapshot() {
  return getRegistry().getMetricsAsJSON();
}

export async function withTiming<T>(
  name: string,
  fn: () => Promise<T>,
  contextFields: LogContext = {},
): Promise<T> {
  const histogram = getOperationHistogram();
  const tracer = getTracerInstance();
  const childLogger = logger.child({ operation: name, ...contextFields });

  return tracer.startActiveSpan(name, async (span) => {
    const start = process.hrtime.bigint();
    try {
      const result = await fn();
      const durationNs = Number(process.hrtime.bigint() - start);
      const durationSeconds = durationNs / 1_000_000_000;

      histogram.observe(
        { service: serviceName, operation: name, status: 'success' },
        durationSeconds,
      );
      incrementMetric(`${name}.success`);

      span.setStatus({ code: SpanStatusCode.OK });
      childLogger.info(
        { durationMs: Number((durationSeconds * 1000).toFixed(2)) },
        `${name} completed`,
      );

      return result;
    } catch (error) {
      const durationNs = Number(process.hrtime.bigint() - start);
      const durationSeconds = durationNs / 1_000_000_000;

      histogram.observe(
        { service: serviceName, operation: name, status: 'error' },
        durationSeconds,
      );
      incrementMetric(`${name}.error`);

      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      childLogger.error(
        { err: error, durationMs: Number((durationSeconds * 1000).toFixed(2)) },
        `${name} failed`,
      );

      throw error;
    } finally {
      span.end();
    }
  });
}

export function instrumentRoute<T extends ResponseLike>(name: string, handler: RouteHandler<T>) {
  const histogram = getHttpHistogram();

  return async (request: NextRequest, ...args: any[]) => {
    const routeLogger = logger.child({ route: name, method: request.method });
    const spanName = `http.${request.method.toLowerCase()}.${sanitizeMetricName(name)}`;

    return withTiming(
      spanName,
      async () => {
        const start = process.hrtime.bigint();
        try {
          const result = await handler(request, ...args);
          const durationSeconds = Number(process.hrtime.bigint() - start) / 1_000_000_000;
          const status = typeof result === 'object' && result?.status ? result.status : 200;

          histogram.observe(
            { service: serviceName, route: name, method: request.method, status: String(status) },
            durationSeconds,
          );
          incrementMetric('http.requests.total');
          routeLogger.info(
            { status, durationMs: Number((durationSeconds * 1000).toFixed(2)) },
            'request handled',
          );

          return result;
        } catch (error) {
          const durationSeconds = Number(process.hrtime.bigint() - start) / 1_000_000_000;
          histogram.observe(
            { service: serviceName, route: name, method: request.method, status: '500' },
            durationSeconds,
          );
          incrementMetric('http.requests.error');
          routeLogger.error({ err: error }, 'request failed');
          throw error;
        }
      },
      { route: name, method: request.method },
    );
  };
}

// prime registry on module load
getRegistry();
