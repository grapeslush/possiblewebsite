# Possible Website Monorepo

This repository is a pnpm workspace that powers both the customer-facing web experience and the API surface for Possible Website. It uses Next.js 14 with the App Router, TypeScript, Tailwind CSS, and shadcn/ui.

## Structure

- `apps/web` – Marketing/front-end application with Tailwind CSS and shadcn/ui components.
- `apps/api` – API-focused Next.js application exposing typed route handlers.
- `packages/config` – Shared ESLint, Prettier, and TypeScript configuration consumed across the workspace.
- `packages/db` – Placeholder for data access utilities.
- `packages/ui` – Placeholder for shared UI components.

## Getting started

```bash
pnpm install
pnpm dev:web
```

Run linting and tests across all workspaces:

```bash
pnpm lint
pnpm test
```

Husky hooks enforce formatting (via lint-staged) and commit message conventions (via commitlint). A GitHub Actions workflow runs linting and tests for every push and pull request to `main`.
