FROM node:20-alpine

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml tsconfig.json ./
RUN pnpm install --frozen-lockfile

COPY scripts ./scripts
COPY src ./src

ENTRYPOINT ["pnpm", "sync:loop"]
