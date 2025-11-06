# Seed data instructions

The repository ships with a Prisma seed script that generates demo users, listings, and supporting entities. Follow these steps to run it locally:

1. Ensure PostgreSQL is running and update your `.env` or shell with a valid `DATABASE_URL` (for example `postgresql://possible:possible@localhost:5432/possible`).
2. Install dependencies with `pnpm install`.
3. Apply the latest migrations:

   ```bash
   pnpm --filter @possiblewebsite/db run prisma:migrate
   ```

4. Execute the seed script:

   ```bash
   pnpm --filter @possiblewebsite/db run prisma:seed
   ```

The seed populates:

- Example buyers and sellers with verified identities
- Listings, images, and inventory levels
- Offers, orders, payouts, and moderation events for observability testing

Seed data is idempotent—running the script multiple times updates existing records instead of duplicating them.
