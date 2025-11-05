# @possiblewebsite/db

This package contains the Prisma schema, client, and database helpers that power the marketplace domain (users, listings, offers, orders, disputes, etc.).

## Environment variables

Create a `.env` file in the project root or export the variables in your shell before running Prisma commands.

| Variable | Description | Example |
| --- | --- | --- |
| `DATABASE_URL` | Connection string used by Prisma. Point this to your local Postgres instance when developing. | `postgresql://postgres:postgres@localhost:5432/possiblewebsite?schema=public` |
| `CI_DATABASE_URL` | Optional convenience variable for CI pipelines. You can export it and then set `DATABASE_URL=$CI_DATABASE_URL` when running migrations inside containers where Postgres is reachable via its service name. | `postgresql://postgres:postgres@postgres:5432/possiblewebsite?schema=public` |

For local development with the provided Docker Compose setup, the default credentials (`postgres` / `postgres`) work out of the box. In CI, ensure the host component of the URL matches the service name (typically `postgres`).

## Commands

```bash
pnpm --filter @possiblewebsite/db prisma:generate   # Generate the Prisma client
pnpm --filter @possiblewebsite/db prisma:migrate    # Apply the SQL migrations
pnpm --filter @possiblewebsite/db prisma:seed       # Populate the database with demo data
pnpm --filter @possiblewebsite/db test              # Run unit tests for repositories/services
```

## Seeding

`prisma/seed.ts` resets the database and inserts:

- Admin and support staff users
- Multiple sellers and buyers with addresses
- Listings (with images) and offers
- Orders complete with timeline events, payments, shipments, and notifications
- Disputes containing internal and external messages

This provides rich relational data for local development and QA environments.
