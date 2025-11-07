# Seed data instructions

The Prisma seed script now loads a fully curated tackle marketplace that mirrors our escrow and compliance flows. Run it whenever you refresh the database or need to demo the end-to-end experience.

## Prerequisites

1. Ensure PostgreSQL is running and export a valid `DATABASE_URL` (for example `postgresql://possible:possible@localhost:5432/possible`).
2. Install dependencies with `pnpm install` from the repository root.
3. Apply migrations:

   ```bash
   pnpm --filter @possiblewebsite/db run prisma:migrate
   ```

4. Seed the catalog, policies, and relational data:

   ```bash
   pnpm --filter @possiblewebsite/db run prisma:seed
   ```

The script ingests curated fixtures from `apps/web/public/seed-images/` and `docs/help/` and creates:

- 200+ listings across rods, reels, lures, combos, electronics, apparel, storage, and boat accessories.
- Verified buyers, sellers with Stripe Connect IDs, admins, and support staff—each with policy acceptances and address records.
- Offers covering every status, carts, escrow-backed orders, payouts, shipments with tracking metadata, reviews, disputes, and support threads.
- Help-center articles that reference the compliance policies used during seeding.

Each user account (admin, support, every buyer and seller) shares the demo password **`demoPass123!`** so QA can exercise onboarding and role-based dashboards immediately after running the seed.

> **Tip:** The seed is idempotent. Rerunning it wipes existing demo data and reloads the curated fixtures, keeping provenance notes, AI audit strings, and policy versions consistent for regression testing.
