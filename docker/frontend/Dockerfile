FROM node:22-slim AS builder

WORKDIR /workspace

RUN npm install -g pnpm@11.0.4

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc tsconfig.base.json ./

COPY frontend/package.json frontend/
COPY lib/api-spec/package.json lib/api-spec/
COPY lib/api-client-react/package.json lib/api-client-react/
COPY lib/api-zod/package.json lib/api-zod/
COPY backend/package.json backend/
COPY scripts/package.json scripts/

RUN pnpm install --frozen-lockfile

COPY frontend/ frontend/
COPY lib/ lib/

RUN pnpm --filter @workspace/gradeflow run build

FROM nginx:1.27-alpine AS runner

COPY docker/frontend/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /workspace/frontend/dist/public /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
