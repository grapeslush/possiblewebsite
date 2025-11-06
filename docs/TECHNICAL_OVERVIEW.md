# Possible Website · Technical Overview

This document provides engineering-focused details on how the platform is structured, how to contribute safely, and what operational guardrails are in place.

## Architecture at a glance

- **Frontend:** Next.js 14 App Router in `apps/web` with TypeScript, Tailwind CSS, shadcn/ui, and Lucide icons.
- **Backend/API:** Next.js API workspace in `apps/api` exposing REST endpoints backed by Prisma and Zod validation.
- **Shared libraries:** `packages/db` (Prisma schema and migrations), `packages/ui` (shared React primitives), `packages/config` (ESLint, Tailwind, Jest configurations).
- **Infrastructure:** Docker Compose for local parity, Terraform scaffolding in `infra/terraform` for AWS (ECS Fargate, RDS, ElastiCache, S3-compatible object storage).
- **Observability:** OpenTelemetry tracing, Pino structured logging, and Prometheus metrics emitted across services.

## Local development flow

1. Install dependencies with `pnpm install`.
2. Copy `.env.example` to `.env` and configure secrets. The default `DATABASE_URL` points to a local Postgres instance.
3. Apply database changes:

   ```bash
   pnpm --filter @possiblewebsite/db run prisma:migrate
   pnpm --filter @possiblewebsite/db run prisma:seed
   ```

4. Start services in separate terminals or using [`pnpm recursive`](https://pnpm.io/cli/recursive):

   ```bash
   pnpm dev:web   # http://localhost:3000
   pnpm dev:api   # http://localhost:3001 (or override PORT)
   ```

5. Run `pnpm lint` and `pnpm test` before opening a pull request.

## Testing strategy

| Layer         | Location                             | Command                                            |
| ------------- | ------------------------------------ | -------------------------------------------------- |
| Unit          | `apps/*/__tests__`, `packages/*`     | `pnpm --filter web test`, `pnpm --filter api test` |
| Integration   | Playwright specs in `apps/web/tests` | `pnpm --filter web test:e2e -- --trace on`         |
| Performance   | k6 smoke tests in `tests/k6`         | `pnpm dlx k6@0.48.0 run tests/k6/smoke.js`         |
| Quality gates | ESLint, TypeScript, Prettier         | `pnpm lint`, `pnpm test`, Git hooks via Husky      |

## Deployment considerations

- **Static assets:** Served via Next.js Image Optimization or object storage. The new SVG favicon lives in `apps/web/public/icon.svg`.
- **CI/CD:** GitHub Actions workflow (see `.github/workflows/`) orchestrates linting, tests, Playwright traces, Lighthouse CI, dependency audits, and k6 runs.
- **Infrastructure-as-code:** Terraform modules provision networking, database, cache, queues, and observability sinks. Update `infra/terraform/README.md` with environment-specific values before running `terraform apply`.

## Security posture

- HTTP security headers (CSP, HSTS, Referrer-Policy, Permissions-Policy, X-Frame-Options, X-Content-Type-Options) are enforced via `apps/web/next.config.js` and `apps/api/next.config.js`.
- Prisma migrations run inside transactions; seeds avoid destructive resets.
- Secrets are loaded from environment variables and never committed.
- Dependency updates should be validated with `pnpm audit --prod` and `pnpm dlx npm-check-updates` before shipping.
- Sensitive routes require authentication through the existing middleware in `apps/web/middleware.ts`.

See `docs/SECURITY.md` for remediation processes and reporting channels.

## Contribution workflow

1. Create a feature branch from `main`.
2. Make changes following the code style enforced by ESLint and Prettier.
3. Run `pnpm lint` and `pnpm test` locally. For UI changes, capture a screenshot and attach it to the pull request.
4. Use conventional commits (`feat:`, `fix:`, etc.) and open a pull request summarizing user impact, risks, and screenshots.
5. Request review from at least one maintainer before merging.

## Operational dashboards

- **Prometheus metrics:** `/api/metrics` on both web and API apps.
- **Health checks:** `/api/health` (liveness) and `/api/readiness` (dependencies) for Kubernetes or ECS.
- **Tracing:** Configure OTLP exporters in `.env` to connect to Honeycomb, Jaeger, or Datadog.
- **Logging:** Pino writes structured JSON; use the pretty transport in development via `apps/*/lib/logger.ts`.

For additional questions, reach out via the `#possible-website` Slack channel or file an issue in the repository.
