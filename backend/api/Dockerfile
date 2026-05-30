# ── Stage 1: Install & build ──────────────────────────────────────────────────
FROM node:22-alpine AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Copy workspace manifests first for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY backend/api/package.json              backend/api/package.json
COPY backend/packages/db/package.json      backend/packages/db/package.json
COPY backend/packages/api-zod/package.json backend/packages/api-zod/package.json

RUN pnpm install --frozen-lockfile

# Copy sources
COPY backend/ backend/

RUN cd backend/api && pnpm run build

# ── Stage 2: Production runtime ───────────────────────────────────────────────
FROM node:22-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Copy manifests for prod dep install
COPY --from=builder /app/package.json              ./package.json
COPY --from=builder /app/pnpm-lock.yaml            ./pnpm-lock.yaml
COPY --from=builder /app/pnpm-workspace.yaml       ./pnpm-workspace.yaml
COPY --from=builder /app/.npmrc                    ./.npmrc
COPY --from=builder /app/backend/api/package.json              backend/api/package.json
COPY --from=builder /app/backend/packages/db/package.json      backend/packages/db/package.json
COPY --from=builder /app/backend/packages/api-zod/package.json backend/packages/api-zod/package.json

# Install production dependencies only (covers externalized @azure/* etc.)
RUN pnpm install --frozen-lockfile --prod

# Copy built output
COPY --from=builder /app/backend/api/dist ./backend/api/dist

# Local file upload fallback directory
RUN mkdir -p /app/backend/api/uploads

WORKDIR /app/backend/api

EXPOSE 4000
EXPOSE 4001

CMD ["node", "dist/index.mjs"]
