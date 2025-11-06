# Possible Website Monorepo

Possible Website is an end-to-end marketplace reference stack. The monorepo contains a customer-facing web application, a feature-rich API, shared Prisma models, and infrastructure scaffolding. Observability is first-class with Pino logging, OpenTelemetry tracing, and Prometheus metrics enabled across services.

Whether you are a product manager exploring the experience or an engineer preparing to ship code, the repository now ships with two complementary guides:

- **Non-technical onboarding:** `docs/USER_GUIDE.md` walks through prerequisites, one-click Docker setup, and how to explore the product without writing code.
- **Technical deep dive:** `docs/TECHNICAL_OVERVIEW.md` explains architecture decisions, CI/CD, data flows, and operational playbooks for engineers.

## Repository layout

| Path                             | Description                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------ |
| `apps/web`                       | Next.js 14 web app with help center content, policies, and buyer/seller flows. |
| `apps/api`                       | Next.js API workspace exposing commerce endpoints with tracing and metrics.    |
| `packages/db`                    | Prisma schema, migrations, and seed script used by both applications.          |
| `packages/config`, `packages/ui` | Shared tooling configuration and UI primitives.                                |
| `docs/`                          | Product documentation, OpenAPI spec, ER diagram, and test artifacts.           |
| `infra/terraform`                | Terraform skeleton ready for AWS deployment.                                   |

## Quick start options

### Non-technical preview

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) and ensure it is running.
2. Copy `.env.example` to `.env` in the repository root. Only the `DATABASE_URL` entry is required for the demo; leave the suggested value untouched to use the bundled Postgres container.
3. Launch the full platform:

   ```bash
   docker compose up --build
   ```

4. Visit the following URLs:
   - Web UI: <http://localhost:3000>
   - API playground: <http://localhost:4000>
   - MailHog inbox: <http://localhost:8025>
   - MinIO Console: <http://localhost:9001>

5. When finished, press `Ctrl+C` in the terminal and run `docker compose down` to tear everything down.

Refer to the "Product tour" section in `docs/USER_GUIDE.md` for a curated walkthrough of the marketplace flows.

### Development quick start

1. Install dependencies with `pnpm install`.
2. Copy `.env.example` to `.env` (or export environment variables) and set `DATABASE_URL`, `REDIS_URL`, and any provider keys.
3. Apply database migrations and seed demo data:

   ```bash
   pnpm --filter @possiblewebsite/db run prisma:migrate
   pnpm --filter @possiblewebsite/db run prisma:seed
   ```

4. Start the applications:

   ```bash
   pnpm dev:web   # http://localhost:3000
   pnpm dev:api   # http://localhost:3001 (set PORT before running)
   ```

> Prefer containers? The non-technical preview flow above uses the same Compose stack that engineers can adopt for parity with production-like services.

## Observability

Both applications share a consistent observability toolchain:

- **Pino** structured logging with pretty transport in development.
- **OpenTelemetry** spans emitted via a Node tracer provider (instrumentation hooks live in `apps/*/lib/observability.ts`).
- **Prometheus** metrics exposed at `/api/metrics` in each app.
- Health and readiness endpoints (`/api/health`, `/api/readiness`) provide JSON status for orchestrators.

## Testing & CI

The GitHub Actions workflow runs migrations, linting, unit tests, Playwright end-to-end tests (with trace uploads), Lighthouse CI, dependency audits, and k6 smoke tests. To mimic the pipeline locally:

```bash
pnpm lint
pnpm test
pnpm --filter web test:e2e -- --trace on
pnpm exec lhci autorun --collect.startServerCommand="pnpm --filter web dev"
pnpm dlx k6@0.48.0 run tests/k6/smoke.js
```

Playwright trace artifacts for recent runs are stored in `docs/playwright-traces/` for quick debugging.

## Documentation

- **API contract:** `docs/openapi.yaml`
- **Data model ERD:** `docs/erd.md`
- **Seed data instructions:** `docs/seed-instructions.md`
- **Playwright traces and usage:** `docs/playwright-traces/`

Refer to `infra/terraform/README.md` for infrastructure-as-code guidance and the security posture outlined in `docs/SECURITY.md`.
