# ── Stage 1: Build Vite app ───────────────────────────────────────────────────
FROM node:22-alpine AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Copy workspace manifests for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY frontend/website/package.json           frontend/website/package.json
COPY frontend/packages/api-client-react/package.json \
     frontend/packages/api-client-react/package.json

RUN pnpm install --frozen-lockfile

# Copy sources
COPY frontend/website/         frontend/website/
COPY frontend/packages/        frontend/packages/

# VITE_API_URL can be overridden at build time via --build-arg
ARG VITE_API_URL=http://localhost:4000
ENV VITE_API_URL=${VITE_API_URL}

RUN cd frontend/website && pnpm run build

# ── Stage 2: Serve with nginx ─────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# Copy the Vite build output
COPY --from=builder /app/frontend/website/dist /usr/share/nginx/html

# nginx config: serve index.html for all routes (SPA fallback)
RUN printf 'server {\n\
    listen 80;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
    gzip on;\n\
    gzip_types text/plain text/css application/javascript application/json;\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
