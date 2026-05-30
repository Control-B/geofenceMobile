# Expo development server container
# Runs the Metro bundler so physical devices / Expo Go can connect over LAN.
# For production builds use EAS Build (cloud) — not this container.
FROM node:22-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Expo / React Native tooling
RUN apk add --no-cache git

WORKDIR /app

# Copy workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY frontend/mobile/app/package.json          frontend/mobile/app/package.json
COPY frontend/packages/api-client-react/package.json \
     frontend/packages/api-client-react/package.json

RUN pnpm install --frozen-lockfile

# Copy sources
COPY frontend/mobile/app/    frontend/mobile/app/
COPY frontend/packages/      frontend/packages/

WORKDIR /app/frontend/mobile/app

# Metro bundler & Expo CLI ports
EXPOSE 8081
EXPOSE 19000
EXPOSE 19001

# EXPO_PUBLIC_API_URL points to the backend container
ENV EXPO_PUBLIC_API_URL=http://localhost:4000

CMD ["npx", "expo", "start", "--host", "lan", "--port", "8081"]
