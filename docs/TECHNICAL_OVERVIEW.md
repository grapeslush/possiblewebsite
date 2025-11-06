# Tackle Exchange Technical Overview

This document summarizes the architecture that powers Tackle Exchange, the escrow-driven marketplace for used fishing
tackle.

## Platform architecture

- **Framework:** Next.js 14 with the App Router for both customer web and API workspaces.
- **Language:** TypeScript end-to-end with strict mode enabled.
- **UI:** Tailwind CSS + shadcn/ui components themed to the Tackle Exchange brand.
- **Data layer:** PostgreSQL via Prisma ORM housed in `packages/db` and shared migrations.
- **Messaging & cache:** Redis brokers chat presence, notification fan-out, and background jobs.
- **Object storage:** MinIO/S3 compatible buckets for listing media, inspection videos, and receipts.

## Apps

### `apps/web`

- Marketing hero, testimonials, and CTA flows tailored to escrow-backed tackle trading.
- Onboarding, listing creation, offer negotiation, dashboards, and help center experiences.
- Uses server actions for secure mutations and React Server Components for dynamic content.
- Integrates with hCaptcha, AI vision tagging, and analytics instrumentation.

### `apps/api`

- Hosts REST endpoints that power authentication, escrow status updates, payouts, and notifications.
- Exposes metrics, health, and OpenTelemetry traces for observability.
- Shares auth/session utilities with the web workspace to keep workflows consistent.

## Shared packages

- **`packages/db`:** Prisma schema, seeding utilities, test factories, and TOTPs used for admin MFA.
- **`packages/config`:** ESLint, Tailwind, Jest, and TS configs consumed across the monorepo.
- **`packages/ui`:** Base component primitives that align styling between workspaces.

## Infrastructure highlights

- Docker Compose stack for local parity (web, API, Postgres, Redis, MailHog, MinIO).
- Terraform skeleton under `infra/terraform` for AWS deployment (VPC, networking, placeholders for managed services).
- GitHub Actions pipeline covers lint, unit, integration, Playwright, Lighthouse CI, dependency audit, and k6 smoke tests.

## Extending the platform

- Add new marketplace capabilities by introducing app routes in `apps/web/app` and mirroring API handlers in
  `apps/api/app/api`.
- Extend domain models by editing Prisma schema files and regenerating types with `pnpm --filter @possiblewebsite/db run prisma:generate`.
- Customize branding or themes via Tailwind tokens in `apps/web/tailwind.config.ts` and shared CSS variables.

Tackle Exchange is intentionally modular so teams can remix escrow-driven commerce scenarios without rebuilding the
foundation.
