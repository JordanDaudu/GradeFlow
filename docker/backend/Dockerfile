FROM node:22-slim AS builder

WORKDIR /workspace

RUN npm install -g pnpm@9

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc tsconfig.json tsconfig.base.json ./

COPY backend/package.json backend/
COPY lib/api-spec/package.json lib/api-spec/
COPY lib/api-client-react/package.json lib/api-client-react/
COPY lib/api-zod/package.json lib/api-zod/
COPY frontend/package.json frontend/
COPY scripts/package.json scripts/
COPY artifacts/mockup-sandbox/package.json artifacts/mockup-sandbox/

RUN pnpm install --frozen-lockfile

COPY backend/ backend/
COPY lib/ lib/

RUN pnpm --filter @workspace/api-server run prisma:generate
RUN pnpm --filter @workspace/api-server run build

FROM node:22-slim AS runner

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

RUN npm install -g pnpm@9

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./

COPY backend/package.json backend/
COPY lib/api-spec/package.json lib/api-spec/
COPY lib/api-client-react/package.json lib/api-client-react/
COPY lib/api-zod/package.json lib/api-zod/
COPY frontend/package.json frontend/
COPY scripts/package.json scripts/
COPY artifacts/mockup-sandbox/package.json artifacts/mockup-sandbox/

COPY backend/prisma backend/prisma
COPY backend/tsconfig.json backend/tsconfig.json

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @workspace/api-server run prisma:generate

COPY --from=builder /workspace/backend/dist backend/dist

COPY docker/backend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

WORKDIR /workspace/backend

CMD ["/entrypoint.sh"]
