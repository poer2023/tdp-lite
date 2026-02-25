FROM node:20-alpine AS deps
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app/publisher

COPY publisher/package.json publisher/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:20-alpine AS builder
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app/publisher

COPY --from=deps /app/publisher/node_modules ./node_modules
COPY publisher ./
RUN pnpm build

FROM node:20-alpine AS runner
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3100
RUN corepack enable
WORKDIR /app/publisher

COPY --from=builder /app/publisher/package.json ./package.json
COPY --from=builder /app/publisher/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/publisher/next.config.ts ./next.config.ts
COPY --from=builder /app/publisher/.next ./.next
COPY --from=builder /app/publisher/node_modules ./node_modules

EXPOSE 3100
CMD ["pnpm", "start"]
