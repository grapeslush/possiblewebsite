# syntax=docker/dockerfile:1.4

FROM node:18-bullseye AS base
WORKDIR /app
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages ./packages
RUN pnpm install --frozen-lockfile
RUN pnpm --filter db prisma:generate

FROM deps AS builder
COPY . .
RUN pnpm -r build

FROM node:18-bullseye AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/apps ./apps
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY docker/bootstrap.sh ./docker/bootstrap.sh
COPY server.js ./server.js

RUN chmod +x ./docker/bootstrap.sh

EXPOSE 3000 4000

CMD ["./docker/bootstrap.sh"]
