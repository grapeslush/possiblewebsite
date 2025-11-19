# Tackle Exchange Monorepo

Tackle Exchange is a reference marketplace built for buying and selling used fishing tackle. The monorepo showcases a Next.js 14 customer experience, a typed API surface, shared Prisma models, and infrastructure scaffolding that highlight escrow workflows, safety reviews, and marketplace analytics tailored to anglers.

## Repository layout

| Path                             | Description                                                                                |
| -------------------------------- | ------------------------------------------------------------------------------------------ |
| `apps/web`                       | Next.js 14 web app featuring the Tackle Exchange marketplace, help center, and policy hub. |
| `apps/api`                       | API workspace that powers escrow, messaging, and payout flows with distributed tracing.    |
| `packages/db`                    | Prisma schema, migrations, and seed helpers reused across services.                        |
| `packages/config`, `packages/ui` | Shared tooling configuration and UI primitives.                                            |
| `docs/`                          | Product collateral, API contract, ER diagram, and testing artifacts.                       |
| `infra/terraform`                | Terraform starter kit for provisioning the platform in AWS.                                |

## Development quick start

1. Install dependencies with `pnpm install`. Docker Desktop or the Docker Engine + Compose plugin is required for the containerized workflow.
2. Copy `.env.example` to `.env` (or export environment variables) and set `DATABASE_URL`, `REDIS_URL`, `NEXTAUTH_SECRET`, and provider keys for mail, storage, and hCaptcha.
3. Apply database migrations and seed demo inventory:

   ```bash
   pnpm --filter @possiblewebsite/db run prisma:migrate
   pnpm --filter @possiblewebsite/db run prisma:seed
   ```

   The seed loads 200+ curated listings spanning rods, reels, lures, lines, electronics, apparel, storage, and boat accessories. It also provisions offers, carts, orders across every status, payouts, shipments with tracking metadata, reviews, disputes, support threads, and help-center content sourced from `docs/help/`.

   Demo credentials for QA:

   | Role    | Email                                                                                                                                                                                             | Password       |
   | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
   | Admin   | `admin@possible.tackle`                                                                                                                                                                           | `demoPass123!` |
   | Support | `support@possible.tackle`                                                                                                                                                                         | `demoPass123!` |
   | Sellers | `demo-seller@possible.tackle`, `smallbatch@possible.tackle`, `deckhand-supply@possible.tackle`, `heritage-rods@possible.tackle`, `bayou-tech@possible.tackle`, `northwoods@possible.tackle`       | `demoPass123!` |
   | Buyers  | `verified-buyer@possible.tackle`, `boat-tour@possible.tackle`, `weekend-grass@possible.tackle`, `suspending-baits@possible.tackle`, `river-smallie@possible.tackle`, `salt-ready@possible.tackle` | `demoPass123!` |

   Fixture assets that power listing media live in `apps/web/public/seed-images/`.

4. Start the applications:

   ```bash
   pnpm dev:web   # http://localhost:3000
   pnpm dev:api   # http://localhost:3001 (set PORT before running)
   ```

### Docker-based workflow

Use the provided compose stack to bring up the app container. Optional profiles can also start PostgreSQL, Redis, MailHog, and MinIO if you don't want to point at external services:

```bash
docker compose up --build                       # app only
docker compose --profile postgres --profile redis up --build  # add DB/cache
docker compose --profile minio --profile mailhog up --build   # add storage/mail
```

If you prefer to pre-seed configuration values instead of using the wizard, copy `.env.example` to `.env` before building:

On first launch the app redirects to `/setup`, where you can enter database/cache, storage, mail, and admin credentials through the browser. Configuration is written to `/app/.env` inside the container; bind-mount a host path to that file if you want it to persist across rebuilds. The `.env.example` is still available for pre-seeding values when automating deployments or overriding the wizard defaults, but manual editing is no longer required for local trials.

## Observability

Both applications share a consistent observability toolchain tuned for marketplace debugging:

- **Pino** structured logging with pretty transport in development.
- **OpenTelemetry** spans emitted via a Node tracer provider (`apps/*/instrumentation.ts`).
- **Prometheus** metrics available at `/api/metrics`.
- JSON health and readiness endpoints (`/api/health`, `/api/readiness`) suitable for container orchestrators.

## Testing & CI

The GitHub Actions workflow runs migrations, linting, unit tests, Playwright end-to-end suites (with trace uploads), Lighthouse CI, dependency audits, and k6 smoke tests. To mimic the pipeline locally:

```bash
pnpm lint
pnpm test
pnpm --filter web test:e2e -- --trace on
pnpm exec lhci autorun --collect.startServerCommand="pnpm --filter web dev"
pnpm dlx k6@0.48.0 run tests/k6/smoke.js
```

Playwright trace artifacts for recent runs live in `docs/playwright-traces/` for quick debugging.

## Documentation

- **User guide:** `docs/USER_GUIDE.md`
- **Technical overview:** `docs/TECHNICAL_OVERVIEW.md`
- **Security posture:** `docs/SECURITY.md`
- **API contract:** `docs/openapi.yaml`
- **Data model ERD:** `docs/erd.md`
- **Seed data instructions:** `docs/seed-instructions.md`

Refer to `infra/terraform/README.md` for infrastructure-as-code guidance. Package scopes continue to use the `@possiblewebsite/*` naming convention for compatibility with existing tooling.
